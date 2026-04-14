import notifee, {
  AndroidImportance,
  AndroidNotificationSetting,
  TimestampTrigger,
  TriggerType,
  EventType,
} from '@notifee/react-native';
import {Platform, Alert, Linking} from 'react-native';
import {Plant, getPlants, updatePlant, getSettings, applyNotificationTime, getTimeForDay} from './storage';

const CHANNEL_ID = 'plant-reminders';

export async function setupNotificationChannel(): Promise<void> {
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Plant Reminders',
    importance: AndroidImportance.HIGH,
    sound: 'default',
  });
}

export async function requestPermissions(): Promise<void> {
  await notifee.requestPermission();
}

export async function scheduleNotification(plant: Plant): Promise<string> {
  await setupNotificationChannel();

  // Compute fire time first so we can use it for the idempotency check.
  const settings = await getSettings();
  const dayOfWeek = new Date(plant.nextReminder).getDay();
  const {hour, minute} = getTimeForDay(settings, dayOfWeek);
  const fireAt = applyNotificationTime(plant.nextReminder, hour, minute);

  // If the computed time is already in the past, fire 10 seconds from now
  const safeFireAt = fireAt > Date.now() ? fireAt : Date.now() + 10_000;

  // Use notifee's own trigger list as the source of truth — it is shared
  // across all JS contexts (main app and headless tasks), unlike in-memory flags.
  const allTriggers = await notifee.getTriggerNotifications();
  const forThisPlant = allTriggers.filter(
    n => n.notification.data?.plantId === plant.id,
  );

  // Already scheduled at the exact right time → return as-is (idempotent).
  // Two concurrent callers will both find the same entry once the first one
  // has created it, preventing duplicate creation.
  const match = forThisPlant.find(
    n => (n.trigger as TimestampTrigger).timestamp === safeFireAt,
  );
  if (match?.notification?.id) {
    return match.notification.id;
  }

  // Cancel ALL existing triggers for this plant (clears orphans from old bugs
  // where concurrent calls left stale notifications behind).
  for (const n of forThisPlant) {
    if (n.notification.id) {
      try { await notifee.cancelNotification(n.notification.id); } catch {}
    }
  }
  // Belt-and-suspenders: also cancel by the stored ID in case it isn't in the
  // trigger list yet (e.g. created milliseconds ago by a concurrent caller).
  if (plant.notificationId) {
    try { await notifee.cancelNotification(plant.notificationId); } catch {}
  }

  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: safeFireAt,
    alarmManager: {
      allowWhileIdle: true,
    },
  };

  return notifee.createTriggerNotification(
    {
      title: 'Time to water!',
      body: `Your plant "${plant.name}" needs watering today.`,
      data: {plantId: plant.id},
      android: {
        channelId: CHANNEL_ID,
        importance: AndroidImportance.HIGH,
        smallIcon: 'ic_notification',
        pressAction: {id: 'default'},
      },
      ios: {
        sound: 'default',
      },
    },
    trigger,
  );
}

export async function cancelNotification(
  notificationId: string,
): Promise<void> {
  try {
    await notifee.cancelNotification(notificationId);
  } catch {}
}

/**
 * Fire a test notification immediately (no trigger — displays right now).
 */
export async function sendTestNotificationNow(): Promise<void> {
  await setupNotificationChannel();
  await notifee.displayNotification({
    title: 'Test notification',
    body: 'Plantly notifications are working!',
    android: {
      channelId: CHANNEL_ID,
      importance: AndroidImportance.HIGH,
      smallIcon: 'ic_notification',
      pressAction: {id: 'default'},
    },
    ios: {
      sound: 'default',
    },
  });
}

/**
 * Schedule a test notification at a specific timestamp.
 */
export async function sendTestNotificationAt(
  timestamp: number,
): Promise<string> {
  await setupNotificationChannel();

  const safeTs = timestamp > Date.now() ? timestamp : Date.now() + 5_000;

  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: safeTs,
    alarmManager: {
      allowWhileIdle: true,
    },
  };

  const id = await notifee.createTriggerNotification(
    {
      title: 'Test notification',
      body: 'Plantly scheduled test notification.',
      android: {
        channelId: CHANNEL_ID,
        importance: AndroidImportance.HIGH,
        smallIcon: 'ic_notification',
        pressAction: {id: 'default'},
      },
      ios: {
        sound: 'default',
      },
    },
    trigger,
  );

  return id;
}

export function onNotificationPress(
  handler: (plantId: string) => void,
): () => void {
  return notifee.onForegroundEvent(({type, detail}) => {
    if (type === EventType.PRESS && detail.notification?.data?.plantId) {
      handler(detail.notification.data.plantId as string);
    }
  });
}

/**
 * Reschedule notifications for all plants. Called after device reboot (via
 * the headless task) and on app startup to recover from missed reschedulings.
 *
 * Plants are processed sequentially (not in parallel) so that concurrent calls
 * from different JS contexts (main app vs headless task) cannot race on the
 * same plant and create orphaned duplicate notifications. The idempotency
 * check inside scheduleNotification() handles the case where two contexts
 * reach this function at the same time.
 */
export async function rescheduleAllNotifications(): Promise<void> {
  const [plants, settings] = await Promise.all([getPlants(), getSettings()]);
  for (const plant of plants) {
    if (!plant.nextReminder) {
      continue;
    }

    // Compute the actual fire timestamp for this plant's reminder.
    const dayOfWeek = new Date(plant.nextReminder).getDay();
    const {hour, minute} = getTimeForDay(settings, dayOfWeek);
    const fireAt = applyNotificationTime(plant.nextReminder, hour, minute);
    const isOverdue = fireAt <= Date.now();

    // If the reminder time has already passed and we already sent a
    // notification for this exact reminder period, do not fire again.
    // The next notification will only come after the user marks the plant
    // as watered (which sets a new nextReminder).
    if (isOverdue && plant.notifiedForReminder === plant.nextReminder) {
      continue;
    }

    const id = await scheduleNotification(plant);

    // For overdue/immediate fires, record that we've notified for this
    // reminder period so subsequent reschedule calls are no-ops.
    await updatePlant({
      ...plant,
      notificationId: id,
      ...(isOverdue ? {notifiedForReminder: plant.nextReminder} : {}),
    });
  }
}

/**
 * On Android 12+ (API 31+) exact alarms require explicit user approval.
 * Check the permission and open the system settings page if it isn't granted.
 */
export async function ensureExactAlarmPermission(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }
  const settings = await notifee.getNotificationSettings();
  if (settings.android.alarm === AndroidNotificationSetting.DISABLED) {
    Alert.alert(
      'Alarm permission needed',
      'To receive plant watering reminders at the right time, please enable "Alarms & Reminders" for this app in Settings.',
      [
        {text: 'Open Settings', onPress: () => Linking.openSettings()},
        {text: 'Later', style: 'cancel'},
      ],
    );
  }
}

/**
 * On Android, ask the OS to exempt the app from battery optimisation so that
 * scheduled alarms can fire even when the phone is idle or in Doze mode.
 * Also opens the OEM-specific power manager if the device has one
 * (Samsung, Xiaomi, Huawei, etc.).
 */
export async function requestBatteryOptimizationExemption(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }
  try {
    // Standard Android: check if battery optimisation is restricting the app
    const batteryOptimizationEnabled =
      await notifee.isBatteryOptimizationEnabled();
    if (batteryOptimizationEnabled) {
      Alert.alert(
        'Battery optimisation',
        'To ensure you always receive plant watering reminders, please disable battery optimisation for this app.',
        [
          {
            text: 'Open settings',
            onPress: () => notifee.openBatteryOptimizationSettings(),
          },
          {text: 'Later', style: 'cancel'},
        ],
      );
    }

    // OEM power-manager (Samsung, Xiaomi, OPPO, …) — additional step on those devices
    const powerInfo = await notifee.getPowerManagerInfo();
    if (powerInfo.activity) {
      Alert.alert(
        'Power manager detected',
        'Your device has an extra power manager. To guarantee reminders arrive, please whitelist this app.',
        [
          {
            text: 'Open settings',
            onPress: () => notifee.openPowerManagerSettings(),
          },
          {text: 'Later', style: 'cancel'},
        ],
      );
    }
  } catch {
    // Silently ignore — not all devices expose this API
  }
}

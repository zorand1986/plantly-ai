import notifee, {
  AndroidImportance,
  TimestampTrigger,
  TriggerType,
  EventType,
} from '@notifee/react-native';
import {Plant, getSettings, applyNotificationTime} from './storage';

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

  // Cancel existing if any
  if (plant.notificationId) {
    try {
      await notifee.cancelNotification(plant.notificationId);
    } catch {}
  }

  // Apply the configured notification time to the reminder date
  const settings = await getSettings();
  const fireAt = applyNotificationTime(
    plant.nextReminder,
    settings.notificationHour,
    settings.notificationMinute,
  );

  // If the computed time is already in the past, fire 10 seconds from now
  const safeFireAt = fireAt > Date.now() ? fireAt : Date.now() + 10_000;

  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: safeFireAt,
  };

  const id = await notifee.createTriggerNotification(
    {
      title: 'Time to water!',
      body: `Your plant "${plant.name}" needs watering today.`,
      data: {plantId: plant.id},
      android: {
        channelId: CHANNEL_ID,
        importance: AndroidImportance.HIGH,
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
  };

  const id = await notifee.createTriggerNotification(
    {
      title: 'Test notification',
      body: 'Plantly scheduled test notification.',
      android: {
        channelId: CHANNEL_ID,
        importance: AndroidImportance.HIGH,
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

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import {
  Plant,
  getPlants,
  updatePlant,
  getSettings,
  applyNotificationTime,
  getTimeForDay,
} from './storage';

const CHANNEL_ID = 'plant-reminders';

// Show notifications when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function setupNotificationChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Plant Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
  }
}

export async function requestPermissions(): Promise<void> {
  await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });
}

export async function scheduleNotification(plant: Plant): Promise<string> {
  // Cancel existing if any
  if (plant.notificationId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(plant.notificationId);
    } catch {}
  }

  // Apply per-day-of-week time override, falling back to the default time
  const settings = await getSettings();
  const dayOfWeek = new Date(plant.nextReminder).getDay();
  const { hour, minute } = getTimeForDay(settings, dayOfWeek);
  const fireAt = applyNotificationTime(plant.nextReminder, hour, minute);
  const safeFireAt = fireAt > Date.now() ? fireAt : Date.now() + 10_000;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Time to water!',
      body: `Your plant "${plant.name}" needs watering today.`,
      data: { plantId: plant.id },
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(safeFireAt),
      channelId: CHANNEL_ID,
    },
  });

  return id;
}

export async function cancelNotification(notificationId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {}
}

/**
 * Fire a test notification immediately.
 */
export async function sendTestNotificationNow(): Promise<void> {
  await setupNotificationChannel();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Test notification',
      body: 'Thryveo notifications are working!',
      sound: 'default',
    },
    trigger: null,
  });
}

/**
 * Schedule a test notification at a specific timestamp.
 */
export async function sendTestNotificationAt(timestamp: number): Promise<string> {
  await setupNotificationChannel();
  const safeTs = timestamp > Date.now() ? timestamp : Date.now() + 5_000;
  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Test notification',
      body: 'Thryveo scheduled test notification.',
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(safeTs),
      channelId: CHANNEL_ID,
    },
  });
}

/**
 * Re-verify that all plants have a scheduled notification. expo-notifications
 * handles post-reboot rescheduling natively, but this catches edge cases such
 * as app reinstalls or notification IDs going stale.
 */
let _rescheduling = false;

export async function rescheduleAllNotifications(): Promise<void> {
  if (_rescheduling) {
    return;
  }
  _rescheduling = true;
  try {
    const plants = await getPlants();
    await Promise.all(
      plants.map(async plant => {
        if (!plant.nextReminder) {
          return;
        }
        const id = await scheduleNotification(plant);
        await updatePlant({ ...plant, notificationId: id });
      }),
    );
  } finally {
    _rescheduling = false;
  }
}

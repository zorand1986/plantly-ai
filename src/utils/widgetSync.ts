import {NativeModules, Platform} from 'react-native';
import {getPlants, updatePlant, computeNextReminder} from './storage';
import {scheduleNotification} from './notifications';

const {WidgetData} = NativeModules;

/**
 * Pushes today's due plants (nextReminder <= end of today, or overdue)
 * to the Android widget via the native WidgetData module.
 * No-op on iOS or when the module isn't available.
 */
export async function syncWidget(): Promise<void> {
  if (Platform.OS !== 'android' || !WidgetData) {
    return;
  }
  const plants = await getPlants();
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const duePlants = plants
    .filter(p => p.nextReminder <= endOfToday.getTime())
    .sort((a, b) => a.nextReminder - b.nextReminder)
    .map(p => ({id: p.id, name: p.name, nextReminder: p.nextReminder}));

  await WidgetData.syncWidget(JSON.stringify(duePlants));
}

/**
 * Tells the widget to show/hide the "force update required" blocked state.
 * Pass true when an update is required, false to restore normal widget.
 */
export async function setWidgetForceUpdate(required: boolean): Promise<void> {
  if (Platform.OS !== 'android' || !WidgetData) {
    return;
  }
  await WidgetData.setForceUpdateRequired(required);
}

/**
 * Reads any waterings recorded by the widget while the app was closed,
 * applies them (updates storage + reschedules notifications), then re-syncs.
 */
export async function processPendingWaterings(): Promise<void> {
  if (Platform.OS !== 'android' || !WidgetData) {
    return;
  }
  const json: string = await WidgetData.getPendingWaterings();
  const pending: Array<{plantId: string; timestamp: number}> = JSON.parse(
    json || '[]',
  );
  if (pending.length === 0) {
    return;
  }

  const plants = await getPlants();
  for (const {plantId, timestamp} of pending) {
    const plant = plants.find(p => p.id === plantId);
    if (!plant) {
      continue;
    }
    const newNextReminder = computeNextReminder(timestamp, plant.intervalDays);
    const wateringHistory = [...(plant.wateringHistory || []), timestamp];
    const updated = {
      ...plant,
      lastWatered: timestamp,
      nextReminder: newNextReminder,
      wateringHistory,
    };
    const notifId = await scheduleNotification(updated);
    updated.notificationId = notifId;
    await updatePlant(updated);
  }

  // Re-sync widget with fresh data after applying pending waterings
  await syncWidget();
}

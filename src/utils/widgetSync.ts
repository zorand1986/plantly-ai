import {NativeModules, Platform} from 'react-native';
import {getPlants, updatePlant, computeNextReminder} from './storage';
import {scheduleNotification} from './notifications';

const {WidgetData} = NativeModules;

/**
 * Pushes the full plant list to the Android widget via the native WidgetData
 * module. The widget itself filters by "due today" at render time, so the list
 * stays correct across the midnight rollover without needing JS to refire.
 * No-op on iOS or when the module isn't available.
 */
export async function syncWidget(): Promise<void> {
  if (Platform.OS !== 'android' || !WidgetData) {
    return;
  }
  const plants = await getPlants();
  const payload = plants
    .sort((a, b) => a.nextReminder - b.nextReminder)
    .map(p => ({
      id: p.id,
      name: p.name,
      nextReminder: p.nextReminder,
      notificationId: p.notificationId ?? '',
    }));

  await WidgetData.syncWidget(JSON.stringify(payload));
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
      notifiedForReminder: undefined,
    };
    await updatePlant(updated);
    try {
      const notifId = await scheduleNotification(updated);
      await updatePlant({
        ...updated,
        notificationId: notifId,
        notifiedForReminder: newNextReminder,
      });
    } catch {}
  }

  // Re-sync widget with fresh data after applying pending waterings
  await syncWidget();
}

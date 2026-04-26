import AsyncStorage from '@react-native-async-storage/async-storage';

const PLANTS_KEY = '@plants';
const SETTINGS_KEY = '@settings';

export interface DayTimeOverride {
  hour: number;
  minute: number;
}

export interface AppSettings {
  /** Hour of day (0-23) at which notifications fire, default 9 */
  notificationHour: number;
  /** Minute (0-59), default 0 */
  notificationMinute: number;
  /**
   * Per-day overrides. Index 0=Sun, 1=Mon, …, 6=Sat.
   * null means use the default notificationHour/notificationMinute.
   */
  dayOverrides: (DayTimeOverride | null)[];
  /** Automatically back up data once per day on first app open */
  autoBackup: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  notificationHour: 9,
  notificationMinute: 0,
  dayOverrides: [null, null, null, null, null, null, null],
  autoBackup: false,
};

export async function getSettings(): Promise<AppSettings> {
  try {
    const json = await AsyncStorage.getItem(SETTINGS_KEY);
    return json ? {...DEFAULT_SETTINGS, ...JSON.parse(json)} : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

/**
 * Given a date timestamp, return a new timestamp set to the configured
 * notification time (hour:minute) on the same calendar day.
 */
export function applyNotificationTime(
  dateTs: number,
  hour: number,
  minute: number,
): number {
  const d = new Date(dateTs);
  d.setHours(hour, minute, 0, 0);
  return d.getTime();
}

/**
 * Returns the hour/minute to use for a notification firing on a given day.
 * @param dayOfWeek 0=Sun, 1=Mon, …, 6=Sat (as returned by Date.getDay())
 */
export function getTimeForDay(
  settings: AppSettings,
  dayOfWeek: number,
): {hour: number; minute: number} {
  const override = settings.dayOverrides?.[dayOfWeek];
  if (override) {
    return {hour: override.hour, minute: override.minute};
  }
  return {hour: settings.notificationHour, minute: settings.notificationMinute};
}

export interface Plant {
  id: string;
  name: string;
  photoUri?: string;
  intervalDays: number;
  lastWatered: number; // timestamp ms
  nextReminder: number; // timestamp ms
  notificationId?: string;
  /** The nextReminder timestamp for which we last fired a notification.
   *  Used to prevent duplicate notifications for the same reminder period. */
  notifiedForReminder?: number;
  wateringHistory: number[]; // array of timestamps when plant was watered
  /** When the plant was first added. Used to determine seniority when enforcing
   *  free-plan limits. Optional for backward compatibility with existing plants. */
  createdAt?: number;
}

export async function getPlants(): Promise<Plant[]> {
  try {
    const json = await AsyncStorage.getItem(PLANTS_KEY);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
}

export async function savePlants(plants: Plant[]): Promise<void> {
  await AsyncStorage.setItem(PLANTS_KEY, JSON.stringify(plants));
}

export async function addPlant(plant: Plant): Promise<void> {
  const plants = await getPlants();
  // Initialize wateringHistory if not present
  const plantWithHistory = {
    ...plant,
    createdAt: plant.createdAt ?? Date.now(),
    wateringHistory: plant.wateringHistory || [],
  };
  plants.push(plantWithHistory);
  await savePlants(plants);
}

export async function updatePlant(updated: Plant): Promise<void> {
  const plants = await getPlants();
  const idx = plants.findIndex(p => p.id === updated.id);
  if (idx !== -1) {
    plants[idx] = updated;
    await savePlants(plants);
  }
}

export async function exportAllData(): Promise<{json: string; filename: string}> {
  const [plants, settings] = await Promise.all([getPlants(), getSettings()]);
  const json = JSON.stringify({version: 1, plants, settings}, null, 2);
  const filename = `thryveo-backup-${new Date().toISOString().slice(0, 10)}.json`;
  return {json, filename};
}

export async function importAllData(json: string): Promise<void> {
  const parsed = JSON.parse(json);
  if (!parsed.plants || !Array.isArray(parsed.plants)) {
    throw new Error('Invalid backup file.');
  }
  await AsyncStorage.setItem(PLANTS_KEY, JSON.stringify(parsed.plants));
  if (parsed.settings) {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(parsed.settings));
  }
}

export async function deletePlant(id: string): Promise<void> {
  const plants = await getPlants();
  await savePlants(plants.filter(p => p.id !== id));
}

export function computeNextReminder(
  lastWatered: number,
  intervalDays: number,
): number {
  return lastWatered + intervalDays * 24 * 60 * 60 * 1000;
}

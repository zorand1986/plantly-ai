import AsyncStorage from '@react-native-async-storage/async-storage';

const PLANTS_KEY = '@plants';
const SETTINGS_KEY = '@settings';

export interface AppSettings {
  /** Hour of day (0-23) at which notifications fire, default 9 */
  notificationHour: number;
  /** Minute (0-59), default 0 */
  notificationMinute: number;
}

const DEFAULT_SETTINGS: AppSettings = {
  notificationHour: 9,
  notificationMinute: 0,
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

export interface Plant {
  id: string;
  name: string;
  photoUri?: string;
  intervalDays: number;
  lastWatered: number; // timestamp ms
  nextReminder: number; // timestamp ms
  notificationId?: string;
  wateringHistory: number[]; // array of timestamps when plant was watered
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

import {Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  writeFile,
  DocumentDirectoryPath,
  ExternalDirectoryPath,
  readDir,
  unlink,
} from 'react-native-fs';
import {exportAllData, getSettings} from './storage';

const LAST_BACKUP_DATE_KEY = '@lastAutoBackupDate';
const BACKUP_DIR =
  Platform.OS === 'ios' ? DocumentDirectoryPath : ExternalDirectoryPath;
const MAX_BACKUPS = 7;

async function pruneOldBackups(): Promise<void> {
  try {
    const files = await readDir(BACKUP_DIR);
    const backups = files
      .filter(f => f.name.startsWith('thryveo-backup-') && f.name.endsWith('.json'))
      .sort((a, b) => a.name.localeCompare(b.name)); // oldest first

    if (backups.length > MAX_BACKUPS) {
      const toDelete = backups.slice(0, backups.length - MAX_BACKUPS);
      await Promise.all(toDelete.map(f => unlink(f.path)));
    }
  } catch {
    // non-fatal
  }
}

export async function runAutoBackupIfNeeded(): Promise<void> {
  const settings = await getSettings();
  if (!settings.autoBackup) {return;}

  const today = new Date().toISOString().slice(0, 10);
  const lastDate = await AsyncStorage.getItem(LAST_BACKUP_DATE_KEY);
  if (lastDate === today) {return;}

  const {json, filename} = await exportAllData();
  await writeFile(`${BACKUP_DIR}/${filename}`, json, 'utf8');
  await AsyncStorage.setItem(LAST_BACKUP_DATE_KEY, today);
  await pruneOldBackups();
}

export async function getLastAutoBackupDate(): Promise<string | null> {
  return AsyncStorage.getItem(LAST_BACKUP_DATE_KEY);
}

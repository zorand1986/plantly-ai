import React, {useCallback, useEffect, useRef, useState} from 'react';
import {version as appVersion} from '../../package.json';
import {
  Alert,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {writeFile, CachesDirectoryPath} from 'react-native-fs';
import {NativeModules, Platform, Share, Switch} from 'react-native';
import {getLastAutoBackupDate} from '../utils/autoBackup';

const {FilePicker} = NativeModules;
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {
  AppSettings,
  DayTimeOverride,
  getSettings,
  saveSettings,
  getPlants,
  updatePlant,
  applyNotificationTime,
  exportAllData,
  importAllData,
} from '../utils/storage';
import {
  scheduleNotification,
  sendTestNotificationNow,
  sendTestNotificationAt,
} from '../utils/notifications';

// ── helpers ──────────────────────────────────────────────────────────────────

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function formatTime(hour: number, minute: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}:${pad(minute)} ${period}`;
}

function NumberPicker({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <View style={pickerStyles.wrapper}>
      <Text style={pickerStyles.label}>{label}</Text>
      <View style={pickerStyles.row}>
        <TouchableOpacity
          style={pickerStyles.btn}
          onPress={() => onChange(value <= min ? max : value - 1)}
          activeOpacity={0.7}>
          <Text style={pickerStyles.btnText}>−</Text>
        </TouchableOpacity>
        <Text style={pickerStyles.value}>{pad(value)}</Text>
        <TouchableOpacity
          style={pickerStyles.btn}
          onPress={() => onChange(value >= max ? min : value + 1)}
          activeOpacity={0.7}>
          <Text style={pickerStyles.btnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const pickerStyles = StyleSheet.create({
  wrapper: {alignItems: 'center', flex: 1},
  label: {
    fontSize: 11,
    color: '#999999',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  row: {flexDirection: 'row', alignItems: 'center', gap: 12},
  btn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnText: {fontSize: 22, color: '#111111', fontWeight: '500', lineHeight: 26},
  value: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111111',
    minWidth: 44,
    textAlign: 'center',
  },
});

// ── per-day schedule ─────────────────────────────────────────────────────────

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

function DayRow({
  day,
  override,
  defaultHour,
  defaultMinute,
  onChange,
}: {
  day: number;
  override: DayTimeOverride | null;
  defaultHour: number;
  defaultMinute: number;
  onChange: (v: DayTimeOverride | null) => void;
}) {
  const isCustom = override !== null;
  return (
    <View style={dayRowStyles.container}>
      <View style={dayRowStyles.row}>
        <Text style={dayRowStyles.dayName}>{DAY_NAMES[day]}</Text>
        {!isCustom && (
          <Text style={dayRowStyles.defaultTime}>
            {formatTime(defaultHour, defaultMinute)}
          </Text>
        )}
        {isCustom && (
          <Text style={dayRowStyles.customTime}>
            {formatTime(override.hour, override.minute)}
          </Text>
        )}
        <TouchableOpacity
          onPress={() =>
            onChange(
              isCustom ? null : {hour: defaultHour, minute: defaultMinute},
            )
          }
          style={[dayRowStyles.toggle, isCustom && dayRowStyles.toggleActive]}
          activeOpacity={0.7}>
          <Text
            style={[
              dayRowStyles.toggleText,
              isCustom && dayRowStyles.toggleTextActive,
            ]}>
            {isCustom ? 'Custom' : 'Default'}
          </Text>
        </TouchableOpacity>
      </View>
      {isCustom && (
        <View style={dayRowStyles.pickerRow}>
          <NumberPicker
            label="Hour"
            value={override.hour}
            min={0}
            max={23}
            onChange={h => onChange({...override, hour: h})}
          />
          <Text style={dayRowStyles.colon}>:</Text>
          <NumberPicker
            label="Minute"
            value={override.minute}
            min={0}
            max={59}
            onChange={m => onChange({...override, minute: m})}
          />
        </View>
      )}
    </View>
  );
}

const dayRowStyles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dayName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111111',
    width: 40,
  },
  defaultTime: {
    flex: 1,
    fontSize: 14,
    color: '#AAAAAA',
  },
  customTime: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#2B5F2B',
  },
  toggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
  },
  toggleActive: {
    backgroundColor: '#1A1A1A',
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555555',
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    marginBottom: 4,
  },
  colon: {
    fontSize: 28,
    fontWeight: '300',
    color: '#CCCCCC',
    marginBottom: 18,
  },
});

// ── main screen ───────────────────────────────────────────────────────────────

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [settings, setSettings] = useState<AppSettings>({
    notificationHour: 9,
    notificationMinute: 0,
    dayOverrides: [null, null, null, null, null, null, null],
    autoBackup: false,
  });
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const tapCount = useRef(0);
  const lastTapTime = useRef(0);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const toastAnim = useRef(new Animated.Value(-100)).current;

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setToastVisible(true);
    toastAnim.setValue(-100);
    Animated.timing(toastAnim, {toValue: 0, duration: 300, useNativeDriver: true}).start();
    setTimeout(() => {
      Animated.timing(toastAnim, {toValue: -100, duration: 300, useNativeDriver: true}).start(
        () => setToastVisible(false),
      );
    }, 2500);
  }, [toastAnim]);

  const handleTitlePress = useCallback(() => {
    const now = Date.now();
    if (now - lastTapTime.current > 1500) {
      tapCount.current = 0;
    }
    lastTapTime.current = now;
    tapCount.current += 1;
    if (tapCount.current >= 7) {
      tapCount.current = 0;
      setDevMode(prev => {
        const next = !prev;
        showToast(next ? 'Developer mode enabled' : 'Developer mode disabled');
        return next;
      });
    }
  }, [showToast]);

  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <TouchableOpacity onPress={handleTitlePress} activeOpacity={1}>
          <Text style={headerStyles.title}>Settings</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, handleTitlePress]);

  const handleExport = async () => {
    try {
      const {json, filename} = await exportAllData();
      if (Platform.OS === 'android') {
        await FilePicker.saveJsonFile(json, filename);
      } else {
        const path = `${CachesDirectoryPath}/${filename}`;
        await writeFile(path, json, 'utf8');
        await Share.share({url: `file://${path}`, title: filename});
      }
    } catch (e: any) {
      if (e?.code !== 'CANCELLED' && e?.message !== 'User did not share') {
        Alert.alert('Error', 'Could not export data.');
      }
    }
  };

  const handleImport = async () => {
    try {
      const json: string = await FilePicker.pickJsonFile();
      await importAllData(json);
      Alert.alert('Success', 'Data imported! Please restart the app to see your plants.');
    } catch (e: any) {
      if (e?.code !== 'CANCELLED') {
        Alert.alert('Error', 'Could not read the selected file. Make sure it is a valid Thryveo backup.');
      }
    }
  };

  const [testHour, setTestHour] = useState(new Date().getHours());
  const [testMinute, setTestMinute] = useState(
    Math.ceil((new Date().getMinutes() + 1) % 60),
  );

  useFocusEffect(
    useCallback(() => {
      getSettings().then(s => setSettings(s));
      getLastAutoBackupDate().then(setLastBackupDate);
    }, []),
  );

  const handleAutoBackupToggle = async (value: boolean) => {
    const updated = {...settings, autoBackup: value};
    setSettings(updated);
    await saveSettings(updated);
  };

  const handleSaveDefaultTime = async () => {
    await saveSettings(settings);

    const plants = await getPlants();
    // Sequential so concurrent updatePlant writes don't stomp on each other,
    // and so scheduleNotification's trigger-list check can't race across plants.
    for (const plant of plants) {
      const newNextReminder = applyNotificationTime(
        plant.nextReminder,
        settings.notificationHour,
        settings.notificationMinute,
      );
      const updated = {
        ...plant,
        nextReminder: newNextReminder,
        notifiedForReminder: undefined,
      };
      const notifId = await scheduleNotification(updated);
      await updatePlant({
        ...updated,
        notificationId: notifId,
        notifiedForReminder: newNextReminder,
      });
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    Alert.alert(
      'Saved',
      `All notifications will now fire at ${formatTime(
        settings.notificationHour,
        settings.notificationMinute,
      )}.`,
    );
  };

  const handleTestNow = async () => {
    try {
      await sendTestNotificationNow();
    } catch (e) {
      Alert.alert('Error', 'Could not send notification. Check permissions.');
    }
  };

  const handleTestScheduled = async () => {
    try {
      const now = new Date();
      const target = new Date();
      target.setHours(testHour, testMinute, 0, 0);
      if (target.getTime() <= now.getTime()) {
        target.setDate(target.getDate() + 1);
      }
      await sendTestNotificationAt(target.getTime());
      Alert.alert(
        'Scheduled',
        `Test notification scheduled for ${formatTime(testHour, testMinute)}${
          target.getDate() !== now.getDate() ? ' tomorrow' : ' today'
        }.`,
      );
    } catch (e) {
      Alert.alert(
        'Error',
        'Could not schedule notification. Check permissions.',
      );
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {toastVisible && (
        <Animated.View
          style={[styles.toast, {transform: [{translateY: toastAnim}]}]}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>
        {/* ── Default notification time ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Notification Time</Text>
          <Text style={styles.cardSubtitle}>
            All plant reminders will fire at this time of day.
          </Text>

          <View style={styles.pickerRow}>
            <NumberPicker
              label="Hour"
              value={settings.notificationHour}
              min={0}
              max={23}
              onChange={h => setSettings(s => ({...s, notificationHour: h}))}
            />
            <Text style={styles.colon}>:</Text>
            <NumberPicker
              label="Minute"
              value={settings.notificationMinute}
              min={0}
              max={59}
              onChange={m => setSettings(s => ({...s, notificationMinute: m}))}
            />
          </View>

          <Text style={styles.previewTime}>
            {formatTime(settings.notificationHour, settings.notificationMinute)}
          </Text>

          <TouchableOpacity
            style={[styles.primaryButton, saved && styles.primaryButtonSaved]}
            onPress={handleSaveDefaultTime}
            activeOpacity={0.8}>
            <Text style={styles.primaryButtonText}>
              {saved ? 'Saved!' : 'Save & Reschedule All'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Per-day schedule ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Per-Day Schedule</Text>
          <Text style={styles.cardSubtitle}>
            Override the notification time for specific days of the week.
          </Text>
          {DAY_ORDER.map(day => (
            <DayRow
              key={day}
              day={day}
              override={settings.dayOverrides?.[day] ?? null}
              defaultHour={settings.notificationHour}
              defaultMinute={settings.notificationMinute}
              onChange={v => {
                const next = [...(settings.dayOverrides ?? [null, null, null, null, null, null, null])];
                next[day] = v;
                setSettings(s => ({...s, dayOverrides: next}));
              }}
            />
          ))}
          <TouchableOpacity
            style={[styles.primaryButton, saved && styles.primaryButtonSaved]}
            onPress={handleSaveDefaultTime}
            activeOpacity={0.8}>
            <Text style={styles.primaryButtonText}>
              {saved ? 'Saved!' : 'Save & Reschedule All'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Backup ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Backup</Text>
          <Text style={styles.cardSubtitle}>
            Export or import your plants and settings.
          </Text>

          <View style={styles.toggleRow}>
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowTitle}>Auto Backup</Text>
              <Text style={styles.rowSub}>
                {lastBackupDate ? `Last backup: ${lastBackupDate}` : 'Backs up once a day on first open'}
              </Text>
            </View>
            <Switch
              value={settings.autoBackup}
              onValueChange={handleAutoBackupToggle}
              trackColor={{false: '#E0E0E0', true: '#2B5F2B'}}
              thumbColor="#FFFFFF"
            />
          </View>

          <TouchableOpacity
            style={styles.rowButton}
            onPress={handleExport}
            activeOpacity={0.8}>
            <Text style={styles.rowButtonEmoji}>📤</Text>
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowTitle}>Export Data</Text>
              <Text style={styles.rowSub}>Share a .json backup</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.rowButton}
            onPress={handleImport}
            activeOpacity={0.8}>
            <Text style={styles.rowButtonEmoji}>📥</Text>
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowTitle}>Import Data</Text>
              <Text style={styles.rowSub}>Reads thryveo-backup.json from Downloads</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Test notifications (dev mode only) ── */}
        {devMode && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Test Notifications</Text>
            <Text style={styles.cardSubtitle}>
              Verify that notifications work on your device.
            </Text>

            <TouchableOpacity
              style={styles.rowButton}
              onPress={handleTestNow}
              activeOpacity={0.8}>
              <Text style={styles.rowButtonEmoji}>⚡</Text>
              <View style={styles.rowTextWrap}>
                <Text style={styles.rowTitle}>Send Now</Text>
                <Text style={styles.rowSub}>Fires immediately</Text>
              </View>
            </TouchableOpacity>

            <Text style={styles.sectionLabel}>Schedule at a specific time</Text>
            <View style={styles.pickerRow}>
              <NumberPicker
                label="Hour"
                value={testHour}
                min={0}
                max={23}
                onChange={setTestHour}
              />
              <Text style={styles.colon}>:</Text>
              <NumberPicker
                label="Minute"
                value={testMinute}
                min={0}
                max={59}
                onChange={setTestMinute}
              />
            </View>
            <Text style={styles.previewTime}>
              {formatTime(testHour, testMinute)}
            </Text>

            <TouchableOpacity
              style={styles.rowButton}
              onPress={handleTestScheduled}
              activeOpacity={0.8}>
              <Text style={styles.rowButtonEmoji}>🕐</Text>
              <View style={styles.rowTextWrap}>
                <Text style={styles.rowTitle}>Schedule Test</Text>
                <Text style={styles.rowSub}>
                  Fires at {formatTime(testHour, testMinute)}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.versionText}>v{appVersion}</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const headerStyles = StyleSheet.create({
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111111',
    fontFamily: 'serif',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 4,
    letterSpacing: 0.1,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#999999',
    marginBottom: 20,
    lineHeight: 18,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  colon: {
    fontSize: 28,
    fontWeight: '300',
    color: '#CCCCCC',
    marginBottom: 18,
  },
  previewTime: {
    textAlign: 'center',
    fontSize: 14,
    color: '#888888',
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  primaryButtonSaved: {
    backgroundColor: '#2B5F2B',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999999',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  rowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  rowButtonEmoji: {
    fontSize: 24,
  },
  rowTextWrap: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111111',
  },
  rowSub: {
    fontSize: 12,
    color: '#999999',
    marginTop: 2,
  },
  toast: {
    position: 'absolute',
    top: 16,
    alignSelf: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 10,
    zIndex: 100,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#CCCCCC',
    marginTop: 4,
  },
});

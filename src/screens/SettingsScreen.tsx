import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  Alert,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {writeFile, readFile, DownloadDirectoryPath} from 'react-native-fs';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {
  AppSettings,
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

// Simple drum-roll style number picker rendered as +/- buttons
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
    color: '#888',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  row: {flexDirection: 'row', alignItems: 'center', gap: 12},
  btn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnText: {fontSize: 22, color: '#1b5e20', fontWeight: '700', lineHeight: 26},
  value: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1b5e20',
    minWidth: 44,
    textAlign: 'center',
  },
});

// ── main screen ───────────────────────────────────────────────────────────────

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [settings, setSettings] = useState<AppSettings>({
    notificationHour: 9,
    notificationMinute: 0,
  });
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
      const {json} = await exportAllData();
      const path = `${DownloadDirectoryPath}/thryveo-backup.json`;
      await writeFile(path, json, 'utf8');
      Alert.alert('Exported', 'Saved to Downloads/thryveo-backup.json');
    } catch {
      Alert.alert('Error', 'Could not export data.');
    }
  };

  const handleImport = async () => {
    try {
      const path = `${DownloadDirectoryPath}/thryveo-backup.json`;
      const json = await readFile(path, 'utf8');
      await importAllData(json);
      Alert.alert('Success', 'Data imported! Please restart the app to see your plants.');
    } catch {
      Alert.alert('File not found', 'Could not find thryveo-backup.json in your Downloads folder. Please export first.');
    }
  };

  // Test notification - scheduled at custom time
  const [testHour, setTestHour] = useState(new Date().getHours());
  const [testMinute, setTestMinute] = useState(
    Math.ceil((new Date().getMinutes() + 1) % 60),
  );

  useFocusEffect(
    useCallback(() => {
      getSettings().then(s => setSettings(s));
    }, []),
  );

  const handleSaveDefaultTime = async () => {
    await saveSettings(settings);

    // Reschedule all existing plant notifications to the new default time
    const plants = await getPlants();
    await Promise.all(
      plants.map(async plant => {
        // Recompute fire time on the same reminder day with the new clock time
        const newNextReminder = applyNotificationTime(
          plant.nextReminder,
          settings.notificationHour,
          settings.notificationMinute,
        );
        const updated = {...plant, nextReminder: newNextReminder};
        const notifId = await scheduleNotification(updated);
        updated.notificationId = notifId;
        await updatePlant(updated);
      }),
    );

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
      // If the time is already past today, schedule it for tomorrow
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
          <Text style={styles.cardTitle}>Default Notification Time</Text>
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

        {/* ── Data migration ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Data Migration</Text>
          <Text style={styles.cardSubtitle}>
            Export your plants to move them to a new install.
          </Text>

          <TouchableOpacity
            style={styles.testButton}
            onPress={handleExport}
            activeOpacity={0.8}>
            <Text style={styles.testButtonEmoji}>📤</Text>
            <View style={styles.testButtonTextWrap}>
              <Text style={styles.testButtonTitle}>Export Data</Text>
              <Text style={styles.testButtonSub}>Saves a .json file to Downloads</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.testButton}
            onPress={handleImport}
            activeOpacity={0.8}>
            <Text style={styles.testButtonEmoji}>📥</Text>
            <View style={styles.testButtonTextWrap}>
              <Text style={styles.testButtonTitle}>Import Data</Text>
              <Text style={styles.testButtonSub}>Reads thryveo-backup.json from Downloads</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Test notifications (dev mode only) ── */}
        {devMode && <View style={styles.card}>
          <Text style={styles.cardTitle}>Test Notifications</Text>
          <Text style={styles.cardSubtitle}>
            Verify that notifications work on your device.
          </Text>

          {/* Instant */}
          <TouchableOpacity
            style={styles.testButton}
            onPress={handleTestNow}
            activeOpacity={0.8}>
            <Text style={styles.testButtonEmoji}>⚡</Text>
            <View style={styles.testButtonTextWrap}>
              <Text style={styles.testButtonTitle}>Send Now</Text>
              <Text style={styles.testButtonSub}>Fires immediately</Text>
            </View>
          </TouchableOpacity>

          {/* Scheduled */}
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
            style={styles.testButton}
            onPress={handleTestScheduled}
            activeOpacity={0.8}>
            <Text style={styles.testButtonEmoji}>🕐</Text>
            <View style={styles.testButtonTextWrap}>
              <Text style={styles.testButtonTitle}>Schedule Test</Text>
              <Text style={styles.testButtonSub}>
                Fires at {formatTime(testHour, testMinute)}
              </Text>
            </View>
          </TouchableOpacity>
        </View>}
      </ScrollView>
    </SafeAreaView>
  );
};

const headerStyles = StyleSheet.create({
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1b5e20',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f8e9',
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1b5e20',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#757575',
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
    fontWeight: '700',
    color: '#1b5e20',
    marginBottom: 18,
  },
  previewTime: {
    textAlign: 'center',
    fontSize: 15,
    color: '#555',
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: '#2e7d32',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonSaved: {
    backgroundColor: '#43a047',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#388e3c',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
    marginTop: 4,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f8e9',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    gap: 12,
  },
  testButtonEmoji: {
    fontSize: 28,
  },
  testButtonTextWrap: {
    flex: 1,
  },
  testButtonTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1b5e20',
  },
  testButtonSub: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  toast: {
    position: 'absolute',
    top: 16,
    alignSelf: 'center',
    backgroundColor: '#1b5e20',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 10,
    zIndex: 100,
  },
  toastText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

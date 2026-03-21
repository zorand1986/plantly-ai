import React, {useCallback, useState} from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';
import {
  AppSettings,
  getSettings,
  saveSettings,
  getPlants,
  updatePlant,
  applyNotificationTime,
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
  const [settings, setSettings] = useState<AppSettings>({
    notificationHour: 9,
    notificationMinute: 0,
  });
  const [saved, setSaved] = useState(false);

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

        {/* ── Test notifications ── */}
        <View style={styles.card}>
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
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

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
});

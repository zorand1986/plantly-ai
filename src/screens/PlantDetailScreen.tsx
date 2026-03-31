import React, {useCallback, useEffect, useState, useRef} from 'react';
import {
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {
  Plant,
  getPlants,
  updatePlant,
  deletePlant,
  computeNextReminder,
} from '../utils/storage';
import {scheduleNotification, cancelNotification} from '../utils/notifications';
import {launchImageLibrary} from 'react-native-image-picker';
import {RootStackParamList} from '../../App';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'PlantDetail'>;
type RoutePropType = RouteProp<RootStackParamList, 'PlantDetail'>;

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function daysLabel(nextReminder: number): string {
  const diffDays = Math.ceil(
    (nextReminder - Date.now()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays < 0)
    return `${Math.abs(diffDays)} day${
      Math.abs(diffDays) !== 1 ? 's' : ''
    } overdue`;
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'tomorrow';
  return `in ${diffDays} days`;
}

export const PlantDetailScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const {plantId} = route.params;

  const [plant, setPlant] = useState<Plant | null>(null);
  const [intervalDays, setIntervalDays] = useState('');
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const toastAnim = useRef(new Animated.Value(-100)).current;
  const [editingName, setEditingName] = useState(false);
  const [plantNameInput, setPlantNameInput] = useState('');

  const showToast = (message: string) => {
    setToastMessage(message);
    setToastVisible(true);
    toastAnim.setValue(-100);
    Animated.timing(toastAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
    setTimeout(() => {
      Animated.timing(toastAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setToastVisible(false));
    }, 2500);
  };

  const loadPlant = useCallback(async () => {
    const plants = await getPlants();
    const found = plants.find(p => p.id === plantId) ?? null;
    if (found) {
      setPlant(found);
      setIntervalDays(String(found.intervalDays));
      setPlantNameInput(found.name);
    }
  }, [plantId]);

  useFocusEffect(
    useCallback(() => {
      loadPlant();
    }, [loadPlant]),
  );

  const handlePostpone = async (extraDays: number) => {
    if (!plant) return;
    setSaving(true);
    try {
      const newNextReminder =
        plant.nextReminder + extraDays * 24 * 60 * 60 * 1000;
      const updated: Plant = {...plant, nextReminder: newNextReminder};
      const notifId = await scheduleNotification(updated);
      updated.notificationId = notifId;
      await updatePlant(updated);
      setPlant(updated);
      showToast(`Reminder moved to ${formatDate(newNextReminder)}.`);
    } finally {
      setSaving(false);
    }
  };

  const handleMarkWatered = async () => {
    if (!plant) return;
    setSaving(true);
    try {
      const now = Date.now();
      const newNextReminder = computeNextReminder(now, plant.intervalDays);
      // Add current timestamp to watering history
      const wateringHistory = [...(plant.wateringHistory || []), now];
      const updated: Plant = {
        ...plant,
        lastWatered: now,
        nextReminder: newNextReminder,
        wateringHistory,
      };
      const notifId = await scheduleNotification(updated);
      updated.notificationId = notifId;
      await updatePlant(updated);
      setPlant(updated);
      showToast(`Great job! Next watering: ${formatDate(newNextReminder)}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveInterval = async () => {
    if (!plant) return;
    const days = parseInt(intervalDays, 10);
    if (isNaN(days) || days < 1) {
      showToast('Please enter a valid number of days.');
      return;
    }
    setSaving(true);
    try {
      const newNextReminder = computeNextReminder(plant.lastWatered, days);
      const updated: Plant = {
        ...plant,
        intervalDays: days,
        nextReminder: newNextReminder,
      };
      const notifId = await scheduleNotification(updated);
      updated.notificationId = notifId;
      await updatePlant(updated);
      setPlant(updated);
      showToast('Watering interval updated.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveName = async () => {
    if (!plant) return;
    const trimmed = plantNameInput.trim();
    if (!trimmed) {
      showToast('Please enter a plant name.');
      return;
    }
    setSaving(true);
    try {
      const updated: Plant = {...plant, name: trimmed};
      await updatePlant(updated);
      setPlant(updated);
      setEditingName(false);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePhoto = () => {
    launchImageLibrary({mediaType: 'photo', quality: 0.7}, async res => {
      if (res.didCancel || !res.assets || !res.assets[0]?.uri) return;
      const newPhotoUri = res.assets[0].uri;
      if (!plant) return;
      setSaving(true);
      try {
        const updated: Plant = {...plant, photoUri: newPhotoUri};
        await updatePlant(updated);
        setPlant(updated);
      } finally {
        setSaving(false);
      }
    });
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Plant',
      `Are you sure you want to delete "${plant?.name}"?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!plant) return;
            if (plant.notificationId) {
              await cancelNotification(plant.notificationId);
            }
            await deletePlant(plant.id);
            navigation.goBack();
          },
        },
      ],
    );
  };

  if (!plant) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const overdue = plant.nextReminder < Date.now();

  return (
    <SafeAreaView style={styles.container}>
      {toastVisible && (
        <Animated.View
          style={[styles.toast, {transform: [{translateY: toastAnim}]}]}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}
      <KeyboardAvoidingView
        style={{flex: 1}}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}>
          {/* Hero image */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleChangePhoto}
            disabled={saving}
            style={styles.heroTouchArea}>
            {plant.photoUri ? (
              <>
                <Image
                  source={{uri: plant.photoUri}}
                  style={styles.heroImage}
                />
                <View style={styles.heroOverlay}>
                  <Text style={styles.heroOverlayText}>
                    Tap to change photo
                  </Text>
                </View>
              </>
            ) : (
              <View style={styles.heroPlaceholder}>
                <Text style={styles.heroEmoji}>🌱</Text>
                <Text style={styles.heroOverlayText}>Tap to add photo</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.body}>
            {editingName ? (
              <View style={styles.nameEditRow}>
                <TextInput
                  style={styles.nameInput}
                  value={plantNameInput}
                  onChangeText={setPlantNameInput}
                  autoFocus
                  maxLength={50}
                />
                <TouchableOpacity
                  style={styles.saveNameButton}
                  onPress={handleSaveName}
                  disabled={saving}
                  activeOpacity={0.8}>
                  <Text style={styles.saveNameButtonText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelNameButton}
                  onPress={() => {
                    setEditingName(false);
                    setPlantNameInput(plant?.name ?? '');
                  }}
                  disabled={saving}
                  activeOpacity={0.8}>
                  <Text style={styles.cancelNameButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setEditingName(true);
                  setPlantNameInput(plant?.name ?? '');
                }}
                disabled={saving}>
                <Text style={styles.plantName}>{plant.name} ✎</Text>
              </TouchableOpacity>
            )}

            {/* Reminder status */}
            <View
              style={[
                styles.statusCard,
                overdue ? styles.overdueCard : styles.upcomingCard,
              ]}>
              <Text style={styles.statusLabel}>Next watering</Text>
              <Text style={styles.statusDate}>
                {formatDate(plant.nextReminder)}
              </Text>
              <Text style={styles.statusDays}>
                {daysLabel(plant.nextReminder)}
              </Text>
            </View>

            {/* Mark watered */}
            <TouchableOpacity
              style={styles.wateredButton}
              onPress={handleMarkWatered}
              disabled={saving}
              activeOpacity={0.8}>
              <Text style={styles.wateredButtonText}>💧 Mark as Watered</Text>
            </TouchableOpacity>

            {/* Postpone */}
            <Text style={styles.sectionLabel}>Postpone Reminder</Text>
            <View style={styles.postponeRow}>
              {[1, 2, 3, 7].map(days => (
                <TouchableOpacity
                  key={days}
                  style={styles.postponeChip}
                  onPress={() => handlePostpone(days)}
                  disabled={saving}
                  activeOpacity={0.8}>
                  <Text style={styles.postponeChipText}>+{days}d</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Edit interval */}
            <Text style={styles.sectionLabel}>Watering Interval</Text>
            <View style={styles.intervalRow}>
              <TextInput
                style={styles.intervalInput}
                keyboardType="numeric"
                value={intervalDays}
                onChangeText={setIntervalDays}
                maxLength={3}
              />
              <Text style={styles.intervalUnit}>days</Text>
              <TouchableOpacity
                style={styles.saveIntervalButton}
                onPress={handleSaveInterval}
                disabled={saving}
                activeOpacity={0.8}>
                <Text style={styles.saveIntervalButtonText}>Update</Text>
              </TouchableOpacity>
            </View>

            {/* Last watered */}
            <Text style={styles.metaText}>
              Last watered: {formatDate(plant.lastWatered)}
            </Text>

            {/* Watering History */}
            <Text style={styles.sectionLabel}>Watering History</Text>
            {plant.wateringHistory && plant.wateringHistory.length > 0 ? (
              <>
                {plant.wateringHistory
                  .slice()
                  .reverse()
                  .map((ts, index) => (
                    <Text key={index} style={styles.historyItem}>
                      {formatDate(ts)}
                    </Text>
                  ))}
              </>
            ) : (
              <Text style={styles.historyItem}>No watering history yet</Text>
            )}

            {/* Delete */}
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
              disabled={saving}
              activeOpacity={0.8}>
              <Text style={styles.deleteButtonText}>Delete Plant</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f8e9',
  },
  toast: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    backgroundColor: '#00e676',
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  toastText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#757575',
    fontSize: 16,
  },
  scroll: {
    paddingBottom: 40,
  },
  heroImage: {
    width: '100%',
    height: 240,
    resizeMode: 'cover',
  },
  heroTouchArea: {
    position: 'relative',
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingVertical: 10,
    alignItems: 'center',
  },
  heroOverlayText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  heroPlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: '#c8e6c9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroEmoji: {
    fontSize: 80,
  },
  body: {
    padding: 20,
  },
  plantName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1b5e20',
    marginBottom: 16,
  },
  nameEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  nameInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 20,
    fontWeight: '700',
    color: '#1b5e20',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  saveNameButton: {
    backgroundColor: '#388e3c',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  saveNameButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  cancelNameButton: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  cancelNameButtonText: {
    color: '#888',
    fontWeight: '600',
    fontSize: 14,
  },
  statusCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  upcomingCard: {
    backgroundColor: '#e8f5e9',
  },
  overdueCard: {
    backgroundColor: '#ffebee',
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  statusDate: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1b5e20',
  },
  statusDays: {
    fontSize: 14,
    color: '#555',
    marginTop: 2,
  },
  wateredButton: {
    backgroundColor: '#1b5e20',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 24,
  },
  wateredButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#388e3c',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  postponeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  postponeChip: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 2,
  },
  postponeChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#388e3c',
  },
  intervalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  intervalInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: '#212121',
    width: 72,
    textAlign: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  intervalUnit: {
    fontSize: 16,
    color: '#555',
    fontWeight: '500',
  },
  saveIntervalButton: {
    backgroundColor: '#388e3c',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginLeft: 'auto',
  },
  saveIntervalButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  metaText: {
    fontSize: 13,
    color: '#9e9e9e',
    marginBottom: 32,
    marginTop: 4,
  },
  historyItem: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  deleteButton: {
    borderWidth: 1.5,
    borderColor: '#e53935',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#e53935',
    fontSize: 16,
    fontWeight: '600',
  },
});

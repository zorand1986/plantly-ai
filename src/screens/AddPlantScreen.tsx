import React, {useState} from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {launchImageLibrary, launchCamera} from 'react-native-image-picker';
import {addPlant, computeNextReminder, Plant} from '../utils/storage';
import {scheduleNotification} from '../utils/notifications';

export const AddPlantScreen: React.FC = () => {
  const navigation = useNavigation();
  const [name, setName] = useState('');
  const [photoUri, setPhotoUri] = useState<string | undefined>();
  const [intervalDays, setIntervalDays] = useState('7');
  const [saving, setSaving] = useState(false);

  const handlePickPhoto = () => {
    Alert.alert('Add Photo', 'Choose a source', [
      {
        text: 'Camera',
        onPress: async () => {
          if (Platform.OS === 'android') {
            const granted = await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.CAMERA,
            );
            if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
              Alert.alert('Permission required', 'Camera permission is needed to take a photo.');
              return;
            }
          }
          launchCamera({mediaType: 'photo', quality: 0.7}, res => {
            if (res.assets?.[0]?.uri) {
              setPhotoUri(res.assets[0].uri);
            }
          });
        },
      },
      {
        text: 'Photo Library',
        onPress: () =>
          launchImageLibrary({mediaType: 'photo', quality: 0.7}, res => {
            if (res.assets?.[0]?.uri) {
              setPhotoUri(res.assets[0].uri);
            }
          }),
      },
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Name required', 'Please enter a plant name.');
      return;
    }

    const days = parseInt(intervalDays, 10);
    if (isNaN(days) || days < 1) {
      Alert.alert('Invalid interval', 'Please enter a valid number of days (minimum 1).');
      return;
    }

    setSaving(true);
    try {
      const now = Date.now();
      const nextReminder = computeNextReminder(now, days);

      const plant: Plant = {
        id: `${now}-${Math.random().toString(36).slice(2)}`,
        name: trimmedName,
        photoUri,
        intervalDays: days,
        lastWatered: now,
        nextReminder,
        wateringHistory: [now],
      };

      const notificationId = await scheduleNotification(plant);
      plant.notificationId = notificationId;

      await addPlant(plant);
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', 'Failed to save plant. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{flex: 1}}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionLabel}>Plant Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Monstera"
            placeholderTextColor="#BBBBBB"
            value={name}
            onChangeText={setName}
            returnKeyType="done"
          />

          <Text style={styles.sectionLabel}>Photo</Text>
          <TouchableOpacity style={styles.photoBox} onPress={handlePickPhoto} activeOpacity={0.8}>
            {photoUri ? (
              <Image source={{uri: photoUri}} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoEmoji}>📷</Text>
                <Text style={styles.photoHint}>Tap to add a photo</Text>
              </View>
            )}
          </TouchableOpacity>

          <Text style={styles.sectionLabel}>Watering Interval</Text>
          <View style={styles.intervalRow}>
            <TextInput
              style={[styles.input, styles.intervalInput]}
              keyboardType="numeric"
              value={intervalDays}
              onChangeText={setIntervalDays}
              maxLength={3}
            />
            <Text style={styles.intervalUnit}>days</Text>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}>
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : 'Save Plant'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999999',
    marginTop: 24,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111111',
  },
  photoBox: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#F8F8F8',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  photo: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  photoPlaceholder: {
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  photoHint: {
    color: '#AAAAAA',
    fontSize: 14,
  },
  intervalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  intervalInput: {
    width: 80,
    textAlign: 'center',
  },
  intervalUnit: {
    fontSize: 15,
    color: '#666666',
  },
  saveButton: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 36,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});

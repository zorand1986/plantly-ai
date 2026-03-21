import React, {useState} from 'react';
import {
  Alert,
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
        onPress: () =>
          launchCamera({mediaType: 'photo', quality: 0.7}, res => {
            if (res.assets?.[0]?.uri) {
              setPhotoUri(res.assets[0].uri);
            }
          }),
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
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{flex: 1}}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionLabel}>Plant Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Monstera"
            placeholderTextColor="#aaa"
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
    backgroundColor: '#f1f8e9',
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#388e3c',
    marginTop: 20,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#212121',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  photoBox: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
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
    fontSize: 36,
    marginBottom: 8,
  },
  photoHint: {
    color: '#9e9e9e',
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
    fontSize: 16,
    color: '#555',
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#388e3c',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 32,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});

import React, {useCallback, useState} from 'react';
import {FlatList, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Plant, getPlants} from '../utils/storage';
import {PlantCard} from '../components/PlantCard';
import {RootStackParamList} from '../../App';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const ICON_COLOR = '#2e7d32';
const TOOTH_COUNT = 8;

const SettingsIcon: React.FC = () => {
  const size = 20;
  const center = size / 2;
  const ringOuter = 8;
  const ringInner = 5;
  const toothW = 3;
  const toothH = 2.5;
  const toothR = ringOuter + 0.5;

  return (
    <View style={{width: size, height: size}}>
      {/* Outer ring */}
      <View
        style={{
          position: 'absolute',
          width: ringOuter * 2,
          height: ringOuter * 2,
          borderRadius: ringOuter,
          borderWidth: 2,
          borderColor: ICON_COLOR,
          top: center - ringOuter,
          left: center - ringOuter,
        }}
      />
      {/* Inner circle (hole) */}
      <View
        style={{
          position: 'absolute',
          width: ringInner * 2,
          height: ringInner * 2,
          borderRadius: ringInner,
          backgroundColor: '#f1f8e9',
          top: center - ringInner,
          left: center - ringInner,
        }}
      />
      {/* Teeth */}
      {Array.from({length: TOOTH_COUNT}).map((_, i) => {
        const angle = (i * 360) / TOOTH_COUNT;
        const rad = (angle * Math.PI) / 180;
        const tx = center + toothR * Math.sin(rad) - toothW / 2;
        const ty = center - toothR * Math.cos(rad) - toothH / 2;
        return (
          <View
            key={String(i)}
            style={{
              position: 'absolute',
              width: toothW,
              height: toothH,
              backgroundColor: ICON_COLOR,
              borderRadius: 0.5,
              left: tx,
              top: ty,
              transform: [{rotate: `${angle}deg`}],
            }}
          />
        );
      })}
    </View>
  );
};

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const [plants, setPlants] = useState<Plant[]>([]);

  const loadPlants = useCallback(async () => {
    const data = await getPlants();
    // Sort by soonest next reminder
    data.sort((a, b) => a.nextReminder - b.nextReminder);
    setPlants(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPlants();
    }, [loadPlants]),
  );

  const handleCardPress = (plant: Plant) => {
    navigation.navigate('PlantDetail', {plantId: plant.id});
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Dashboard</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => navigation.navigate('Settings')}
            activeOpacity={0.8}>
            <SettingsIcon />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AddPlant')}
            activeOpacity={0.8}>
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {plants.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🪴</Text>
          <Text style={styles.emptyTitle}>No plants yet</Text>
          <Text style={styles.emptySubtitle}>
            Tap "Add" to track your first plant
          </Text>
        </View>
      ) : (
        <FlatList
          data={plants}
          keyExtractor={item => item.id}
          numColumns={2}
          renderItem={({item}) => (
            <PlantCard plant={item} onPress={handleCardPress} />
          )}
          contentContainerStyle={styles.list}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f8e9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1b5e20',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#c8e6c9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: '#388e3c',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  list: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingBottom: 24,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 60,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#388e3c',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#757575',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});

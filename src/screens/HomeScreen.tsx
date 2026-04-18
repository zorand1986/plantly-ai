import React, {useCallback, useEffect, useRef, useState} from 'react';
import {ActivityIndicator, AppState, AppStateStatus, FlatList, Platform, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Plant, getPlants} from '../utils/storage';
import {PlantCard} from '../components/PlantCard';
import {RootStackParamList} from '../../App';
import {syncWidget, processPendingWaterings} from '../utils/widgetSync';
import {rescheduleAllNotifications} from '../utils/notifications';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const MenuIcon: React.FC = () => (
  <View style={{width: 18, height: 13, justifyContent: 'space-between'}}>
    <View style={{height: 1.5, backgroundColor: '#111111', borderRadius: 1}} />
    <View style={{height: 1.5, backgroundColor: '#111111', borderRadius: 1, width: 12}} />
    <View style={{height: 1.5, backgroundColor: '#111111', borderRadius: 1}} />
  </View>
);

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const [plants, setPlants] = useState<Plant[]>([]);
  const [plantsLoading, setPlantsLoading] = useState(true);

  const loadPlants = useCallback(async () => {
    const data = await getPlants();
    data.sort((a, b) => a.nextReminder - b.nextReminder);
    setPlants(data);
    setPlantsLoading(false);
  }, []);

  const syncAndLoad = useCallback(() => {
    // Serial chain: widget waterings first (so reschedule sees fresh
    // nextReminder values), then reschedule sweeps any plants whose flag is
    // out of sync, then refresh the UI and widget. Running these in parallel
    // caused duplicate notifications.
    processPendingWaterings()
      .then(rescheduleAllNotifications)
      .then(loadPlants)
      .then(syncWidget)
      .catch(() => {});
  }, [loadPlants]);

  // Re-sync when navigating back to this screen (e.g. from PlantDetail)
  useFocusEffect(syncAndLoad);

  // Re-sync when the app comes back to the foreground (useFocusEffect alone
  // doesn't fire in that case if HomeScreen is already the top screen)
  const appState = useRef(AppState.currentState);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (appState.current !== 'active' && next === 'active') {
        syncAndLoad();
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, [syncAndLoad]);

  const handleCardPress = (plant: Plant) => {
    navigation.navigate('PlantDetail', {plantId: plant.id});
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Plants</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => navigation.navigate('Support')}
            activeOpacity={0.7}>
            <Text style={styles.coffeeIcon}>☕</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => navigation.navigate('Settings')}
            activeOpacity={0.7}>
            <MenuIcon />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AddPlant')}
            activeOpacity={0.8}>
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {plantsLoading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color="#1A1A1A" />
        </View>
      ) : plants.length === 0 ? (
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

const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111111',
    fontFamily: SERIF,
    letterSpacing: 0.3,
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
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coffeeIcon: {
    fontSize: 18,
  },
  addButton: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
    letterSpacing: 0.2,
  },
  list: {
    paddingHorizontal: 10,
    paddingVertical: 12,
    paddingBottom: 24,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 60,
  },
  emptyEmoji: {
    fontSize: 60,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111111',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});

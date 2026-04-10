import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  NavigationContainer,
  NavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';

import { HomeScreen } from './src/screens/HomeScreen';
import { AddPlantScreen } from './src/screens/AddPlantScreen';
import { PlantDetailScreen } from './src/screens/PlantDetailScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import {
  requestPermissions,
  setupNotificationChannel,
  rescheduleAllNotifications,
} from './src/utils/notifications';

export type RootStackParamList = {
  Home: undefined;
  AddPlant: undefined;
  PlantDetail: { plantId: string };
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function App(): React.JSX.Element {
  const navigationRef =
    useRef<NavigationContainerRef<RootStackParamList>>(null);

  useEffect(() => {
    setupNotificationChannel();
    requestPermissions();
    rescheduleAllNotifications();

    // Navigate to plant when user taps a notification (foreground + background)
    const subscription = Notifications.addNotificationResponseReceivedListener(
      response => {
        const plantId = response.notification.request.content.data
          ?.plantId as string | undefined;
        if (plantId) {
          navigationRef.current?.navigate('PlantDetail', { plantId });
        }
      },
    );

    // Navigate to plant when app is opened from a killed state via notification
    Notifications.getLastNotificationResponseAsync().then(response => {
      const plantId = response?.notification.request.content.data
        ?.plantId as string | undefined;
      if (plantId) {
        setTimeout(() => {
          navigationRef.current?.navigate('PlantDetail', { plantId });
        }, 500);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navigationRef}>
        <StatusBar barStyle="dark-content" backgroundColor="#f1f8e9" />
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerStyle: { backgroundColor: '#f1f8e9' },
            headerTintColor: '#1b5e20',
            headerTitleStyle: { fontWeight: '700' },
            contentStyle: { backgroundColor: '#f1f8e9' },
          }}>
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="AddPlant"
            component={AddPlantScreen}
            options={{ title: 'New Plant' }}
          />
          <Stack.Screen
            name="PlantDetail"
            component={PlantDetailScreen}
            options={{ title: 'Plant Details' }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ title: 'Settings' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default App;

import React, {useEffect, useRef} from 'react';
import {Linking, StatusBar} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {
  NavigationContainer,
  NavigationContainerRef,
} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import notifee, {EventType} from '@notifee/react-native';

import {HomeScreen} from './src/screens/HomeScreen';
import {AddPlantScreen} from './src/screens/AddPlantScreen';
import {PlantDetailScreen} from './src/screens/PlantDetailScreen';
import {SettingsScreen} from './src/screens/SettingsScreen';
import {
  requestPermissions,
  setupNotificationChannel,
  ensureExactAlarmPermission,
  requestBatteryOptimizationExemption,
  rescheduleAllNotifications,
} from './src/utils/notifications';
import {useForceUpdate} from './src/utils/forceUpdate';
import {ForceUpdateGate} from './src/components/ForceUpdateGate';

export type RootStackParamList = {
  Home: undefined;
  AddPlant: undefined;
  PlantDetail: {plantId: string};
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Handle notification press when app is in background/quit
notifee.onBackgroundEvent(async ({type, detail}) => {
  if (type === EventType.PRESS && detail.notification?.data?.plantId) {
    // Navigation happens after app resumes via getInitialNotification in App
  }
});

function App(): React.JSX.Element {
  const navigationRef =
    useRef<NavigationContainerRef<RootStackParamList>>(null);
  const {status, retry} = useForceUpdate();

  useEffect(() => {
    // Request permissions and setup channel on mount
    setupNotificationChannel();
    requestPermissions();

    // Android: ensure exact-alarm permission is granted (required on API 31+)
    ensureExactAlarmPermission();

    // Android: request battery optimisation exemption so alarms survive Doze/OEM killers
    requestBatteryOptimizationExemption();

    // Recover any notifications that may have been lost (e.g. app update, clock change)
    rescheduleAllNotifications();

    // Handle notification press while app is in foreground
    const unsubscribe = notifee.onForegroundEvent(({type, detail}) => {
      if (type === EventType.PRESS && detail.notification?.data?.plantId) {
        const plantId = detail.notification.data.plantId as string;
        navigationRef.current?.navigate('PlantDetail', {plantId});
      }
    });

    // Handle notification press that opened app from background/quit
    notifee.getInitialNotification().then(initialNotification => {
      if (initialNotification?.notification?.data?.plantId) {
        const plantId = initialNotification.notification.data.plantId as string;
        // Small delay to let navigation be ready
        setTimeout(() => {
          navigationRef.current?.navigate('PlantDetail', {plantId});
        }, 500);
      }
    });

    // Handle deep link from widget: thryveo://plant/{plantId}
    const handleDeepLink = (url: string | null) => {
      if (!url) return;
      const match = url.match(/^thryveo:\/\/plant\/(.+)$/);
      if (match) {
        const plantId = match[1];
        setTimeout(() => {
          navigationRef.current?.navigate('PlantDetail', {plantId});
        }, 300);
      }
    };

    // App opened via deep link from a closed state
    Linking.getInitialURL().then(handleDeepLink);

    // App brought to foreground via deep link
    const linkingSubscription = Linking.addEventListener('url', ({url}) =>
      handleDeepLink(url),
    );

    return () => {
      unsubscribe();
      linkingSubscription.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
      {status.state === 'loading' && <ForceUpdateGate type="loading" />}
      {status.state === 'no_internet' && (
        <ForceUpdateGate type="no_internet" onRetry={retry} />
      )}
      {status.state === 'update_required' && (
        <ForceUpdateGate type="update_required" config={status.config} />
      )}
      <NavigationContainer ref={navigationRef}>
        <StatusBar barStyle="dark-content" backgroundColor="#f1f8e9" />
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerStyle: {backgroundColor: '#f1f8e9'},
            headerTintColor: '#1b5e20',
            headerTitleStyle: {fontWeight: '700'},
            contentStyle: {backgroundColor: '#f1f8e9'},
          }}>
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{headerShown: false}}
          />
          <Stack.Screen
            name="AddPlant"
            component={AddPlantScreen}
            options={{title: 'New Plant'}}
          />
          <Stack.Screen
            name="PlantDetail"
            component={PlantDetailScreen}
            options={{title: 'Plant Details'}}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{title: 'Settings'}}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default App;

import React, {useEffect, useRef} from 'react';
import {ActivityIndicator, Linking, StatusBar, View} from 'react-native';
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
import {SupportScreen} from './src/screens/SupportScreen';
import {SignInScreen} from './src/screens/auth/SignInScreen';
import {SignUpScreen} from './src/screens/auth/SignUpScreen';
import {ForgotPasswordScreen} from './src/screens/auth/ForgotPasswordScreen';
import {SetNewPasswordScreen} from './src/screens/auth/SetNewPasswordScreen';
import {
  requestPermissions,
  setupNotificationChannel,
  ensureExactAlarmPermission,
  requestBatteryOptimizationExemption,
} from './src/utils/notifications';
import {useForceUpdate} from './src/utils/forceUpdate';
import {ForceUpdateGate} from './src/components/ForceUpdateGate';
import {runAutoBackupIfNeeded} from './src/utils/autoBackup';
import {setWidgetForceUpdate} from './src/utils/widgetSync';
import {AuthProvider, useAuth} from './src/utils/auth';
import {supabase} from './src/utils/supabase';
import {setWidgetLoggedIn} from './src/utils/widgetSync';

export type RootStackParamList = {
  // App screens
  Home: undefined;
  AddPlant: undefined;
  PlantDetail: {plantId: string};
  Settings: undefined;
  Support: undefined;
  SetNewPassword: undefined;
  // Auth screens
  SignIn: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Handle notification press when app is in background/quit
notifee.onBackgroundEvent(async ({type, detail}) => {
  if (type === EventType.PRESS && detail.notification?.data?.plantId) {
    // Navigation happens after app resumes via getInitialNotification in AppNavigator
  }
});

/**
 * Inner navigator — lives inside AuthProvider so it can call useAuth().
 * Renders the auth stack when signed out, the app stack when signed in.
 */
function AppNavigator(): React.JSX.Element {
  const {session, loading, isPasswordRecovery, enterRecoveryMode} = useAuth();
  const {status, retry} = useForceUpdate();
  const navigationRef =
    useRef<NavigationContainerRef<RootStackParamList>>(null);

  useEffect(() => {
    if (status.state === 'update_required') {
      setWidgetForceUpdate(true);
    }
  }, [status.state]);

  // Keep the widget in sync with the login state. Skip while the persisted
  // session is still being restored from storage to avoid a false sign-out flash.
  useEffect(() => {
    if (loading) {return;}
    setWidgetLoggedIn(session !== null).catch(() => {});
  }, [session, loading]);

  useEffect(() => {
    setupNotificationChannel();
    requestPermissions();
    ensureExactAlarmPermission();
    requestBatteryOptimizationExemption();
    runAutoBackupIfNeeded();

    const unsubscribe = notifee.onForegroundEvent(({type, detail}) => {
      if (type === EventType.PRESS && detail.notification?.data?.plantId) {
        const plantId = detail.notification.data.plantId as string;
        navigationRef.current?.navigate('PlantDetail', {plantId});
      }
    });

    notifee.getInitialNotification().then(initialNotification => {
      if (initialNotification?.notification?.data?.plantId) {
        const plantId = initialNotification.notification.data.plantId as string;
        setTimeout(() => {
          navigationRef.current?.navigate('PlantDetail', {plantId});
        }, 500);
      }
    });

    const handleDeepLink = async (url: string | null) => {
      if (!url) {return;}

      // Email confirmation: thryveo://confirm#access_token=xxx&refresh_token=yyy&type=signup
      // Supabase redirects here after the user taps the confirmation link in their inbox.
      // Calling setSession() with the tokens signs the user in automatically.
      if (url.startsWith('thryveo://confirm')) {
        const fragment = url.includes('#') ? url.split('#')[1] : url.split('?')[1] ?? '';
        if (fragment) {
          const params = new URLSearchParams(fragment);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          if (accessToken && refreshToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            // onAuthStateChange fires SIGNED_IN → session becomes non-null →
            // AppNavigator switches to the app stack automatically. No manual navigation needed.
          }
        }
        return;
      }

      // Password reset: thryveo://reset-password#access_token=xxx&refresh_token=yyy&type=recovery
      // Supabase sends the tokens in the URL fragment after verifying the reset link.
      if (url.startsWith('thryveo://reset-password')) {
        const fragment = url.includes('#') ? url.split('#')[1] : url.split('?')[1] ?? '';
        if (fragment) {
          const params = new URLSearchParams(fragment);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          const type = params.get('type');
          if (type === 'recovery' && accessToken && refreshToken) {
            // Sets the session AND flags isPasswordRecovery=true so the navigator
            // renders SetNewPassword as the only screen. We can't rely on the
            // PASSWORD_RECOVERY onAuthStateChange event because detectSessionInUrl
            // is disabled in React Native.
            await enterRecoveryMode(accessToken, refreshToken);
          }
        }
        return;
      }

      // Plant deep link from widget: thryveo://plant/{plantId}
      const match = url.match(/^thryveo:\/\/plant\/(.+)$/);
      if (match) {
        setTimeout(() => {
          navigationRef.current?.navigate('PlantDetail', {plantId: match[1]});
        }, 300);
      }
    };

    Linking.getInitialURL().then(handleDeepLink);
    const linkingSubscription = Linking.addEventListener('url', ({url}) =>
      handleDeepLink(url),
    );

    return () => {
      unsubscribe();
      linkingSubscription.remove();
    };
  }, []);

  // Show a spinner while the persisted session is being loaded from storage
  if (loading) {
    return (
      <View style={{flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator size="large" color="#1A1A1A" />
      </View>
    );
  }

  if (status.state !== 'ok') {
    return (
      <>
        {status.state === 'loading' && <ForceUpdateGate type="loading" />}
        {status.state === 'no_internet' && (
          <ForceUpdateGate type="no_internet" onRetry={retry} />
        )}
        {status.state === 'update_required' && (
          <ForceUpdateGate type="update_required" config={status.config} />
        )}
      </>
    );
  }

  const stackOptions = {
    headerStyle: {backgroundColor: '#FFFFFF'},
    headerTintColor: '#111111',
    headerTitleStyle: {
      fontWeight: '700' as const,
      fontFamily: 'serif',
      fontSize: 20,
      color: '#111111',
    },
    contentStyle: {backgroundColor: '#FFFFFF'},
  };

  return (
    <NavigationContainer ref={navigationRef}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Stack.Navigator screenOptions={stackOptions}>
        {session ? (
          // ── Authenticated app screens ─────────────────────────────────────
          // When in password-recovery mode the navigator only contains
          // SetNewPassword, so React Navigation lands there automatically.
          // Once updatePassword() clears isPasswordRecovery the full stack
          // is restored and the user reaches Home.
          isPasswordRecovery ? (
            <Stack.Screen
              name="SetNewPassword"
              component={SetNewPasswordScreen}
              options={{headerShown: false}}
            />
          ) : (
            <>
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
              <Stack.Screen
                name="Support"
                component={SupportScreen}
                options={{title: 'Support'}}
              />
              <Stack.Screen
                name="SetNewPassword"
                component={SetNewPasswordScreen}
                options={{title: 'Set New Password'}}
              />
            </>
          )
        ) : (
          // ── Auth screens (shown when signed out) ──────────────────────────
          <>
            <Stack.Screen
              name="SignIn"
              component={SignInScreen}
              options={{headerShown: false}}
            />
            <Stack.Screen
              name="SignUp"
              component={SignUpScreen}
              options={{headerShown: false}}
            />
            <Stack.Screen
              name="ForgotPassword"
              component={ForgotPasswordScreen}
              options={{headerShown: false}}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

export default App;

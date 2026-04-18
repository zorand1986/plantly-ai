/**
 * @format
 */

// Must be imported before any Supabase or fetch-dependent code.
// @supabase/supabase-js uses the URL class internally; React Native doesn't
// provide a spec-compliant implementation without this polyfill.
import 'react-native-url-polyfill/auto';

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);

// Headless task: process widget waterings, reschedule notifications, and
// refresh the widget — in that order. Running these serially (rather than
// as two parallel services) guarantees that reschedule never races with
// processPendingWaterings on the same plant, which would otherwise create
// duplicate notifee triggers.
// Triggered by BootReceiver (on boot) and PeriodicWidgetSyncReceiver (every
// 8h) via BootWidgetSyncService.
AppRegistry.registerHeadlessTask('SyncWidget', () => async () => {
  const {processPendingWaterings, syncWidget} = require('./src/utils/widgetSync');
  const {rescheduleAllNotifications} = require('./src/utils/notifications');
  await processPendingWaterings();
  await rescheduleAllNotifications();
  await syncWidget();
});

// Headless task: immediately cancel a plant's scheduled notification when
// it is watered directly from the widget, before the alarm has a chance to fire.
// Triggered by WaterPlantReceiver → WidgetWaterService on Android.
AppRegistry.registerHeadlessTask('CancelWateringNotification', () => async ({notificationId}) => {
  if (notificationId) {
    const notifee = require('@notifee/react-native').default;
    try {
      await notifee.cancelNotification(notificationId);
    } catch {}
  }
});

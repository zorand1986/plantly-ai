/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);

// Headless task: reschedule all plant notifications after device reboot.
// Triggered by BootReceiver → BootTaskService on Android.
AppRegistry.registerHeadlessTask('RescheduleNotifications', () => async () => {
  const {rescheduleAllNotifications} = require('./src/utils/notifications');
  await rescheduleAllNotifications();
});

// Headless task: sync widget data after device reboot so the widget is
// populated without the user having to open the app first.
// Triggered by BootReceiver → BootWidgetSyncService on Android.
AppRegistry.registerHeadlessTask('SyncWidget', () => async () => {
  const {processPendingWaterings, syncWidget} = require('./src/utils/widgetSync');
  await processPendingWaterings();
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

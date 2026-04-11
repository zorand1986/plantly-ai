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

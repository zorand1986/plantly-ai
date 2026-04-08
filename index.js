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

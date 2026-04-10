import React from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {ForceUpdateConfig} from '../utils/forceUpdate';

type Props =
  | {type: 'loading'}
  | {type: 'no_internet'; onRetry: () => void}
  | {type: 'update_required'; config: ForceUpdateConfig};

export const ForceUpdateGate: React.FC<Props> = props => {
  const openStore = (config: ForceUpdateConfig) => {
    const url =
      Platform.OS === 'ios' ? config.store_url_ios : config.store_url_android;
    Linking.openURL(url);
  };

  return (
    <Modal
      visible
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {}}>
      <View style={styles.container}>
        <Text style={styles.emoji}>🪴</Text>

        {props.type === 'loading' && (
          <>
            <Text style={styles.title}>Starting up…</Text>
            <ActivityIndicator
              size="large"
              color="#388e3c"
              style={styles.spinner}
            />
          </>
        )}

        {props.type === 'no_internet' && (
          <>
            <Text style={styles.title}>No Internet Connection</Text>
            <Text style={styles.message}>
              An internet connection is required to use this app.
            </Text>
            <TouchableOpacity
              style={styles.button}
              activeOpacity={0.8}
              onPress={props.onRetry}>
              <Text style={styles.buttonText}>Try Again</Text>
            </TouchableOpacity>
          </>
        )}

        {props.type === 'update_required' && (
          <>
            <Text style={styles.title}>Update Required</Text>
            <Text style={styles.message}>{props.config.update_message}</Text>
            <TouchableOpacity
              style={styles.button}
              activeOpacity={0.8}
              onPress={() => openStore(props.config)}>
              <Text style={styles.buttonText}>Update Now</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f8e9',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emoji: {
    fontSize: 72,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1b5e20',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: '#4a4a4a',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  spinner: {
    marginTop: 16,
  },
  button: {
    backgroundColor: '#388e3c',
    borderRadius: 24,
    paddingHorizontal: 36,
    paddingVertical: 14,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});

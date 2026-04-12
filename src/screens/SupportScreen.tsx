import React from 'react';
import {
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

const BMAC_URL = 'https://buymeacoffee.com/zordam';

const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

export const SupportScreen: React.FC = () => {
  const handlePress = () => {
    Linking.openURL(BMAC_URL);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.emoji}>☕</Text>
          <Text style={styles.title}>Buy Me a Coffee</Text>
          <Text style={styles.message}>
            I build and maintain this app in my free time, and I'm committed to
            keeping it free for everyone.
            {'\n\n'}
            If it makes your plant care a little easier, I'd truly appreciate a
            small contribution — it keeps me motivated and the app going.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={handlePress}
            activeOpacity={0.85}>
            <Text style={styles.buttonEmoji}>☕</Text>
            <Text style={styles.buttonText}>Support on Buy Me a Coffee</Text>
          </TouchableOpacity>
          <Text style={styles.link}>buymeacoffee.com/zordam</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111111',
    fontFamily: SERIF,
    letterSpacing: 0.3,
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: '#555555',
    lineHeight: 23,
    textAlign: 'center',
    marginBottom: 28,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFDD00',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 10,
    marginBottom: 14,
    width: '100%',
    justifyContent: 'center',
  },
  buttonEmoji: {
    fontSize: 20,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: 0.2,
  },
  link: {
    fontSize: 12,
    color: '#BBBBBB',
    letterSpacing: 0.3,
  },
});

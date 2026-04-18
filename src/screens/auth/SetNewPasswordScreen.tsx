import React, {useState} from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useAuth} from '../../utils/auth';
import {RootStackParamList} from '../../../App';
import {PasswordInput} from '../../components/PasswordInput';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'SetNewPassword'>;

export const SetNewPasswordScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const {updatePassword} = useAuth();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSave = async () => {
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await updatePassword(password);
      setDone(true);
    } catch (e: any) {
      const msg: string = e?.message ?? '';
      if (msg.toLowerCase().includes('different from the old password') || msg.toLowerCase().includes('should be different')) {
        setError('This is the same as your current password. Please choose a new one.');
      } else {
        setError(msg || 'Could not update password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.doneWrap}>
          <Text style={styles.doneEmoji}>✅</Text>
          <Text style={styles.doneTitle}>Password updated</Text>
          <Text style={styles.doneSubtitle}>
            Your new password is active. You're still signed in.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Home')}
            activeOpacity={0.8}>
            <Text style={styles.primaryButtonText}>Go to My Plants</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.emoji}>🔐</Text>
            <Text style={styles.title}>Set new password</Text>
            <Text style={styles.subtitle}>Choose a strong password for your account</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>New Password</Text>
            <PasswordInput
              value={password}
              onChangeText={setPassword}
              placeholder="At least 6 characters"
              placeholderTextColor="#BBBBBB"
              autoComplete="password-new"
              returnKeyType="next"
            />

            <Text style={styles.label}>Confirm Password</Text>
            <PasswordInput
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Repeat your new password"
              placeholderTextColor="#BBBBBB"
              autoComplete="password-new"
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
              onPress={handleSave}
              disabled={loading}
              activeOpacity={0.8}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Save Password</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#FFFFFF'},
  flex: {flex: 1},
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 36,
    marginTop: 20,
  },
  emoji: {fontSize: 52, marginBottom: 12},
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111111',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    marginBottom: 6,
  },
  subtitle: {fontSize: 15, color: '#999999', textAlign: 'center'},
  form: {marginBottom: 24},
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555555',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#111111',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  errorText: {
    color: '#CC3333',
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  primaryButtonDisabled: {backgroundColor: '#888888'},
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  doneWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  doneEmoji: {fontSize: 52, marginBottom: 16},
  doneTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111111',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    marginBottom: 12,
  },
  doneSubtitle: {
    fontSize: 15,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
});

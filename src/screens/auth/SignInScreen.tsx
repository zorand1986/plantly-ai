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

type NavProp = NativeStackNavigationProp<RootStackParamList, 'SignIn'>;

export const SignInScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const {signIn} = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignIn = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await signIn(email, password);
      // AuthProvider updates session → App.tsx swaps to app stack automatically
    } catch (e: any) {
      setError(friendlyError(e?.message));
    } finally {
      setLoading(false);
    }
  };

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
            <Text style={styles.emoji}>🪴</Text>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to your account</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#BBBBBB"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              returnKeyType="next"
            />

            <Text style={styles.label}>Password</Text>
            <PasswordInput
              value={password}
              onChangeText={setPassword}
              placeholder="Your password"
              placeholderTextColor="#BBBBBB"
              autoComplete="password"
              returnKeyType="done"
              onSubmitEditing={handleSignIn}
            />

            <TouchableOpacity
              onPress={() => navigation.navigate('ForgotPassword')}
              activeOpacity={0.7}
              style={styles.forgotWrap}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
              onPress={handleSignIn}
              disabled={loading}
              activeOpacity={0.8}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('SignUp')}
              activeOpacity={0.7}>
              <Text style={styles.footerLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

function friendlyError(message?: string): string {
  if (!message) return 'Something went wrong. Please try again.';
  if (message.includes('Invalid login credentials')) {
    return 'Incorrect email or password.';
  }
  if (message.includes('Email not confirmed')) {
    return 'Please confirm your email address before signing in.';
  }
  if (message.includes('Too many requests')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  return message;
}

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
  subtitle: {fontSize: 15, color: '#999999'},
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
  // PasswordInput has its own wrapper style; this remains for the email field
  forgotWrap: {alignSelf: 'flex-end', marginTop: -8, marginBottom: 20},
  forgotText: {fontSize: 13, color: '#555555'},
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
    alignItems: 'center',
  },
  primaryButtonDisabled: {backgroundColor: '#888888'},
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  footerText: {fontSize: 14, color: '#999999'},
  footerLink: {fontSize: 14, color: '#1A1A1A', fontWeight: '600'},
});

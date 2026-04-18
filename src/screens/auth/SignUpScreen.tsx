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

type NavProp = NativeStackNavigationProp<RootStackParamList, 'SignUp'>;

export const SignUpScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const {signUp} = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const handleSignUp = async () => {
    setError('');
    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const {needsConfirmation} = await signUp(name, email, password);
      if (needsConfirmation) {
        // Email confirmation is enabled in Supabase — tell the user to check inbox
        setConfirmed(true);
      }
      // If needsConfirmation is false, session is set and App.tsx navigates automatically
    } catch (e: any) {
      setError(friendlyError(e?.message));
    } finally {
      setLoading(false);
    }
  };

  if (confirmed) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.confirmWrap}>
          <Text style={styles.confirmEmoji}>📬</Text>
          <Text style={styles.confirmTitle}>Check your email</Text>
          <Text style={styles.confirmSubtitle}>
            We sent a confirmation link to{'\n'}
            <Text style={styles.confirmEmail}>{email}</Text>
            {'\n\n'}Open it to activate your account, then sign in.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('SignIn')}
            activeOpacity={0.8}>
            <Text style={styles.primaryButtonText}>Go to Sign In</Text>
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
            <Text style={styles.emoji}>🌱</Text>
            <Text style={styles.title}>Create account</Text>
            <Text style={styles.subtitle}>Back up your plants across devices</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor="#BBBBBB"
              autoCapitalize="words"
              autoCorrect={false}
              autoComplete="name"
              returnKeyType="next"
            />

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
              placeholder="At least 6 characters"
              placeholderTextColor="#BBBBBB"
              autoComplete="password-new"
              returnKeyType="done"
              onSubmitEditing={handleSignUp}
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
              onPress={handleSignUp}
              disabled={loading}
              activeOpacity={0.8}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('SignIn')}
              activeOpacity={0.7}>
              <Text style={styles.footerLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

function friendlyError(message?: string): string {
  if (!message) return 'Something went wrong. Please try again.';
  if (message.includes('already registered') || message.includes('already been registered')) {
    return 'An account with this email already exists.';
  }
  if (message.includes('Password should be')) {
    return 'Password must be at least 6 characters.';
  }
  if (message.includes('valid email')) {
    return 'Please enter a valid email address.';
  }
  return message;
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#FFFFFF'},
  flex: {flex: 1},
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {fontSize: 14, color: '#999999'},
  footerLink: {fontSize: 14, color: '#1A1A1A', fontWeight: '600'},
  confirmWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  confirmEmoji: {fontSize: 52, marginBottom: 16},
  confirmTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111111',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    marginBottom: 12,
  },
  confirmSubtitle: {
    fontSize: 15,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  confirmEmail: {fontWeight: '600', color: '#111111'},
});

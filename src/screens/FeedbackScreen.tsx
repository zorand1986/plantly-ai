import React, {useState} from 'react';
import {
  Alert,
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
import {version as appVersion} from '../../package.json';
import {supabase} from '../utils/supabase';
import {useAuth} from '../utils/auth';

type Category = 'problem' | 'feature' | 'other';

const CATEGORIES: {id: Category; label: string}[] = [
  {id: 'problem', label: 'Report a problem'},
  {id: 'feature', label: 'Feature request'},
  {id: 'other', label: 'Other'},
];

const PLACEHOLDERS: Record<Category, string> = {
  problem: 'Describe what happened and how to reproduce it…',
  feature: 'Describe your idea…',
  other: 'Your message…',
};

export const FeedbackScreen: React.FC = () => {
  const {user} = useAuth();
  const [category, setCategory] = useState<Category>('problem');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) {
      Alert.alert('Message required', 'Please describe your issue or idea.');
      return;
    }
    setSubmitting(true);
    const {error} = await supabase.from('feedback').insert({
      user_id: user?.id ?? null,
      user_email: user?.email ?? null,
      category,
      message: message.trim(),
      app_version: appVersion,
      platform: Platform.OS,
    });
    setSubmitting(false);
    if (error) {
      Alert.alert('Error', 'Could not send feedback. Please try again.');
      return;
    }
    setSubmitted(true);
    setMessage('');
  };

  if (submitted) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.successContainer}>
          <Text style={styles.successEmoji}>✓</Text>
          <Text style={styles.successTitle}>Thank you!</Text>
          <Text style={styles.successMessage}>
            Your feedback has been received. I read every submission personally.
          </Text>
          <TouchableOpacity
            style={styles.anotherButton}
            onPress={() => {
              setSubmitted(false);
              setCategory('problem');
            }}
            activeOpacity={0.8}>
            <Text style={styles.anotherButtonText}>Send another</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={88}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.cardTitle}>What's on your mind?</Text>
            <Text style={styles.cardSubtitle}>
              All feedback goes directly to the developer.
            </Text>

            <View style={styles.categoryRow}>
              {CATEGORIES.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    styles.categoryBtn,
                    category === c.id && styles.categoryBtnActive,
                  ]}
                  onPress={() => setCategory(c.id)}
                  activeOpacity={0.7}>
                  <Text
                    style={[
                      styles.categoryBtnText,
                      category === c.id && styles.categoryBtnTextActive,
                    ]}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.textInput}
              placeholder={PLACEHOLDERS[category]}
              placeholderTextColor="#BBBBBB"
              value={message}
              onChangeText={setMessage}
              multiline
              textAlignVertical="top"
              maxLength={2000}
            />
            <Text style={styles.charCount}>{message.length} / 2000</Text>

            <TouchableOpacity
              style={[
                styles.submitButton,
                submitting && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.8}>
              <Text style={styles.submitButtonText}>
                {submitting ? 'Sending…' : 'Send'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  flex: {
    flex: 1,
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 4,
    letterSpacing: 0.1,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#999999',
    marginBottom: 20,
    lineHeight: 18,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  categoryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
  },
  categoryBtnActive: {
    backgroundColor: '#1A1A1A',
  },
  categoryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555555',
  },
  categoryBtnTextActive: {
    color: '#FFFFFF',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: '#111111',
    minHeight: 140,
    backgroundColor: '#FAFAFA',
  },
  charCount: {
    fontSize: 11,
    color: '#CCCCCC',
    textAlign: 'right',
    marginTop: 6,
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#AAAAAA',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  // Success state
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  successEmoji: {
    fontSize: 48,
    color: '#2B5F2B',
    fontWeight: '700',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 12,
  },
  successMessage: {
    fontSize: 15,
    color: '#555555',
    lineHeight: 23,
    textAlign: 'center',
    marginBottom: 32,
  },
  anotherButton: {
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 28,
  },
  anotherButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555555',
  },
});

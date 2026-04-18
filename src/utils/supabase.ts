import {createClient} from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Anon (public) key — safe to embed in client code.
// Security is enforced by Supabase Row Level Security policies, not key secrecy.
const SUPABASE_URL = 'https://bcvwisuhwgjyzopdnllp.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjdndpc3Vod2dqeXpvcGRubGxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0OTg0MjgsImV4cCI6MjA5MjA3NDQyOH0.X9np_qnnVY8IAxM_FyCYj6VBHDIB063qKmLtIou20-w';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

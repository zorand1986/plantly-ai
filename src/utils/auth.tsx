import React, {createContext, useContext, useEffect, useState} from 'react';
import {Session, User} from '@supabase/supabase-js';
import {supabase} from './supabase';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  /** True while the initial session is being loaded from storage */
  loading: boolean;
  /** True when the app was opened from a password-reset email link */
  isPasswordRecovery: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<{needsConfirmation: boolean}>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  /** Call this when the app handles a thryveo://reset-password deep link */
  enterRecoveryMode: (accessToken: string, refreshToken: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({children}: {children: React.ReactNode}) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    // Restore persisted session from AsyncStorage
    supabase.auth.getSession().then(({data}) => {
      setSession(data.session);
      setLoading(false);
    });

    // Keep session in sync with Supabase auth state changes.
    // PASSWORD_RECOVERY fires when the app processes a reset-password deep link
    // (after supabase.auth.setSession is called with the recovery tokens).
    const {data: {subscription}} = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        setSession(newSession);
        if (event === 'PASSWORD_RECOVERY') {
          setIsPasswordRecovery(true);
        }
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string): Promise<void> => {
    const {error} = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) {throw error;}
  };

  const signUp = async (
    name: string,
    email: string,
    password: string,
  ): Promise<{needsConfirmation: boolean}> => {
    const {data, error} = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {full_name: name.trim()},
        // After the user clicks the confirmation link, Supabase redirects here.
        // The app intercepts it via the thryveo://confirm intent filter and
        // calls setSession() with the tokens in the URL fragment.
        emailRedirectTo: 'thryveo://confirm',
      },
    });
    if (error) {throw error;}

    if (data.user) {
      await supabase
        .from('user_data')
        .upsert({id: data.user.id}, {onConflict: 'id'});
    }

    return {needsConfirmation: !data.session};
  };

  const signOut = async (): Promise<void> => {
    const {error} = await supabase.auth.signOut();
    if (error) {throw error;}
  };

  const resetPassword = async (email: string): Promise<void> => {
    const {error} = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      // Redirects back into the app; must be in Supabase allowed redirect URLs
      {redirectTo: 'thryveo://reset-password'},
    );
    if (error) {throw error;}
  };

  const updatePassword = async (newPassword: string): Promise<void> => {
    const {error} = await supabase.auth.updateUser({password: newPassword});
    if (error) {throw error;}
    setIsPasswordRecovery(false);
  };

  // detectSessionInUrl is false in React Native (URL class unavailable), so
  // Supabase never fires PASSWORD_RECOVERY from onAuthStateChange. We set the
  // session ourselves and manually flag recovery mode.
  const enterRecoveryMode = async (
    accessToken: string,
    refreshToken: string,
  ): Promise<void> => {
    const {error} = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) {throw error;}
    setIsPasswordRecovery(true);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        isPasswordRecovery,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updatePassword,
        enterRecoveryMode,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be called inside <AuthProvider>');
  }
  return ctx;
}

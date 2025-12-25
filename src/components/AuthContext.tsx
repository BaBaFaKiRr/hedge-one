import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isLoggedOutRef = React.useRef(false);

  useEffect(() => {
    let isMounted = true;

    // Check for existing session on mount
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error checking session:', error);
          if (isMounted) {
            setIsLoading(false);
          }
          return;
        }

        if (isMounted) {
          if (session?.user && !isLoggedOutRef.current) {
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
            });
            setAccessToken(session.access_token);
          } else {
            // Explicitly clear state if no session or if we're logged out
            setUser(null);
            setAccessToken(null);
            isLoggedOutRef.current = false; // Reset flag after clearing
          }
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error checking session:', error);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    checkSession();

    // Listen for auth state changes (for OAuth callbacks)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (event === 'SIGNED_IN' && session?.user) {
        // Only auto-signin if not explicitly logged out
        if (!isLoggedOutRef.current) {
          isLoggedOutRef.current = false; // Reset flag on successful sign-in
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
          });
          setAccessToken(session.access_token);
        }
        setIsLoading(false);
      } else if (event === 'SIGNED_OUT') {
        // Explicitly clear all state on sign out
        isLoggedOutRef.current = true;
        setUser(null);
        setAccessToken(null);
        setIsLoading(false);
      } else if (event === 'TOKEN_REFRESHED' && session?.user && !isLoggedOutRef.current) {
        // Update token on refresh only if user is still logged in
        setAccessToken(session.access_token);
      } else if (!session) {
        // If session is null for any other reason, clear state
        setUser(null);
        setAccessToken(null);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Login error:', error);
        throw new Error(error.message);
      }

      if (data?.user && data?.session) {
        // Reset logout flag on successful login
        isLoggedOutRef.current = false;
        setUser({
          id: data.user.id,
          email: data.user.email || '',
          name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'User',
        });
        setAccessToken(data.session.access_token);
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const signup = async (email: string, password: string, name: string) => {
    try {
      // Call server signup endpoint
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4fc01492/signup`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ email, password, name }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        // If user already exists, throw a special error with the code
        if (result.code === 'user_exists') {
          const error = new Error(result.error || 'User already exists');
          (error as any).code = 'user_exists';
          throw error;
        }
        throw new Error(result.error || 'Failed to sign up');
      }

      // After successful signup, log the user in
      await login(email, password);
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}`,
        },
      });

      if (error) {
        console.error('Google sign-in error:', error);
        throw new Error(error.message);
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Set logout flag immediately to prevent auto-signin
      isLoggedOutRef.current = true;
      
      // Clear state immediately to prevent race conditions
      setUser(null);
      setAccessToken(null);
      
      // Sign out from Supabase (this will clear cookies/localStorage)
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      
      if (error) {
        console.error('Logout error:', error);
        // Even if signOut fails, we've already cleared local state
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Ensure state is cleared even if there's an error
      isLoggedOutRef.current = true;
      setUser(null);
      setAccessToken(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        login,
        signup,
        signInWithGoogle,
        logout,
        isAuthenticated: !!user,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

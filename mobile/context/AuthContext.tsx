import React, { createContext, useState, useEffect, useContext } from 'react';
import { tokenStorage } from '../utils/storage';
import { API_URL } from '../utils/api';

export interface UserSession {
  _id: string;
  name: string;
  email: string;
  phoneNumber: string;
  token: string;
}

interface AuthContextType {
  user: UserSession | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, phoneNumber: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load storage session on startup
  useEffect(() => {
    const loadSession = async () => {
      try {
        const storedSession = await tokenStorage.getItem('user_session');
        if (storedSession) {
          const parsed = JSON.parse(storedSession);
          if (parsed && parsed.token) {
            setUser(parsed);
          }
        }
      } catch (error) {
        console.warn('[AuthContext] Failed to load user session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to sign in');
      }

      const sessionData: UserSession = data;
      await tokenStorage.setItem('user_session', JSON.stringify(sessionData));
      setUser(sessionData);
    } catch (error: any) {
      console.error('[AuthContext] SignIn Error:', error);
      throw error;
    }
  };

  const signUp = async (name: string, email: string, phoneNumber: string, password: string) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, phoneNumber, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to sign up');
      }

      const sessionData: UserSession = data;
      await tokenStorage.setItem('user_session', JSON.stringify(sessionData));
      setUser(sessionData);
    } catch (error: any) {
      console.error('[AuthContext] SignUp Error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await tokenStorage.removeItem('user_session');
      setUser(null);
    } catch (error) {
      console.error('[AuthContext] SignOut Error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile } from '../types';
import { pagosAuthService } from '../services/authService';

interface PagosUser {
  id: string;
  email: string;
}

interface PagosAuthContextType {
  user: PagosUser | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, location: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const PagosAuthContext = createContext<PagosAuthContextType | undefined>(undefined);

export const PagosAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<PagosUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async () => {
    try {
      const token = pagosAuthService.getAuthToken();
      if (!token) {
        setProfile(null);
        setUser(null);
        return;
      }

      const userProfile = await pagosAuthService.getUserProfile();
      if (userProfile) {
        setProfile(userProfile);
        setUser({ id: userProfile.id, email: userProfile.email });
      } else {
        setProfile(null);
        setUser(null);
      }
    } catch (error) {
      console.error('Error loading pagos profile:', error);
      setProfile(null);
      setUser(null);
    }
  };

  useEffect(() => {
    loadProfile().finally(() => setLoading(false));
  }, []);

  const signIn = async (email: string, password: string) => {
    const data = await pagosAuthService.signIn(email, password);
    setUser(data.user);
    await loadProfile();
  };

  const signUp = async (email: string, password: string, fullName: string, location: string) => {
    const data = await pagosAuthService.signUp(email, password, fullName, location);
    setUser(data.user);
    await loadProfile();
  };

  const signOut = async () => {
    await pagosAuthService.signOut();
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    await loadProfile();
  };

  return (
    <PagosAuthContext.Provider
      value={{ user, profile, loading, signIn, signUp, signOut, refreshProfile }}
    >
      {children}
    </PagosAuthContext.Provider>
  );
};

export const usePagosAuth = () => {
  const context = useContext(PagosAuthContext);
  if (!context) {
    throw new Error('usePagosAuth must be used within PagosAuthProvider');
  }
  return context;
};

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
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
  isInfraAdminAccess: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, location: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const PagosAuthContext = createContext<PagosAuthContextType | undefined>(undefined);

const buildAdminPagosProfile = (
  userId: string,
  email: string,
  fullName: string
): UserProfile => ({
  id: userId,
  email,
  fullName,
  role: 'area_coordinator',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const PagosAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user: mainUser, profile: mainProfile, loading: mainLoading } = useAuth();
  const [user, setUser] = useState<PagosUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInfraAdminAccess, setIsInfraAdminAccess] = useState(false);

  const applyInfraAdminSession = useCallback(() => {
    if (!mainUser || mainProfile?.role !== 'admin') {
      return false;
    }

    setIsInfraAdminAccess(true);
    setUser({ id: mainUser.id, email: mainUser.email ?? '' });
    setProfile(buildAdminPagosProfile(mainUser.id, mainUser.email ?? '', mainProfile.full_name));
    return true;
  }, [mainUser, mainProfile]);

  const loadPagosProfile = useCallback(async () => {
    const token = pagosAuthService.getAuthToken();
    if (!token) {
      setProfile(null);
      setUser(null);
      setIsInfraAdminAccess(false);
      return;
    }

    setIsInfraAdminAccess(false);
    const userProfile = await pagosAuthService.getUserProfile();
    if (userProfile) {
      setProfile(userProfile);
      setUser({ id: userProfile.id, email: userProfile.email });
    } else {
      setProfile(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    if (mainLoading) return;

    const init = async () => {
      if (pagosAuthService.hasPagosSession()) {
        await loadPagosProfile();
      } else if (!applyInfraAdminSession()) {
        setProfile(null);
        setUser(null);
        setIsInfraAdminAccess(false);
      }
      setLoading(false);
    };

    init();
  }, [mainLoading, mainUser, mainProfile, loadPagosProfile, applyInfraAdminSession]);

  const signIn = async (email: string, password: string) => {
    const data = await pagosAuthService.signIn(email, password);
    setIsInfraAdminAccess(false);
    setUser(data.user);
    await loadPagosProfile();
  };

  const signUp = async (email: string, password: string, fullName: string, location: string) => {
    const data = await pagosAuthService.signUp(email, password, fullName, location);
    setIsInfraAdminAccess(false);
    setUser(data.user);
    await loadPagosProfile();
  };

  const signOut = async () => {
    if (isInfraAdminAccess) {
      setUser(null);
      setProfile(null);
      setIsInfraAdminAccess(false);
      return;
    }
    await pagosAuthService.signOut();
    setUser(null);
    setProfile(null);
    setIsInfraAdminAccess(false);
  };

  const refreshProfile = async () => {
    if (isInfraAdminAccess) {
      applyInfraAdminSession();
      return;
    }
    await loadPagosProfile();
  };

  return (
    <PagosAuthContext.Provider
      value={{
        user,
        profile,
        loading: loading || mainLoading,
        isInfraAdminAccess,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
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

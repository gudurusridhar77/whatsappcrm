import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/auth';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, accountName: string) => Promise<void>;
  logout: () => void;
  currentAccountId: number | null;
  setCurrentAccountId: (id: number) => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentAccountId, setCurrentAccountId] = useState<number | null>(null);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const response = await authApi.getMe();
      setUser(response.data);
      if (response.data.accounts.length > 0 && !currentAccountId) {
        setCurrentAccountId(response.data.accounts[0].accountId);
      }
    } catch {
      localStorage.clear();
    } finally {
      setLoading(false);
    }
  }, [currentAccountId]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
    const { accessToken, refreshToken, user: userData } = response.data;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setUser(userData);
    if (userData.accounts.length > 0) {
      setCurrentAccountId(userData.accounts[0].accountId);
    }
  };

  const signup = async (name: string, email: string, password: string, accountName: string) => {
    const response = await authApi.signup({ name, email, password, accountName });
    const { accessToken, refreshToken, user: userData } = response.data;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setUser(userData);
    if (userData.accounts.length > 0) {
      setCurrentAccountId(userData.accounts[0].accountId);
    }
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
    setCurrentAccountId(null);
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, currentAccountId, setCurrentAccountId, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

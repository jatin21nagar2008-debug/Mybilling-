import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api.js';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [business, setBusiness] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('billingpro_token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const storedToken = localStorage.getItem('billingpro_token');
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await authApi.getCurrentUser();
        if (res.success) {
          setUser(res.user);
          setBusiness(res.business);
        }
      } catch (error) {
        console.error('Session restore failed:', error);
        localStorage.removeItem('billingpro_token');
        setUser(null);
        setBusiness(null);
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, []);

  const login = async (credentials) => {
    setIsLoading(true);
    try {
      const res = await authApi.login(credentials);
      if (res.success && res.token) {
        localStorage.setItem('billingpro_token', res.token);
        setToken(res.token);
        setUser(res.user);
        setBusiness(res.business);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authApi.logout();
    } finally {
      localStorage.removeItem('billingpro_token');
      setUser(null);
      setBusiness(null);
      setToken(null);
      setIsLoading(false);
    }
  };

  const updateBusinessLocally = (updated) => {
    setBusiness((prev) => (prev ? { ...prev, ...updated } : null));
  };

  const role = user?.role;
  const isCustomer = role === 'CUSTOMER';
  const isMasterAdmin = role === 'MASTER_ADMIN';
  const isAdmin = isMasterAdmin || role === 'ADMIN';
  const isManager = isMasterAdmin || role === 'MANAGER' || isAdmin;
  const isCashier = isMasterAdmin || role === 'CASHIER' || isManager;

  return (
    <AuthContext.Provider
      value={{
        user,
        business,
        token,
        isLoading,
        login,
        logout,
        updateBusinessLocally,
        isCustomer,
        isMasterAdmin,
        isAdmin,
        isManager,
        isCashier,
      }}
    >
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

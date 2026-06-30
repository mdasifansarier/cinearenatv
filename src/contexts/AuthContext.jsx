import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('cinearena_user');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch {
        setCurrentUser(null);
      }
    }
  }, []);

  const login = useCallback(async (username, password) => {
    if (username && password) {
      const user = { username, expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) };
      setCurrentUser(user);
      localStorage.setItem('cinearena_user', JSON.stringify(user));
      setIsLoginOpen(false);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('cinearena_user');
    setCurrentUser(null);
  }, []);

  const openLogin = useCallback(() => setIsLoginOpen(true), []);
  const closeLogin = useCallback(() => setIsLoginOpen(false), []);

  return (
    <AuthContext.Provider value={{
      currentUser,
      isLoginOpen,
      login,
      logout,
      openLogin,
      closeLogin,
    }}>
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
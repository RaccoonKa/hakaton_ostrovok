import React, { createContext, useContext, useState, useEffect } from "react";
import { AuthUser, AuthSession, ClientAuthManager, LoginCredentials, RegisterCredentials } from "@corvax/shared";

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  login: (creds: LoginCredentials) => Promise<void>;
  register: (creds: RegisterCredentials) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<AuthSession | null>(() => ClientAuthManager.getCurrentSession());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    const current = ClientAuthManager.getCurrentSession();
    if (current) {
      setSession(current);
    }
  }, []);

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

  const login = async (creds: LoginCredentials) => {
    const newSession = await ClientAuthManager.login(creds);
    setSession(newSession);
    closeAuthModal();
  };

  const register = async (creds: RegisterCredentials) => {
    const newSession = await ClientAuthManager.register(creds);
    setSession(newSession);
    closeAuthModal();
  };

  const logout = () => {
    ClientAuthManager.logout();
    setSession(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user: session?.user || null,
        token: session?.token || null,
        isAuthenticated: Boolean(session?.user),
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User
} from "firebase/auth";

import { auth, isFirebaseConfigured } from "@/services/firebase";

type AuthContextValue = {
  user: User | null;
  initializing: boolean;
  firebaseReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const requireAuth = () => {
  if (!auth) {
    throw new Error("Firebase is not configured. Fill in .env with your Firebase web app keys.");
  }

  return auth;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    if (!auth) {
      setInitializing(false);
      return undefined;
    }

    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setInitializing(false);
    });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(requireAuth(), email.trim(), password);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const credential = await createUserWithEmailAndPassword(requireAuth(), email.trim(), password);
    await updateProfile(credential.user, { displayName: name.trim() });
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(requireAuth(), email.trim());
  }, []);

  const logout = useCallback(async () => {
    await signOut(requireAuth());
  }, []);

  const value = useMemo(
    () => ({
      user,
      initializing,
      firebaseReady: isFirebaseConfigured,
      login,
      register,
      resetPassword,
      logout
    }),
    [initializing, login, logout, register, resetPassword, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}

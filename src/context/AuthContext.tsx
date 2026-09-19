import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  fbSignOut, 
  updateProfile,
  sendPasswordResetEmail,
  db,
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  getDocs
} from '../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { UserProfile } from '../types';
import { DEFAULT_CATEGORIES, DEFAULT_WALLETS } from '../lib/constants';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInEmail: (email: string, pass: string) => Promise<void>;
  signUpEmail: (name: string, email: string, pass: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  updatePrimaryColor: (color: string) => Promise<void>;
  updateThemePreference: (theme: 'light' | 'dark' | 'system') => Promise<void>;
  updateFontPreference: (font: string) => Promise<void>;
  updateProfileData: (name: string, photoURL?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize initial user collections if new
  const checkAndInitUserData = async (user: User) => {
    const cacheKey = `myduit_profile_${user.uid}`;
    let cachedProfile: UserProfile | null = null;
    try {
      const saved = localStorage.getItem(cacheKey);
      if (saved) {
        cachedProfile = JSON.parse(saved);
      }
    } catch (_) {}

    const defaultProfile: UserProfile = cachedProfile || {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || 'Pengguna MyDuit',
      photoURL: user.photoURL,
      currency: 'IDR',
      primaryColor: '#10B981', // Emerald default
      theme: 'light',
      reminderEnabled: true,
      reminderTime: '20:00'
    };

    // Immediately set state from cache/default so UI renders without delay
    setUserProfile((prev) => prev || defaultProfile);

    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, defaultProfile);
        setUserProfile(defaultProfile);
        localStorage.setItem(cacheKey, JSON.stringify(defaultProfile));

        // Seed initial default wallets
        for (const w of DEFAULT_WALLETS) {
          await addDoc(collection(db, 'wallets'), {
            ...w,
            userId: user.uid,
            createdAt: Date.now(),
            updatedAt: Date.now()
          });
        }

        // Seed initial default categories
        for (const cat of DEFAULT_CATEGORIES) {
          await addDoc(collection(db, 'categories'), {
            ...cat,
            userId: user.uid,
            createdAt: Date.now()
          });
        }
      } else {
        const remoteProfile = userSnap.data() as UserProfile;
        setUserProfile(remoteProfile);
        localStorage.setItem(cacheKey, JSON.stringify(remoteProfile));
      }
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (err?.code === 'unavailable' || msg.includes('offline') || msg.includes('client is offline')) {
        console.warn('Firestore client in offline mode. Using local user state.');
      } else {
        console.warn('Notice loading user data from Firestore:', msg);
      }
      setUserProfile((prev) => prev || defaultProfile);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await checkAndInitUserData(user);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        await checkAndInitUserData(result.user);
      }
    } catch (error: any) {
      console.error('Google Sign In Error:', error);
      throw error;
    }
  };

  const signInEmail = async (email: string, pass: string) => {
    try {
      const res = await signInWithEmailAndPassword(auth, email, pass);
      if (res.user) {
        await checkAndInitUserData(res.user);
      }
    } catch (error: any) {
      console.error('Email Sign In Error:', error);
      throw error;
    }
  };

  const signUpEmail = async (name: string, email: string, pass: string) => {
    try {
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      if (res.user) {
        await updateProfile(res.user, { displayName: name });
        await checkAndInitUserData(res.user);
      }
    } catch (error: any) {
      console.error('Email Sign Up Error:', error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (error: any) {
      console.error('Reset Password Error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await fbSignOut(auth);
      setCurrentUser(null);
      setUserProfile(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const updatePrimaryColor = async (color: string) => {
    if (!currentUser) return;
    const cacheKey = `myduit_profile_${currentUser.uid}`;
    setUserProfile(prev => {
      const updated = prev ? { ...prev, primaryColor: color } : null;
      if (updated) localStorage.setItem(cacheKey, JSON.stringify(updated));
      return updated;
    });
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await setDoc(userRef, { primaryColor: color }, { merge: true });
    } catch (err) {
      console.warn('Sync primary color to cloud deferred:', err);
    }
  };

  const updateThemePreference = async (theme: 'light' | 'dark' | 'system') => {
    if (!currentUser) return;
    const cacheKey = `myduit_profile_${currentUser.uid}`;
    setUserProfile(prev => {
      const updated = prev ? { ...prev, theme } : null;
      if (updated) localStorage.setItem(cacheKey, JSON.stringify(updated));
      return updated;
    });
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await setDoc(userRef, { theme }, { merge: true });
    } catch (err) {
      console.warn('Sync theme to cloud deferred:', err);
    }
  };

  const updateFontPreference = async (fontFamily: string) => {
    if (!currentUser) return;
    const cacheKey = `myduit_profile_${currentUser.uid}`;
    setUserProfile(prev => {
      const updated = prev ? { ...prev, fontFamily } : null;
      if (updated) localStorage.setItem(cacheKey, JSON.stringify(updated));
      return updated;
    });
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await setDoc(userRef, { fontFamily }, { merge: true });
    } catch (err) {
      console.warn('Sync font to cloud deferred:', err);
    }
  };

  const updateProfileData = async (name: string, photoURL?: string) => {
    if (!currentUser) return;
    const cacheKey = `myduit_profile_${currentUser.uid}`;
    setUserProfile(prev => {
      const updated = prev ? { ...prev, displayName: name, ...(photoURL ? { photoURL } : {}) } : null;
      if (updated) localStorage.setItem(cacheKey, JSON.stringify(updated));
      return updated;
    });
    try {
      await updateProfile(currentUser, { displayName: name, photoURL: photoURL || currentUser.photoURL });
      const userRef = doc(db, 'users', currentUser.uid);
      await setDoc(userRef, { displayName: name, ...(photoURL ? { photoURL } : {}) }, { merge: true });
    } catch (err) {
      console.warn('Sync profile data to cloud deferred:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        signInWithGoogle,
        signInEmail,
        signUpEmail,
        resetPassword,
        logout,
        updatePrimaryColor,
        updateThemePreference,
        updateFontPreference,
        updateProfileData
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

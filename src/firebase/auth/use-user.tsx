
'use client';

import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { onAuthStateChanged, type User, signOut as firebaseSignOut, type Auth } from 'firebase/auth';
import { useFirebase } from '../provider';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  auth: Auth;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const useUser = () => {
  const { user, loading } = useAuth();
  return { user, loading };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const { auth } = useFirebase();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [auth]);

    const signOut = async () => {
        try {
            await firebaseSignOut(auth);
        } catch (error) {
            console.error("Error signing out: ", error);
        }
    };

    const value = useMemo(() => ({
        user,
        loading,
        signOut,
        auth,
    }), [user, loading, auth]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

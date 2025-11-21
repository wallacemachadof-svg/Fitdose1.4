
'use client';
import React, { createContext, useContext } from 'react';
import { app } from './config';
import { Auth, getAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';

interface FirebaseContextType {
    auth: Auth;
    db: Firestore;
}

const FirebaseContext = createContext<FirebaseContextType | null>(null);

export const FirebaseProvider = ({ children }: { children: React.ReactNode }) => {
    const auth = getAuth(app);
    const db = getFirestore(app);

    return (
        <FirebaseContext.Provider value={{ auth, db }}>
            {children}
        </FirebaseContext.Provider>
    );
};

export const useFirebase = () => {
    const context = useContext(FirebaseContext);
    if (!context) {
        throw new Error('useFirebase must be used within a FirebaseProvider');
    }
    return context;
};

// Add a new context for auth functions
interface AuthContextType {
    user: any;
    loading: boolean;
    signIn: (email: string, pass: string) => Promise<any>;
    signOut: () => Promise<void>;
    createUser: (email: string, pass: string) => Promise<any>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const useAuthContext = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuthContext must be used within an AuthProvider");
    }
    return context;
}

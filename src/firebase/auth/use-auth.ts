
'use client';
import { useContext } from 'react';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    signOut as firebaseSignOut
} from "firebase/auth";

import { useAuthContext, useFirebase } from '@/firebase/provider';


export const useAuth = () => {
    const context = useAuthContext();
    const { auth } = useFirebase();

    const signIn = async (email: string, pass: string) => {
        return signInWithEmailAndPassword(auth, email, pass);
    }

    const createUser = async (email: string, pass: string) => {
        return createUserWithEmailAndPassword(auth, email, pass);
    }
    
    const signOut = async () => {
        return firebaseSignOut(auth);
    }
    
    return { ...context, signIn, signOut, createUser };
}

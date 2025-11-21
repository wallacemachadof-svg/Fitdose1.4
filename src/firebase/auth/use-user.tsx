
'use client';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useFirebase } from '@/firebase/provider';
import { doc, getDoc } from 'firebase/firestore';

export interface UserProfile {
    uid: string;
    email?: string | null;
    displayName?: string | null;
    photoURL?: string | null;
    patientId?: string;
}

export const useUser = () => {
    const { auth, db } = useFirebase();
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setUser(user);
            if (user) {
                const userDocRef = doc(db, 'users', user.uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    setProfile(userDoc.data() as UserProfile);
                }
            } else {
                setProfile(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [auth, db]);

    return { user, profile, loading };
};


'use client';

import { initializeApp, getApp, getApps, type FirebaseOptions } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { firebaseConfig } from './config';

function initializeFirebase(config: FirebaseOptions) {
  if (getApps().length > 0) {
    return getApp();
  }
  return initializeApp(config);
}

export const firebaseApp = initializeFirebase(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const firestore = getFirestore(firebaseApp);

if (process.env.NEXT_PUBLIC_EMULATOR_HOST) {
    const host = process.env.NEXT_PUBLIC_EMULATOR_HOST;
    console.log(`Connecting to Firebase emulators on ${host}`);
    // Next.js fast refresh triggers this file multiple times, but connecting to emulators more than once throws an error.
    try {
        connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
        connectFirestoreEmulator(firestore, host, 8080);
    } catch (e: any) {
        if (e.code !== 'auth/emulator-config-failed') {
            console.error(e);
        }
    }
}


export * from './provider';
export * from './auth/use-user';

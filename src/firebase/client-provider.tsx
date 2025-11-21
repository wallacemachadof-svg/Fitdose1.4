
'use client';

import { FirebaseProvider } from './provider';

// This is a client-only wrapper to ensure Firebase is initialized once.
export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
    return <FirebaseProvider>{children}</FirebaseProvider>;
}

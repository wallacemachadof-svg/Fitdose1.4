
'use client';

import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export function PortalAuthGuard({ children }: { children: React.ReactNode }) {
    const { user, profile, loading } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push('/login');
            } else if (!profile?.patientId) {
                // This is an admin or other non-patient user, redirect them away from patient portal
                router.push('/dashboard');
            }
        }
    }, [user, profile, loading, router]);

    if (loading || !user || !profile?.patientId) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return <>{children}</>;
}

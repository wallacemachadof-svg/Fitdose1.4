'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { Loader2 } from 'lucide-react';
import { getPatientById } from '@/lib/actions';

const ADMIN_REDIRECT = '/dashboard';
const LOGIN_REDIRECT = '/login';

export function PortalAuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useUser();
  const [isPatient, setIsPatient] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (authLoading) {
      return; 
    }

    if (!user) {
      router.replace(LOGIN_REDIRECT);
      return;
    }

    const checkPatientStatus = async () => {
        try {
            const patientProfile = await getPatientById(user.uid);
            if (patientProfile) {
                setIsPatient(true);
            } else {
                setIsPatient(false);
                // This is not a patient, might be an admin trying to access patient portal
                router.replace(ADMIN_REDIRECT);
            }
        } catch (error) {
            console.error("Error checking patient status:", error);
            router.replace(LOGIN_REDIRECT);
        }
    };

    checkPatientStatus();

  }, [user, authLoading, router]);

  if (authLoading || isPatient === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p>Verificando acesso...</p>
        </div>
      </div>
    );
  }
  
  if (!isPatient) {
      // This is a fallback, but the redirect in useEffect should handle it.
      return null;
  }

  return <>{children}</>;
}

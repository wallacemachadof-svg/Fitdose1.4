
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from './use-user';
import { Loader2 } from 'lucide-react';

// A mapping of user roles to their respective redirect paths if they land on the wrong page.
const ROLE_REDIRECTS: Record<string, string> = {
  'admin': '/dashboard', // Example: admins get redirected to the main dashboard
  'patient': '/portal',  // Example: patients get redirected to their portal
};

// The default path to redirect to if the user's role has no specific redirect defined.
const DEFAULT_REDIRECT = '/login';


export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (loading) {
      return; // Wait until user status is determined
    }
    if (!user) {
      router.replace(DEFAULT_REDIRECT);
      return;
    }
  }, [user, loading, router]);


  if (loading || !user) {
    return (
       <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p>Carregando...</p>
          </div>
      </div>
    );
  }

  return <>{children}</>;
}

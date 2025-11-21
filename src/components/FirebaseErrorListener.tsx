'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';

// This is a client-side only component that listens for Firestore permission errors
// and displays them in a toast notification. This is useful for debugging security rules.
// It should be included in the root layout of the application.
export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handlePermissionError = (error: FirestorePermissionError) => {
      console.error("Firestore Permission Error:", error.message, error.details);
      
      toast({
        variant: 'destructive',
        title: 'Erro de Permissão do Firestore',
        description: (
          <div className="text-xs">
            <p className="font-mono bg-destructive-foreground/10 p-2 rounded-md">{error.message}</p>
            <p className="mt-2">Verifique as regras de segurança do Firestore e as permissões do usuário.</p>
          </div>
        )
      });
    };

    errorEmitter.on('permission-error', handlePermissionError);

    return () => {
      errorEmitter.off('permission-error', handlePermissionError);
    };
  }, [toast]);

  return null;
}

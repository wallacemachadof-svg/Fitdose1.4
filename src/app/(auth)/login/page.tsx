'use client';
import { FcGoogle } from 'react-icons/fc';
import { Button } from '@/components/ui/button';
import { FitDoseLogo, StethoscopeIcon } from '@/components/icons';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { app } from '@/firebase/config';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase/auth/use-user';
import { useEffect } from 'react';

export default function LoginPage() {
    const auth = getAuth(app);
    const router = useRouter();
    const { user, isLoading } = useUser();

    useEffect(() => {
        if (user) {
            router.push('/dashboard');
        }
    }, [user, router]);


    const handleGoogleSignIn = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
            router.push('/dashboard');
        } catch (error) {
            console.error('Error signing in with Google', error);
        }
    };
    
    if (isLoading || user) {
        return (
             <div className="flex h-screen w-full items-center justify-center">
                <StethoscopeIcon className="h-12 w-12 animate-pulse text-primary" />
            </div>
        )
    }

    return (
        <div className="flex h-screen w-full items-center justify-center bg-background px-4">
            <div className="w-full max-w-md space-y-8 text-center">
                <div className="flex justify-center">
                    <FitDoseLogo className="h-12 text-primary" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Bem-vindo(a) de volta!</h1>
                    <p className="mt-2 text-muted-foreground">
                        Faça login para acessar o painel de controle de doses.
                    </p>
                </div>
                <div className="space-y-4">
                     <Button 
                        onClick={handleGoogleSignIn}
                        className="w-full" 
                        variant="outline"
                    >
                        <FcGoogle className="mr-2 h-5 w-5" />
                        Entrar com Google
                    </Button>
                </div>
                <p className="px-8 text-center text-sm text-muted-foreground">
                    Ao continuar, você concorda com nossos Termos de Serviço e Política de Privacidade.
                </p>
            </div>
        </div>
    );
}

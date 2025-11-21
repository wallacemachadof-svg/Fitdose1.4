
'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth, useUser } from "@/firebase";
import { Loader2 } from "lucide-react";

const loginFormSchema = z.object({
  email: z.string().email("Por favor, insira um e-mail válido."),
  password: z.string().min(1, "A senha é obrigatória."),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export default function PatientLoginPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { signIn } = useAuth();
    const { user, loading: userLoading } = useUser();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [logoUrl, setLogoUrl] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const storedLogo = localStorage.getItem('customLogo');
            if (storedLogo) {
                setLogoUrl(storedLogo);
            }
        }
    }, []);

    const form = useForm<LoginFormValues>({
        resolver: zodResolver(loginFormSchema),
    });

    useEffect(() => {
        if (!userLoading && user) {
            router.replace('/portal/dashboard');
        }
    }, [user, userLoading, router]);

    async function onSubmit(data: LoginFormValues) {
        setIsSubmitting(true);
        try {
            await signIn(data.email, data.password);
            toast({
                title: "Login bem-sucedido!",
                description: "Redirecionando para o seu portal...",
            });
            router.push("/portal/dashboard");
        } catch (error: any) {
            console.error("Failed to sign in", error);
            const message = error.code === 'auth/invalid-credential' 
                ? 'Credenciais inválidas. Verifique seu e-mail e senha.'
                : 'Ocorreu um erro ao fazer login. Tente novamente.';
            toast({
                variant: "destructive",
                title: "Erro no Login",
                description: message,
            });
        } finally {
            setIsSubmitting(false);
        }
    }
    
    if (userLoading || user) {
        return (
             <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-theme(spacing.24))]">
             <Card className="w-full max-w-sm">
                <CardHeader className="text-center">
                    <CardTitle>Portal do Paciente</CardTitle>
                    <CardDescription>Acesse seu portal para acompanhar sua evolução.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>E-mail</FormLabel>
                                        <FormControl>
                                            <Input type="email" placeholder="seu@email.com" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Senha</FormLabel>
                                        <FormControl>
                                            <Input type="password" placeholder="••••••••" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Entrando...</> : 'Entrar'}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    )
}


import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowRight, User, Shield } from "lucide-react";
import Image from 'next/image';
import Link from "next/link";

export default function RootPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <div className="text-center mb-12">
             <Image src="https://i.ibb.co/dDzrTjM/logo-fit-dose.png" alt="FitDose Logo" width={240} height={60} className="mx-auto mb-6" />
             <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                Bem-vindo(a) à FitDose
             </h1>
             <p className="mt-2 text-md md:text-lg text-muted-foreground max-w-xl mx-auto">
                Aqui começa sua experiência com a saúde e bem-estar. Acesse o portal ou cadastre-se para começar.
             </p>
        </div>
        <div className="grid md:grid-cols-2 gap-8 w-full max-w-4xl">
            <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><User /> Sou Paciente</CardTitle>
                    <CardDescription>Novo por aqui? Faça seu cadastro para iniciar o acompanhamento personalizado.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild className="w-full">
                        <Link href="/cadastro">
                            Fazer meu Cadastro
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </CardContent>
            </Card>
            <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                    <CardTitle  className="flex items-center gap-2"><Shield /> Acesso Restrito</CardTitle>
                    <CardDescription>Área exclusiva para gerenciamento do sistema e pacientes.</CardDescription>
                </CardHeader>
                <CardContent>
                     <Button asChild className="w-full" variant="secondary">
                        <Link href="/dashboard">
                            Acessar Painel
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}


import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowRight, UserPlus } from "lucide-react";
import Image from 'next/image';
import Link from "next/link";

export default function RootPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-muted/40 p-4">
        <div className="mb-8">
             <Image src="https://i.ibb.co/dDzrTjM/logo-fit-dose.png" alt="FitDose Logo" width={200} height={50} />
        </div>
        <div className="grid md:grid-cols-2 gap-8 w-full max-w-4xl">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><UserPlus /> Sou Paciente</CardTitle>
                    <CardDescription>Novo por aqui? Faça seu cadastro para iniciar o acompanhamento.</CardDescription>
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
            <Card>
                <CardHeader>
                    <CardTitle>Acesso Restrito</CardTitle>
                    <CardDescription>Área exclusiva para gerenciamento do sistema e pacientes.</CardDescription>
                </CardHeader>
                <CardContent>
                     <Button asChild className="w-full" variant="outline">
                        <Link href="/dashboard">
                            Acessar Painel
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
         <p className="mt-8 text-xs text-muted-foreground">
            Você está vendo esta página porque a rota raiz foi configurada como um portal.
        </p>
    </div>
  );
}

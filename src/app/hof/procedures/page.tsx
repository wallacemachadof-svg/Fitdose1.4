
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from 'next/link';

export default function HofProceduresPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" />
            Procedimentos HOF
        </h1>
        <p className="text-muted-foreground">
          Aqui você irá registrar e consultar os procedimentos realizados.
        </p>
      </div>
      <Card className="bg-gradient-to-br from-primary/5 to-transparent text-center">
        <CardHeader>
            <CardTitle>Em Breve</CardTitle>
            <CardDescription>
                Esta seção está em desenvolvimento para permitir o registro detalhado de cada procedimento, anexar fotos de antes e depois, e gerar termos de consentimento.
            </CardDescription>
        </CardHeader>
         <CardContent>
             <Button asChild>
                 <Link href="/hof">Voltar ao Início HOF</Link>
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}


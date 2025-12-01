
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Box } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from 'next/link';

export default function HofStockPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
            <Box className="h-6 w-6 text-primary" />
            Estoque de Produtos HOF
        </h1>
        <p className="text-muted-foreground">
         Controle o inventário de seus produtos de estética avançada.
        </p>
      </div>
      <Card className="bg-gradient-to-br from-primary/5 to-transparent text-center">
        <CardHeader>
            <CardTitle>Em Breve</CardTitle>
            <CardDescription>
                Esta área permitirá que você adicione produtos (toxinas, preenchedores), controle lotes, datas de validade e dê baixa automática no estoque a cada procedimento registrado.
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

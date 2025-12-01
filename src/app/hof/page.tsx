
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Sparkles, Users, ClipboardList, Box, AreaChart } from "lucide-react";

export default function HofPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Início - Estética Avançada (HOF)
        </h1>
        <p className="text-muted-foreground">
          Bem-vindo(a) à sua nova central de gerenciamento para Harmonização Orofacial.
        </p>
      </div>
      <Card className="bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
            <CardTitle>Em Construção!</CardTitle>
            <CardDescription>
                Esta área está sendo preparada para você gerenciar todos os aspectos dos seus procedimentos estéticos. Em breve, você poderá:
            </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-3 p-3 bg-background rounded-lg">
                    <Users className="h-5 w-5 text-primary" />
                    <span>Gerenciar pacientes de HOF</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-background rounded-lg">
                    <ClipboardList className="h-5 w-5 text-primary" />
                    <span>Controlar procedimentos (Botox, Preenchimento)</span>
                </div>
                 <div className="flex items-center gap-3 p-3 bg-background rounded-lg">
                    <Box className="h-5 w-5 text-primary" />
                    <span>Gerenciar estoque de produtos</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-background rounded-lg">
                    <AreaChart className="h-5 w-5 text-primary" />
                    <span>Acompanhar a evolução dos resultados</span>
                </div>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}

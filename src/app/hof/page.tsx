
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Sparkles, Users, ClipboardList, Box, BarChart3, CalendarClock } from "lucide-react";
import Link from 'next/link';
import { Button } from "@/components/ui/button";

const FeatureCard = ({ icon: Icon, title, description, link }: { icon: React.ElementType, title: string, description: string, link: string }) => (
  <Card className="hover:shadow-md hover:border-primary/50 transition-all">
    <CardHeader className="flex flex-row items-center gap-4 space-y-0">
      <div className="bg-primary/10 p-3 rounded-full">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <div>
        <CardTitle>{title}</CardTitle>
      </div>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground">{description}</p>
      <Button variant="outline" size="sm" asChild className="mt-4">
        <Link href={link}>Acessar</Link>
      </Button>
    </CardContent>
  </Card>
);


export default function HofPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Dashboard - Estética Avançada (HOF)
        </h1>
        <p className="text-muted-foreground">
          Gerencie seus pacientes, procedimentos e estoque de harmonização orofacial.
        </p>
      </div>
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pacientes Ativos (HOF)</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">Em breve</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Procedimentos no Mês</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">Em breve</p>
            </CardContent>
        </Card>
         <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Produtos em Estoque Baixo</CardTitle>
                <Box className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">0</div>
                 <p className="text-xs text-muted-foreground">Em breve</p>
            </CardContent>
        </Card>
         <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Próximos Retornos</CardTitle>
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">0</div>
                 <p className="text-xs text-muted-foreground">Em breve</p>
            </CardContent>
        </Card>
      </div>

       <div className="grid gap-6 md:grid-cols-2">
            <FeatureCard 
                icon={Users}
                title="Pacientes de HOF"
                description="Cadastre, consulte e gerencie as informações e o histórico dos seus pacientes de estética."
                link="/hof/patients"
            />
             <FeatureCard 
                icon={ClipboardList}
                title="Procedimentos e Anamnese"
                description="Registre todos os procedimentos realizados, como Botox e preenchimento, e preencha a ficha de anamnese facial."
                link="/hof/procedures"
            />
             <FeatureCard 
                icon={Box}
                title="Estoque de Produtos"
                description="Controle a entrada e saída de todos os seus produtos de HOF, como toxinas, preenchedores e bioestimuladores."
                link="/hof/stock"
            />
        </div>
    </div>
  );
}


'use client';

import { useEffect, useState } from "react";
import Image from "next/image";
import { getPatientById, type Patient } from "@/lib/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function FoodPlanDisplay({ patientId }: { patientId: string }) {
    const { toast } = useToast();
    const [patient, setPatient] = useState<Patient | null>(null);
    const [loading, setLoading] = useState(true);
    const [logoUrl, setLogoUrl] = useState<string | null>(null);

    useEffect(() => {
        async function fetchPatient() {
            try {
                const fetchedPatient = await getPatientById(patientId);
                setPatient(fetchedPatient);
                 const storedLogo = localStorage.getItem('customLogo');
                 if (storedLogo) {
                    setLogoUrl(storedLogo);
                 }
            } catch (error) {
                toast({ variant: 'destructive', title: 'Erro ao carregar paciente.' });
            } finally {
                setLoading(false);
            }
        }
        fetchPatient();
    }, [patientId, toast]);
    
    const handleDownload = () => {
        window.print();
    };

    if (loading) {
        return <Card className="w-full max-w-4xl h-96 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></Card>
    }
    
    if (!patient) {
        return <Card className="w-full max-w-lg text-center p-8">
            <CardTitle className="text-2xl text-destructive">Plano não encontrado</CardTitle>
            <CardDescription className="mt-2">O link que você acessou parece ser inválido.</CardDescription>
        </Card>
    }

    // Example data
    const mealPlan = {
        calories: 1800,
        macros: { protein: 150, carbs: 150, fat: 60 },
        meals: [
            { time: "08:00", name: "Café da Manhã", items: ["2 Ovos Cozidos", "1/2 Mamão Papaia com 1 col. de sopa de aveia", "Café sem açúcar"] },
            { time: "10:30", name: "Lanche da Manhã", items: ["1 Maçã", "10g de Castanhas"] },
            { time: "13:00", name: "Almoço", items: ["120g de Filé de Frango Grelhado", "100g de Arroz Integral", "Salada de folhas verdes à vontade", "1 concha de feijão"] },
            { time: "16:00", name: "Lanche da Tarde", items: ["1 Pote de Iogurte Natural Desnatado", "1 col. de sopa de chia"] },
            { time: "19:00", name: "Jantar", items: ["Omelete com 2 ovos e queijo minas", "Salada de tomate e pepino"] },
            { time: "22:00", name: "Ceia", items: ["Chá de Camomila sem açúcar"] },
        ]
    };

    return (
        <div className="w-full max-w-4xl print:shadow-none print:border-none">
             <div className="flex justify-between items-center mb-4 print:hidden">
                <p className="text-sm text-muted-foreground">Clique em "Baixar PDF" e escolha "Salvar como PDF".</p>
                <Button onClick={handleDownload}><Download className="mr-2 h-4 w-4"/> Baixar PDF</Button>
            </div>
            <Card className="w-full" id="food-plan-document">
                <CardHeader className="text-center border-b pb-4">
                     {logoUrl && (
                        <div className="mx-auto mb-4 h-20 flex items-center justify-center">
                            <Image src={logoUrl} alt="Logo" width={200} height={60} className="object-contain" />
                        </div>
                    )}
                    <CardTitle className="text-2xl">Plano Alimentar</CardTitle>
                    <CardDescription className="text-lg font-semibold text-primary">{patient.fullName}</CardDescription>
                    <div className="flex justify-center gap-4 pt-2">
                        <Badge variant="secondary">Meta: {mealPlan.calories} kcal</Badge>
                        <Badge variant="secondary">Proteínas: {mealPlan.macros.protein}g</Badge>
                        <Badge variant="secondary">Carboidratos: {mealPlan.macros.carbs}g</Badge>
                        <Badge variant="secondary">Gorduras: {mealPlan.macros.fat}g</Badge>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-24">Horário</TableHead>
                                <TableHead>Refeição</TableHead>
                                <TableHead>Itens</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {mealPlan.meals.map(meal => (
                                <TableRow key={meal.name}>
                                    <TableCell className="font-semibold">{meal.time}</TableCell>
                                    <TableCell className="font-medium">{meal.name}</TableCell>
                                    <TableCell>
                                        <ul className="list-disc pl-5 space-y-1">
                                            {meal.items.map((item, index) => <li key={index}>{item}</li>)}
                                        </ul>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                     <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                        <h4 className="font-semibold mb-2">Recomendações Gerais</h4>
                        <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                            <li>Beba no mínimo 2 litros de água por dia, fracionados ao longo do dia.</li>
                            <li>Evite o consumo de bebidas açucaradas, como refrigerantes e sucos industrializados.</li>
                            <li>Mastigue bem os alimentos e coma devagar, prestando atenção aos sinais de saciedade.</li>
                            <li>Prefira temperos naturais como ervas, alho, cebola, e evite os industrializados.</li>
                            <li>A prática de atividade física regular é fundamental para potencializar seus resultados.</li>
                        </ul>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

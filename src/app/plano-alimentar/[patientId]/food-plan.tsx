
'use client';

import { useEffect, useState } from "react";
import Image from "next/image";
import { getPatientById, type Patient } from "@/lib/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Download, Sprout, Fish, Wheat, Utensils, GlassWater } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";


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
            { time: "08:00", name: "Café da Manhã", options: ["2 Ovos Cozidos + 1/2 Mamão Papaia com 1 col. sopa de aveia", "Shake com 30g de Whey Protein + 1 Banana + 1 col. sopa de chia"] },
            { time: "10:30", name: "Lanche da Manhã", options: ["1 Maçã + 10g de Castanhas", "1 Pote de Iogurte Natural Desnatado"] },
            { time: "13:00", name: "Almoço", options: ["120g de Filé de Frango Grelhado + 100g de Arroz Integral + Salada de folhas verdes à vontade + 1 concha de feijão", "150g de Salmão Assado + 150g de Batata Doce Cozida + Brócolis no vapor à vontade"] },
            { time: "16:00", name: "Lanche da Tarde", options: ["1 Pote de Iogurte Natural Desnatado + 1 col. sopa de chia", "2 Fatias de Pão Integral com 2 fatias de queijo minas frescal"] },
            { time: "19:00", name: "Jantar", options: ["Omelete com 2 ovos e queijo minas + Salada de tomate e pepino", "Sopa de Legumes com 100g de frango desfiado"] },
            { time: "22:00", name: "Ceia (Opcional)", options: ["Chá de Camomila sem açúcar", "100ml de Leite desnatado morno"] },
        ],
        substitutions: [
            { group: "Proteínas", icon: Fish, items: ["120g de Filé de Frango", "150g de Peixe Branco (Tilápia)", "4 Ovos Inteiros", "120g de Patinho moído", "30g de Whey Protein Isolado"] },
            { group: "Carboidratos", icon: Wheat, items: ["100g de Arroz Integral cozido", "150g de Batata Doce cozida", "120g de Mandioca cozida", "2 Fatias de Pão Integral", "100g de Macarrão Integral cozido"] },
            { group: "Legumes e Verduras", icon: Sprout, items: ["Folhas verdes (alface, rúcula, agrião): À vontade", "Brócolis, couve-flor, abobrinha: 1 xícara cozido", "Tomate, pepino, cenoura ralada: À vontade na salada"] },
        ],
        recommendations: [
            "Beba no mínimo 35ml de água por kg de peso corporal ao longo do dia (Ex: 70kg = 2.45L).",
            "Prefira métodos de cozimento saudáveis: grelhado, assado, cozido no vapor ou na pressão.",
            "Mastigue bem os alimentos e coma com calma, prestando atenção aos sinais de fome e saciedade do seu corpo.",
            "Use temperos naturais como alho, cebola, ervas frescas (salsinha, coentro, manjericão) e especiarias (cúrcuma, pimenta do reino). Evite caldos industrializados.",
            "A prática de atividade física regular é fundamental para potencializar seus resultados e melhorar sua saúde como um todo.",
            "Evite o consumo de bebidas açucaradas, como refrigerantes e sucos industrializados. Dê preferência para água, chás e café (com moderação).",
        ]
    };

    return (
        <div className="w-full max-w-4xl print:shadow-none print:border-none">
             <div className="flex justify-between items-center mb-4 print:hidden">
                <p className="text-sm text-muted-foreground">Clique em "Baixar PDF" para salvar uma cópia do plano.</p>
                <Button onClick={handleDownload}><Download className="mr-2 h-4 w-4"/> Baixar PDF</Button>
            </div>
            <Card className="w-full" id="food-plan-document">
                <CardHeader className="text-center border-b pb-4">
                     {logoUrl && (
                        <div className="mx-auto mb-4 h-20 flex items-center justify-center">
                            <Image src={logoUrl} alt="Logo" width={200} height={60} className="object-contain" />
                        </div>
                    )}
                    <CardTitle className="text-3xl font-bold">Plano Alimentar Individualizado</CardTitle>
                    <p className="text-lg font-semibold text-primary pt-2">{patient.fullName}</p>
                    <div className="flex justify-center gap-4 pt-2">
                        <Badge variant="secondary">Meta: {mealPlan.calories} kcal</Badge>
                        <Badge variant="secondary">Proteínas: {mealPlan.macros.protein}g</Badge>
                        <Badge variant="secondary">Carboidratos: {mealPlan.macros.carbs}g</Badge>
                        <Badge variant="secondary">Gorduras: {mealPlan.macros.fat}g</Badge>
                    </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-8">
                    <div>
                        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2"><Utensils className="h-5 w-5 text-primary" /> Estrutura do Plano Alimentar</h3>
                        <div className="space-y-4">
                            {mealPlan.meals.map(meal => (
                                <div key={meal.name} className="border-t pt-4">
                                    <p className="font-bold">{meal.time} - {meal.name}</p>
                                    <div className="text-sm text-muted-foreground mt-2 space-y-2">
                                        <p><span className="font-semibold text-primary">Opção 1:</span> {meal.options[0]}</p>
                                        {meal.options[1] && <p><span className="font-semibold text-primary">Opção 2:</span> {meal.options[1]}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <Separator />

                    <div>
                        <h3 className="text-xl font-semibold mb-4">Tabela de Substituições</h3>
                        <p className="text-sm text-muted-foreground mb-4">Você pode trocar um alimento da lista por outro da mesma linha para variar seu cardápio.</p>
                        <div className="space-y-4">
                            {mealPlan.substitutions.map(group => (
                                <div key={group.group}>
                                    <h4 className="font-semibold mb-2 flex items-center gap-2"> <group.icon className="h-4 w-4" /> {group.group}</h4>
                                    <p className="text-xs text-muted-foreground">Cada item da lista abaixo equivale a uma porção:</p>
                                    <ul className="list-disc list-inside text-sm mt-2 grid grid-cols-1 md:grid-cols-2 gap-x-4">
                                        {group.items.map(item => <li key={item}>{item}</li>)}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>

                    <Separator />

                     <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                        <h4 className="text-xl font-semibold mb-2 flex items-center gap-2"><GlassWater className="h-5 w-5 text-primary"/>Recomendações Gerais</h4>
                        <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground mt-4">
                           {mealPlan.recommendations.map((rec, index) => <li key={index}>{rec}</li>)}
                        </ul>
                    </div>
                </CardContent>
                 <CardFooter className="text-center text-xs text-muted-foreground justify-center border-t pt-4">
                    Este é um plano alimentar sugestivo. Qualquer dúvida, entre em contato com seu profissional de saúde.
                </CardFooter>
            </Card>
        </div>
    );
}

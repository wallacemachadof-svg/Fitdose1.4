
'use client';

import { useEffect, useState } from "react";
import Image from "next/image";
import { getPatientById, type Patient } from "@/lib/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, Download, AlertTriangle, Target, Info, Utensils, Coffee, Apple, Soup, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";


export default function FoodPlanDisplay({ patientId }: { patientId: string }) {
    const { toast } = useToast();
    const [patient, setPatient] = useState<Patient | null>(null);
    const [loading, setLoading] = useState(true);
    
    // Letterhead state
    const [letterheadUrl, setLetterheadUrl] = useState<string | null>(null);
    const [marginTop, setMarginTop] = useState<number>(100);
    const [marginBottom, setMarginBottom] = useState<number>(100);

    useEffect(() => {
        async function fetchPatientAndConfig() {
            try {
                const fetchedPatient = await getPatientById(patientId);
                setPatient(fetchedPatient);
                
                // Fetch letterhead config from localStorage
                setLetterheadUrl(localStorage.getItem('customLetterhead'));
                setMarginTop(parseInt(localStorage.getItem('letterheadMarginTop') || '100', 10));
                setMarginBottom(parseInt(localStorage.getItem('letterheadMarginBottom') || '100', 10));

            } catch (error) {
                toast({ variant: 'destructive', title: 'Erro ao carregar paciente.' });
            } finally {
                setLoading(false);
            }
        }
        fetchPatientAndConfig();
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
    
    const lastAdministeredDose = patient.doses
        .filter(d => d.status === 'administered' && d.administeredDose)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    const currentDoseMg = lastAdministeredDose?.administeredDose || patient.defaultDose || '2.5';


    // Example data based on the provided model
    const mealPlan = {
        calories: "1.050 a 1.200",
        meals: {
            breakfast: { time: "07:00–08:00", options: [ { title: "Opção A: Leve e rico em proteína", items: "2 ovos mexidos, 1 fatia de queijo branco, 1 fruta pequena (maçã ou ½ banana), Café ou chá sem açúcar" }, { title: "Opção B: Hipocalórico e rápido", items: "1 iogurte natural desnatado (100–120 kcal), 1 colher (sopa) chia (aumenta a saciedade com o Mounjaro)" }, { title: "Opção C: Vitamina magra", items: "150 ml leite desnatado, ½ banana, 1 colher de aveia, 1 colher de chia" }, ] },
            morningSnack: { time: "10:00", optional: true, options: ["1 fruta", "4 castanhas-do-pará", "1 iogurte zero"] },
            lunch: { time: "12:30–13:30", model: [ { group: "Proteína (100–120 g)", items: ["Peito de frango grelhado", "Peixe (tilápia, merluza, atum em água)", "Carne magra (patinho, coxão mole – 2x na semana)", "Ovos (2 unidades)"] }, { group: "Carboidrato (2 colheres de sopa)", items: ["Arroz integral", "Batata doce", "Mandioquinha", "Inhame", "Grão-de-bico ou lentilha"] }, { group: "Vegetais (metade do prato)", items: ["Abobrinha, chuchu, brócolis, couve-flor, espinafre", "Alface, pepino, tomate (quanto mais, melhor)"] }, { group: "Aditivo de Saciedade", items: ["1 colher (sopa) de mix de fibras (aveia + chia + linhaça)"] }, { group: "Tempero", items: ["Azeite 1 colher de chá (limitar por causa da náusea do Mounjaro)"] }, ] },
            afternoonSnack: { time: "16:00", optional: true, options: ["Iogurte zero + 1 fruta", "1 ovo cozido", "1 porção de gelatina zero", "Café preto + 1 fruta pequena"] },
            preWorkout: { time: "Se treinar", options: ["½ banana com canela", "Whey isolado 1 dose", "1 fruta pequena"] },
            dinner: { time: "19:00-20:00", options: [ { title: "Opção A: Leve e Rápido", items: "Omelete com 2 ovos e queijo minas + Salada de tomate e pepino" }, { title: "Opção B: Aquecer e Nutrir", items: "Sopa de Legumes com 100g de frango desfiado" } ] },
            supper: { time: "21:00", optional: true, options: ["Chá sem açúcar (camomila, erva-cidreira)", "1 gelatina zero", "1 iogurte zero"] }
        },
        substitutions: {
            Proteins: ["Frango desfiado (100g)", "Ovos (2 unidades)", "Tilápia (120g)", "Carne moída magra (100g)"],
            Carbohydrates: ["Batata doce (100g)", "Arroz integral (4 colheres de sopa)", "Mandioca (1 pedaço médio)", "Pão integral (1 fatia)"],
            Fats: ["Abacate (2 colheres de sopa)", "Azeite de oliva (1 colher de sopa)", "Castanhas (1 punhado pequeno)"],
        },
        recommendations: [ "Coma devagar, mastigando bem os alimentos. Isso melhora a digestão e ajuda a reconhecer os sinais de saciedade.", "Prefira porções menores. Com o medicamento, a saciedade chega mais rápido.", "Evite alimentos ricos em gordura e frituras. Eles podem intensificar a sensação de náusea.", "Hidrate-se! Beba no mínimo 2 litros de água por dia. A água é essencial para o metabolismo e ajuda a lidar com a constipação.", "Se sentir mal-estar ou náuseas, faça pequenas refeições com mais frequência ao longo do dia.", "Não se force a comer se não tiver fome. A redução do apetite é um efeito esperado e parte do tratamento.", ],
        goals: { weeklyLoss: "0,8–1,5 kg/semana", measures: [ { metric: "Peso", value: "−4 a −6 kg" }, { metric: "Cintura", value: "−3 a −5 cm" }, { metric: "Barriga", value: "−4 a −7 cm" }, { metric: "Quadril", value: "−3 a −5 cm" }, ] }
    };

    return (
        <div className="w-full max-w-4xl print:shadow-none print:border-none">
             <div className="flex justify-between items-center mb-4 print:hidden">
                <p className="text-sm text-muted-foreground">Para salvar, use a opção "Salvar como PDF" do seu navegador.</p>
                <Button onClick={handleDownload}><Download className="mr-2 h-4 w-4"/> Baixar PDF</Button>
            </div>
            <div 
                className="print:block"
                style={letterheadUrl ? { 
                    backgroundImage: `url(${letterheadUrl})`, 
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                } : {}}
            >
                <Card className="w-full border-2 print:border-none print:shadow-none bg-transparent print:bg-transparent" id="food-plan-document">
                    <div style={{ paddingTop: `${marginTop}px`, paddingBottom: `${marginBottom}px`, paddingLeft: '2rem', paddingRight: '2rem' }}>
                        <CardHeader className="text-center border-b pb-4">
                            <CardTitle className="text-3xl font-bold">Plano Alimentar Individualizado</CardTitle>
                            <p className="text-lg font-semibold text-primary pt-2">{patient.fullName}</p>
                            <div className="flex justify-center gap-2 pt-2 text-sm text-muted-foreground">
                                <span>DIETA HIPOCALÓRICA – {mealPlan.calories} kcal/dia</span>
                                <Separator orientation="vertical" className="h-5" />
                                <span>(Paciente em uso de {currentDoseMg} mg)</span>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-8">
                            <MealSection icon={Coffee} time={mealPlan.meals.breakfast.time} title="Café da Manhã" options={mealPlan.meals.breakfast.options} />
                            <MealSection icon={Apple} time={mealPlan.meals.morningSnack.time} title="Lanche da Manhã" options={mealPlan.meals.morningSnack.options} optional />
                            <div>
                                <h3 className="text-xl font-semibold mb-2 flex items-center gap-2 text-primary"><Utensils className="h-5 w-5" /> {mealPlan.meals.lunch.time} - Almoço (Prato Modelo)</h3>
                                <p className="text-sm text-muted-foreground mb-4">Monte seu prato com 1 opção de cada grupo abaixo para ter uma refeição balanceada e de alta saciedade.</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {mealPlan.meals.lunch.model.map(group => ( <div key={group.group} className="bg-muted/40 p-3 rounded-lg"><p className="font-semibold text-sm">{group.group}</p><ul className="list-disc list-inside text-xs text-muted-foreground mt-1">{group.items.map(item => <li key={item}>{item}</li>)}</ul></div> ))}
                                </div>
                            </div>
                            <MealSection icon={Apple} time={mealPlan.meals.afternoonSnack.time} title="Lanche da Tarde" options={mealPlan.meals.afternoonSnack.options} optional />
                            <MealSection icon={Dumbbell} time={mealPlan.meals.preWorkout.time} title="Pré-Treino" options={mealPlan.meals.preWorkout.options} />
                            <MealSection icon={Soup} time={mealPlan.meals.dinner.time} title="Jantar" options={mealPlan.meals.dinner.options} />
                            <MealSection icon={Coffee} time={mealPlan.meals.supper.time} title="Ceia" options={mealPlan.meals.supper.options} optional />
                            
                            <Separator />

                             <div className="pt-4">
                                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-primary"><Info className="h-5 w-5"/> Tabela de Substituições Inteligentes</h3>
                                <div className="grid md:grid-cols-3 gap-4">
                                    <SubstitutionTable title="Proteínas" items={mealPlan.substitutions.Proteins} />
                                    <SubstitutionTable title="Carboidratos" items={mealPlan.substitutions.Carbohydrates} />
                                    <SubstitutionTable title="Gorduras Boas" items={mealPlan.substitutions.Fats} />
                                </div>
                             </div>

                            <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                                <h4 className="text-lg font-semibold mb-2 flex items-center gap-2 text-yellow-800"><AlertTriangle className="h-5 w-5"/>Orientações Especiais</h4>
                                <ul className="list-disc pl-5 space-y-2 text-sm text-yellow-700 mt-4">{mealPlan.recommendations.map((rec, index) => <li key={index}>{rec}</li>)}</ul>
                            </div>
                            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                <h4 className="text-lg font-semibold mb-2 flex items-center gap-2 text-blue-800"><Target className="h-5 w-5"/>Metas e Previsão Realista (4-6 semanas)</h4>
                                <p className="text-sm text-blue-700 mt-2">Estimativa de déficit calórico semanal: <Badge variant="secondary" className="ml-1">{mealPlan.goals.weeklyLoss}</Badge></p>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">{mealPlan.goals.measures.map(goal => (<div key={goal.metric} className="text-center"><p className="font-bold text-lg text-blue-900">{goal.value}</p><p className="text-xs text-blue-700">{goal.metric}</p></div>))}</div>
                            </div>
                        </CardContent>
                    </div>
                </Card>
            </div>
        </div>
    );
}

const MealSection = ({ icon: Icon, time, title, options, optional = false }: { icon: React.ElementType, time: string, title: string, options: (string | {title: string; items: string})[], optional?: boolean}) => (
    <div>
        <h3 className="text-xl font-semibold mb-2 flex items-center gap-2 text-primary"><Icon className="h-5 w-5" /> {time} - {title} {optional && <Badge variant="outline" className="text-xs">Opcional</Badge>}</h3>
        {optional && <p className="text-xs text-muted-foreground mb-2">Se não tiver fome, pode pular.</p>}
        <div className="text-sm text-muted-foreground mt-2 space-y-3">
            {options.map((opt, index) => (typeof opt === 'string' ? (<p key={index}><span className="font-semibold text-primary">Opção {String.fromCharCode(65 + index)}:</span> {opt}</p>) : (<div key={index} className="p-3 rounded-md border bg-white"><p className="font-semibold">{opt.title}</p><p className="text-xs">{opt.items}</p></div>)))}
        </div>
    </div>
);

const SubstitutionTable = ({ title, items }: { title: string; items: string[] }) => (
  <div className="border rounded-lg p-3 bg-white">
    <h4 className="font-bold text-center mb-2">{title}</h4>
    <ul className="text-xs text-muted-foreground space-y-1">
      {items.map(item => <li key={item} className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary/50 shrink-0"></span>{item}</li>)}
    </ul>
  </div>
);

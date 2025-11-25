
'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { getPatientById, saveNutritionalAssessment, type Patient } from "@/lib/actions";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";

const foodGroups = [
    { id: 'frutas', label: 'Frutas' },
    { id: 'vegetais', label: 'Verduras e Legumes' },
    { id: 'proteinas', label: 'Proteínas (carne, frango, peixe, ovos)' },
    { id: 'laticinios', label: 'Laticínios (leite, queijo, iogurte)' },
    { id: 'carboidratos', label: 'Carboidratos (pão, arroz, massa, batata)' },
    { id: 'gorduras', label: 'Gorduras boas (abacate, nozes, azeite)' },
];

const nutritionalAssessmentFormSchema = z.object({
    wakeupTime: z.string().min(1, "Campo obrigatório"),
    sleepTime: z.string().min(1, "Campo obrigatório"),
    breakfastTime: z.string().optional(),
    breakfastDescription: z.string().optional(),
    morningSnackTime: z.string().optional(),
    morningSnackDescription: z.string().optional(),
    lunchTime: z.string().optional(),
    lunchDescription: z.string().optional(),
    afternoonSnackTime: z.string().optional(),
    afternoonSnackDescription: z.string().optional(),
    dinnerTime: z.string().optional(),
    dinnerDescription: z.string().optional(),
    eveningSnackTime: z.string().optional(),
    eveningSnackDescription: z.string().optional(),
    waterIntake: z.string({ required_error: 'Campo obrigatório' }),
    otherLiquids: z.string().optional(),
    foodPreferences: z.string().optional(),
    foodAversions: z.string().optional(),
    weekendHabits: z.string().optional(),
    dietExperience: z.string().optional(),
    mainGoal: z.string().min(1, "Campo obrigatório"),
    mainDifficulty: z.string().min(1, "Campo obrigatório"),
    hasAllergies: z.enum(['yes', 'no'], { required_error: 'Campo obrigatório' }),
    allergiesDescription: z.string().optional(),
    favoriteFoods: z.array(z.string()).optional(),
    bowelFunction: z.string({ required_error: 'Campo obrigatório' }),
}).refine(data => data.hasAllergies === 'no' || (data.hasAllergies === 'yes' && data.allergiesDescription), {
    message: 'Por favor, descreva suas alergias.',
    path: ['allergiesDescription'],
});

export type NutritionalAssessmentData = z.infer<typeof nutritionalAssessmentFormSchema>;

export default function NutritionalAssessmentForm({ patientId }: { patientId: string }) {
    const router = useRouter();
    const { toast } = useToast();
    const [patient, setPatient] = useState<Patient | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [logoUrl, setLogoUrl] = useState<string | null>(null);

    const form = useForm<NutritionalAssessmentData>({
        resolver: zodResolver(nutritionalAssessmentFormSchema),
        defaultValues: { favoriteFoods: [] }
    });
    
    useEffect(() => {
        async function fetchPatient() {
            const fetchedPatient = await getPatientById(patientId);
            if (fetchedPatient) {
                setPatient(fetchedPatient);
            }
            setLoading(false);
        }
        fetchPatient();
        
        const storedLogo = localStorage.getItem('customLogo');
        if (storedLogo) {
          setLogoUrl(storedLogo);
        }
    }, [patientId]);

    async function onSubmit(data: NutritionalAssessmentData) {
        setIsSubmitting(true);
        try {
            await saveNutritionalAssessment(patientId, data);
            router.push("/avaliacao-nutricional/sucesso");
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Erro ao Enviar",
                description: "Não foi possível salvar sua avaliação. Por favor, tente novamente.",
            });
            setIsSubmitting(false);
        }
    }
    
    if(loading) {
        return <Card className="w-full max-w-4xl h-96 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></Card>
    }
    
    if(!patient) {
        return <Card className="w-full max-w-lg text-center p-8">
            <CardTitle className="text-2xl text-destructive">Paciente não encontrado</CardTitle>
            <CardDescription className="mt-2">O link que você acessou parece ser inválido. Por favor, verifique com o profissional que te enviou.</CardDescription>
        </Card>
    }

    if (!showForm) {
      return (
        <Card className="w-full max-w-lg text-center">
          <CardHeader>
            {logoUrl && (
                <div className="mx-auto h-24 flex items-center justify-center">
                    <Image src={logoUrl} alt="Logo" width={400} height={80} className="object-contain max-h-full"/>
                </div>
            )}
            <CardTitle className="text-3xl font-bold mt-4">Olá, {patient.fullName.split(' ')[0]}!</CardTitle>
            <CardDescription>
              Vamos começar sua avaliação nutricional. Suas respostas são essenciais para criarmos um plano alimentar perfeito para você.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setShowForm(true)} size="lg">
              Iniciar Avaliação <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      );
    }
    
    return (
        <Card className="w-full max-w-4xl">
            <CardHeader>
                <CardTitle>Anamnese Nutricional</CardTitle>
                <CardDescription>Responda com o máximo de detalhes possível. Isto nos ajudará a criar o melhor plano para você.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
                        
                        <div>
                            <h3 className="text-lg font-semibold border-b pb-2 mb-4">Sua Rotina</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField control={form.control} name="wakeupTime" render={({ field }) => (
                                    <FormItem><FormLabel>A que horas você acorda?</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="sleepTime" render={({ field }) => (
                                    <FormItem><FormLabel>A que horas você dorme?</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold border-b pb-2 mb-4">Suas Refeições</h3>
                            <div className="space-y-6">
                                {(['breakfast', 'morningSnack', 'lunch', 'afternoonSnack', 'dinner', 'eveningSnack'] as const).map(meal => (
                                    <div key={meal} className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
                                        <FormField control={form.control} name={`${meal}Time`} render={({ field }) => (
                                            <FormItem><FormLabel className="capitalize">{meal.replace('Snack', ' Lanche').replace('breakfast', 'Café da Manhã').replace('lunch', 'Almoço').replace('dinner', 'Jantar')}</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                                        )}/>
                                        <FormField control={form.control} name={`${meal}Description`} render={({ field }) => (
                                            <FormItem className="md:col-span-2"><FormLabel>O que você geralmente come?</FormLabel><FormControl><Textarea rows={2} placeholder="Ex: Pão com manteiga e café com leite" {...field} /></FormControl><FormMessage /></FormItem>
                                        )}/>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold border-b pb-2 mb-4">Hidratação e Hábitos</h3>
                             <div className="space-y-6">
                                <FormField control={form.control} name="waterIntake" render={({ field }) => (
                                    <FormItem><FormLabel>Quantos litros de água você bebe por dia?</FormLabel><FormControl><Input placeholder="Ex: 2 litros" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="otherLiquids" render={({ field }) => (
                                    <FormItem><FormLabel>Você consome outras bebidas com frequência? (Refrigerante, suco, etc)</FormLabel><FormControl><Textarea rows={2} placeholder="Liste as bebidas e a frequência" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                 <FormField control={form.control} name="bowelFunction" render={({ field }) => (
                                    <FormItem><FormLabel>Como funciona seu intestino?</FormLabel><FormControl><Input placeholder="Ex: Regularmente todos os dias, a cada 2 dias, etc." {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="weekendHabits" render={({ field }) => (
                                    <FormItem><FormLabel>Sua alimentação muda nos fins de semana? Se sim, como?</FormLabel><FormControl><Textarea rows={3} placeholder="Ex: Costumo pedir fast-food no sábado, como mais doces, etc." {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                             </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold border-b pb-2 mb-4">Preferências e Saúde</h3>
                             <div className="space-y-6">
                                 <FormField
                                    control={form.control}
                                    name="favoriteFoods"
                                    render={() => (
                                        <FormItem>
                                        <div className="mb-4">
                                            <FormLabel className="text-base">Quais grupos de alimentos você mais gosta?</FormLabel>
                                            <FormDescription>Selecione todos que se aplicam.</FormDescription>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        {foodGroups.map((item) => (
                                            <FormField
                                                key={item.id}
                                                control={form.control}
                                                name="favoriteFoods"
                                                render={({ field }) => {
                                                    return (
                                                    <FormItem key={item.id} className="flex flex-row items-center space-x-3 space-y-0">
                                                        <FormControl>
                                                        <Checkbox
                                                            checked={field.value?.includes(item.id)}
                                                            onCheckedChange={(checked) => {
                                                            return checked
                                                                ? field.onChange([...(field.value || []), item.id])
                                                                : field.onChange(field.value?.filter((value) => value !== item.id))
                                                            }}
                                                        />
                                                        </FormControl>
                                                        <FormLabel className="font-normal">{item.label}</FormLabel>
                                                    </FormItem>
                                                    )
                                                }}
                                                />
                                            ))}
                                        </div>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField control={form.control} name="foodPreferences" render={({ field }) => (
                                    <FormItem><FormLabel>Quais são seus alimentos favoritos?</FormLabel><FormControl><Textarea rows={2} placeholder="Liste os alimentos que você adora e gostaria de incluir no plano." {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="foodAversions" render={({ field }) => (
                                    <FormItem><FormLabel>Existe algum alimento que você não come de jeito nenhum?</FormLabel><FormControl><Textarea rows={2} placeholder="Liste os alimentos que você não gosta." {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="hasAllergies" render={({ field }) => (
                                    <FormItem className="space-y-3"><FormLabel>Possui alguma alergia ou intolerância alimentar?</FormLabel>
                                        <FormControl>
                                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex items-center gap-6">
                                                <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="yes" /></FormControl><FormLabel className="font-normal">Sim</FormLabel></FormItem>
                                                <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="no" /></FormControl><FormLabel className="font-normal">Não</FormLabel></FormItem>
                                            </RadioGroup>
                                        </FormControl>
                                    <FormMessage /></FormItem>
                                )}/>
                                {form.watch('hasAllergies') === 'yes' && (
                                     <FormField control={form.control} name="allergiesDescription" render={({ field }) => (
                                        <FormItem><FormLabel>Descreva suas alergias/intolerâncias</FormLabel><FormControl><Textarea rows={2} placeholder="Ex: Intolerância à lactose, alergia a amendoim." {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                )}
                             </div>
                        </div>

                         <div>
                            <h3 className="text-lg font-semibold border-b pb-2 mb-4">Metas e Desafios</h3>
                            <div className="space-y-6">
                                <FormField control={form.control} name="dietExperience" render={({ field }) => (
                                    <FormItem><FormLabel>Você já fez alguma dieta antes? Como foi sua experiência?</FormLabel><FormControl><Textarea rows={3} placeholder="Descreva brevemente." {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="mainGoal" render={({ field }) => (
                                    <FormItem><FormLabel>Qual é o seu principal objetivo com este plano alimentar?</FormLabel><FormControl><Textarea rows={3} placeholder="Ex: Perder peso, ter mais energia, aprender a comer melhor..." {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="mainDifficulty" render={({ field }) => (
                                    <FormItem><FormLabel>Qual a sua maior dificuldade para seguir um plano alimentar?</FormLabel><FormControl><Textarea rows={3} placeholder="Ex: Falta de tempo para cozinhar, ansiedade, vontade de comer doces..." {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                            </div>
                        </div>
                        
                        <div className="flex justify-end pt-8 border-t">
                            <Button type="submit" disabled={isSubmitting} size="lg">
                                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Enviando...</> : 'Finalizar e Enviar Avaliação'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    )
}

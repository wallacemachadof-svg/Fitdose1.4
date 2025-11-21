
'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import * as z from "zod";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, ArrowLeft, Loader2, ChevronDown, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { addBioimpedanceEntry, getPatients, type Patient, type Bioimpedance } from "@/lib/actions";
import { Combobox } from "@/components/ui/combobox";
import { analyzeBioimpedanceImage, type AnalyzeBioimpedanceOutput } from "@/ai/flows/analyze-bioimpedance-flow";


const bioimpedanceFormSchema = z.object({
    patientId: z.string({ required_error: 'Selecione um paciente.' }),
    date: z.date({ required_error: 'A data da medição é obrigatória.' }),
    weight: z.coerce.number().optional(),
    bmi: z.coerce.number().optional(),
    fatPercentage: z.coerce.number().optional(),
    skeletalMusclePercentage: z.coerce.number().optional(),
    visceralFat: z.coerce.number().optional(),
    hydration: z.coerce.number().optional(),
    metabolism: z.coerce.number().optional(),
    obesityPercentage: z.coerce.number().optional(),
    boneMass: z.coerce.number().optional(),
    protein: z.coerce.number().optional(),
});

type BioimpedanceFormValues = z.infer<typeof bioimpedanceFormSchema>;

const bioimpedanceFields: { key: keyof Bioimpedance, label: string }[] = [
    { key: 'weight', label: 'Peso(Kg)' },
    { key: 'bmi', label: 'IMC' },
    { key: 'fatPercentage', label: 'Gordura(%)' },
    { key: 'skeletalMusclePercentage', label: 'M. Esquelética(%)' },
    { key: 'visceralFat', label: 'Gordura Visceral' },
    { key: 'hydration', label: 'Água(%)' },
    { key: 'metabolism', label: 'Metabolismo(kcal)' },
    { key: 'obesityPercentage', label: 'Obesidade(%)' },
    { key: 'boneMass', label: 'Ossos(Kg)' },
    { key: 'protein', label: 'Proteína(%)' },
];


function BioimpedanceForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [patients, setPatients] = useState<{ value: string, label: string }[]>([]);
    
    const patientIdFromQuery = searchParams.get('patientId');

    const form = useForm<BioimpedanceFormValues>({
        resolver: zodResolver(bioimpedanceFormSchema),
        defaultValues: {
            date: new Date(),
            patientId: patientIdFromQuery || undefined,
        },
    });
    
    useEffect(() => {
        async function fetchPatients() {
            const patientData = await getPatients();
            setPatients(patientData.map(p => ({ value: p.id, label: p.fullName })));
        }
        fetchPatients();
    }, []);

    const handleImageAnalysis = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsAnalyzing(true);
        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                const photoDataUri = reader.result as string;
                const result = await analyzeBioimpedanceImage({ photoDataUri });
                
                Object.keys(result).forEach(key => {
                    const typedKey = key as keyof AnalyzeBioimpedanceOutput;
                    if (result[typedKey] !== undefined) {
                        form.setValue(typedKey as keyof BioimpedanceFormValues, result[typedKey]);
                    }
                });

                toast({
                    title: "Análise Concluída!",
                    description: "Os dados da imagem foram preenchidos no formulário.",
                });
            };
        } catch (error) {
            console.error("Failed to analyze image", error);
            toast({
                variant: "destructive",
                title: "Erro na Análise",
                description: "Não foi possível extrair os dados da imagem. Tente novamente.",
            });
        } finally {
            setIsAnalyzing(false);
        }
    };


    async function onSubmit(data: BioimpedanceFormValues) {
        setIsSubmitting(true);
        const { patientId, date, ...bioimpedanceData } = data;

        // Filter out undefined/null values
        const cleanBioimpedanceData = Object.entries(bioimpedanceData).reduce((acc, [key, value]) => {
            if (value !== undefined && value !== null && !isNaN(value)) {
                acc[key as keyof Bioimpedance] = value;
            }
            return acc;
        }, {} as Bioimpedance);
        
        if (Object.keys(cleanBioimpedanceData).length === 0) {
            toast({
                variant: "destructive",
                title: "Nenhum dado informado",
                description: "Por favor, preencha pelo menos um campo da bioimpedância.",
            });
            setIsSubmitting(false);
            return;
        }


        try {
            await addBioimpedanceEntry(patientId, date, cleanBioimpedanceData);
            toast({
                title: "Registro Salvo!",
                description: `A nova medição foi adicionada ao histórico do paciente.`,
            });
            router.push(`/patients/${patientId}`);
        } catch (error) {
             const errorMessage = error instanceof Error ? error.message : "Não foi possível salvar o registro. Tente novamente.";
             toast({
                variant: "destructive",
                title: "Erro ao salvar",
                description: errorMessage,
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="space-y-6">
            <Button variant="ghost" asChild className="-ml-4">
                <Link href={patientIdFromQuery ? `/patients/${patientIdFromQuery}` : '/patients'}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar
                </Link>
            </Button>
            <Card className="w-full max-w-4xl mx-auto">
                <CardHeader>
                    <CardTitle>Registrar Nova Bioimpedância</CardTitle>
                    <CardDescription>Preencha os dados da medição para adicionar ao histórico do paciente.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <FormField control={form.control} name="patientId" render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Paciente *</FormLabel>
                                        <Combobox 
                                            options={patients}
                                            value={field.value}
                                            onChange={(value) => field.onChange(value)}
                                            placeholder="Selecione um paciente..."
                                            noResultsText="Nenhum paciente encontrado."
                                        />
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                 <FormField control={form.control} name="date" render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Data da Medição *</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                    {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar locale={ptBR} mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                            </div>
                            
                           
                            <Card className="mt-4 bg-muted/30">
                                <CardHeader>
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="text-lg">Dados da Bioimpedância</CardTitle>
                                         <Button type="button" asChild variant="outline">
                                            <label htmlFor="image-upload" className="cursor-pointer">
                                                {isAnalyzing ? (
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Upload className="mr-2 h-4 w-4" />
                                                )}
                                                Analisar Imagem
                                            </label>
                                        </Button>
                                        <Input id="image-upload" type="file" accept="image/*" className="hidden" onChange={handleImageAnalysis} disabled={isAnalyzing} />
                                    </div>
                                    <CardDescription>Preencha os campos abaixo ou envie uma imagem do app para preenchimento automático com IA.</CardDescription>
                                </CardHeader>
                                <CardContent className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {bioimpedanceFields.map(field => (
                                            <FormField 
                                            key={field.key}
                                            control={form.control} 
                                            name={field.key}
                                            render={({ field: formField }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs">{field.label}</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" step="0.1" placeholder="-" {...formField} />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                            />
                                    ))}
                                </CardContent>
                            </Card>

                            <div className="flex justify-end gap-2 pt-4">
                                <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>Cancelar</Button>
                                <Button type="submit" disabled={isSubmitting || !form.watch('patientId')}>
                                    {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Salvando...</> : 'Salvar Medição'}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    )
}

export default function BioimpedancePage() {
    return (
        <Suspense fallback={<div>Carregando...</div>}>
            <BioimpedanceForm />
        </Suspense>
    )
}

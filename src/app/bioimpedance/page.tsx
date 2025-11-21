
'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getPatients, addBioimpedanceEntry, type Patient } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { CalendarIcon, Loader2, BookPlus } from "lucide-react";

const bioimpedanceFormSchema = z.object({
  patientId: z.string({ required_error: "Selecione um paciente." }),
  date: z.date({ required_error: "A data da pesagem é obrigatória." }),
  weight: z.coerce.number().optional(),
  bmi: z.coerce.number().optional(),
  fatPercentage: z.coerce.number().optional(),
  muscleMassPercentage: z.coerce.number().optional(),
  visceralFat: z.coerce.number().optional(),
  hydration: z.coerce.number().optional(),
  metabolism: z.coerce.number().optional(),
  boneMass: z.coerce.number().optional(),
  protein: z.coerce.number().optional(),
  metabolicAge: z.coerce.number().optional(),
});

type BioimpedanceFormValues = z.infer<typeof bioimpedanceFormSchema>;

export default function BioimpedancePage() {
    const router = useRouter();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [patients, setPatients] = useState<Patient[]>([]);

    useEffect(() => {
        const fetchPatients = async () => {
            const data = await getPatients();
            setPatients(data);
        }
        fetchPatients();
    }, []);

    const patientOptions = patients.map(p => ({ value: p.id, label: p.fullName }));

    const form = useForm<BioimpedanceFormValues>({
        resolver: zodResolver(bioimpedanceFormSchema),
        defaultValues: {
            date: new Date(),
        }
    });

    async function onSubmit(data: BioimpedanceFormValues) {
        setIsSubmitting(true);
        try {
            await addBioimpedanceEntry(data.patientId, data.date, {
                weight: data.weight,
                bmi: data.bmi,
                fatPercentage: data.fatPercentage,
                muscleMassPercentage: data.muscleMassPercentage,
                visceralFat: data.visceralFat,
                hydration: data.hydration,
                metabolism: data.metabolism,
                boneMass: data.boneMass,
                protein: data.protein,
                metabolicAge: data.metabolicAge,
            });

            toast({
                title: "Bioimpedância Adicionada!",
                description: "Os dados foram salvos no perfil do paciente.",
            });
            
            router.push(`/patients/${data.patientId}`);
            router.refresh();

        } catch (error) {
            console.error("Failed to add bioimpedance entry", error);
            toast({
                variant: "destructive",
                title: "Erro ao Salvar",
                description: "Não foi possível salvar os dados. Tente novamente.",
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Card className="max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle>Adicionar Bioimpedância</CardTitle>
                <CardDescription>Insira os dados da balança para registrar a evolução do paciente.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <FormField
                                control={form.control}
                                name="patientId"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Paciente</FormLabel>
                                        <Combobox
                                            options={patientOptions}
                                            value={field.value}
                                            onChange={(value) => form.setValue("patientId", value)}
                                            placeholder="Selecione o paciente..."
                                            noResultsText="Nenhum paciente encontrado."
                                        />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            
                             <FormField control={form.control} name="date" render={({ field }) => (
                                <FormItem className="flex flex-col"><FormLabel>Data da Pesagem</FormLabel>
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
                        
                        <div className="space-y-4 pt-4 border-t">
                             <h4 className="text-md font-medium">Métricas da Bioimpedância</h4>
                             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <FormField control={form.control} name="weight" render={({ field }) => (
                                    <FormItem><FormLabel>Peso (Kg)</FormLabel><FormControl><Input type="number" step="0.1" placeholder="Ex: 80.7" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="bmi" render={({ field }) => (
                                    <FormItem><FormLabel>IMC</FormLabel><FormControl><Input type="number" step="0.1" placeholder="Ex: 28.9" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="fatPercentage" render={({ field }) => (
                                    <FormItem><FormLabel>Gordura (%)</FormLabel><FormControl><Input type="number" step="0.1" placeholder="Ex: 28.4" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="muscleMassPercentage" render={({ field }) => (
                                    <FormItem><FormLabel>Massa Muscular (%)</FormLabel><FormControl><Input type="number" step="0.1" placeholder="Ex: 68.2" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="visceralFat" render={({ field }) => (
                                    <FormItem><FormLabel>Gordura Visceral</FormLabel><FormControl><Input type="number" placeholder="Ex: 14" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="hydration" render={({ field }) => (
                                    <FormItem><FormLabel>Água (%)</FormLabel><FormControl><Input type="number" step="0.1" placeholder="Ex: 51.9" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                 <FormField control={form.control} name="metabolism" render={({ field }) => (
                                    <FormItem><FormLabel>Metabolismo (kcal)</FormLabel><FormControl><Input type="number" placeholder="Ex: 1680" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                 <FormField control={form.control} name="boneMass" render={({ field }) => (
                                    <FormItem><FormLabel>Massa Óssea (Kg)</FormLabel><FormControl><Input type="number" step="0.1" placeholder="Ex: 2.7" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="protein" render={({ field }) => (
                                    <FormItem><FormLabel>Proteína (%)</FormLabel><FormControl><Input type="number" step="0.1" placeholder="Ex: 16.4" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="metabolicAge" render={({ field }) => (
                                    <FormItem><FormLabel>Idade Metabólica</FormLabel><FormControl><Input type="number" placeholder="Ex: 36" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                            </div>
                        </div>
                        
                        <div className="flex justify-end pt-4">
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Salvando...</> : <><BookPlus className="mr-2 h-4 w-4"/> Salvar Bioimpedância</>}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    )
}

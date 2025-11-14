'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
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
import { CalendarIcon, ArrowLeft } from "lucide-react";
import { cn, calculateBmi } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { addPatient } from "@/lib/data";

const patientFormSchema = z.object({
  fullName: z.string().min(3, "Nome completo é obrigatório."),
  age: z.coerce.number().min(1, "Idade é obrigatória.").positive("Idade deve ser um número positivo."),
  initialWeight: z.coerce.number().min(1, "Peso inicial é obrigatório.").positive("Peso deve ser um número positivo."),
  height: z.coerce.number().min(1, "Altura é obrigatória.").positive("Altura deve ser um número positivo."),
  desiredWeight: z.coerce.number().min(1, "Peso desejado é obrigatório.").positive("Peso deve ser um número positivo."),
  firstDoseDate: z.date({
    required_error: "A data da primeira dose é obrigatória.",
  }),
  zip: z.string().min(8, "CEP deve ter 8 dígitos.").max(9, "CEP inválido."),
  street: z.string().min(1, "Rua é obrigatória."),
  number: z.string().min(1, "Número é obrigatório."),
  city: z.string().min(1, "Cidade é obrigatória."),
  state: z.string().min(2, "Estado é obrigatório.").max(2, "Use a sigla do estado."),
  phone: z.string().min(10, "Telefone inválido."),
  healthContraindications: z.string().optional(),
});

type PatientFormValues = z.infer<typeof patientFormSchema>;

export default function NewPatientPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [bmi, setBmi] = useState<number | null>(null);

    const form = useForm<PatientFormValues>({
        resolver: zodResolver(patientFormSchema),
        defaultValues: {
            healthContraindications: ""
        }
    });

    const watchWeight = form.watch("initialWeight");
    const watchHeight = form.watch("height");
    const watchZip = form.watch("zip");

    useEffect(() => {
        if (watchWeight && watchHeight) {
            setBmi(calculateBmi(watchWeight, watchHeight / 100)); // Convert cm to meters
        } else {
            setBmi(null);
        }
    }, [watchWeight, watchHeight]);
    
    useEffect(() => {
        const fetchAddress = async () => {
            const zipCode = watchZip.replace(/\D/g, '');
            if (zipCode.length === 8) {
                try {
                    const response = await fetch(`https://viacep.com.br/ws/${zipCode}/json/`);
                    const data = await response.json();
                    if (!data.erro) {
                        form.setValue("street", data.logradouro);
                        form.setValue("city", data.localidade);
                        form.setValue("state", data.uf);
                    } else {
                        toast({
                            variant: "destructive",
                            title: "CEP não encontrado",
                            description: "Verifique o CEP e tente novamente.",
                        });
                    }
                } catch (error) {
                    console.error("Failed to fetch address", error);
                    toast({
                        variant: "destructive",
                        title: "Erro ao buscar CEP",
                        description: "Não foi possível buscar o endereço. Tente novamente.",
                    });
                }
            }
        };
        fetchAddress();
    }, [watchZip, form, toast]);


    async function onSubmit(data: PatientFormValues) {
        await addPatient(data);
        toast({
            title: "Paciente Registrado!",
            description: `${data.fullName} foi adicionado(a) com sucesso.`,
            variant: "default",
        });
        router.push("/patients");
        router.refresh(); // Forces a refresh on the patients page to show the new data
    }

    return (
        <>
            <Button variant="ghost" asChild className="mb-4 -ml-4">
                <Link href="/patients">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar para Pacientes
                </Link>
            </Button>
            <Card>
                <CardHeader>
                    <CardTitle>Registrar Novo Paciente</CardTitle>
                    <CardDescription>Preencha os dados abaixo para criar um novo registro.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <FormField control={form.control} name="fullName" render={({ field }) => (
                                    <FormItem><FormLabel>Nome Completo</FormLabel><FormControl><Input placeholder="Ex: João da Silva" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="phone" render={({ field }) => (
                                    <FormItem><FormLabel>Telefone (WhatsApp)</FormLabel><FormControl><Input placeholder="(XX) XXXXX-XXXX" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <FormField control={form.control} name="age" render={({ field }) => (
                                    <FormItem><FormLabel>Idade</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="initialWeight" render={({ field }) => (
                                    <FormItem><FormLabel>Peso Inicial (kg)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="height" render={({ field }) => (
                                    <FormItem><FormLabel>Altura (cm)</FormLabel><FormControl><Input type="number" placeholder="Ex: 175" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="desiredWeight" render={({ field }) => (
                                    <FormItem><FormLabel>Meta de Peso (kg)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
                                <FormField control={form.control} name="firstDoseDate" render={({ field }) => (
                                    <FormItem className="flex flex-col"><FormLabel>Data da 1ª Dose</FormLabel>
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
                                <div className="p-2 border rounded-md bg-muted/30 h-10 flex items-center justify-between">
                                    <label className="text-sm font-medium text-muted-foreground">IMC</label>
                                    <p className="text-lg font-bold">{bmi ?? '-'}</p>
                                </div>
                            </div>
                            
                            <h3 className="text-lg font-semibold border-t pt-6">Endereço</h3>
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField control={form.control} name="zip" render={({ field }) => (
                                    <FormItem><FormLabel>CEP</FormLabel><FormControl><Input placeholder="00000-000" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                             </div>
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField control={form.control} name="street" render={({ field }) => (
                                    <FormItem className="col-span-2"><FormLabel>Rua</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="number" render={({ field }) => (
                                    <FormItem><FormLabel>Número</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="city" render={({ field }) => (
                                    <FormItem><FormLabel>Cidade</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="state" render={({ field }) => (
                                    <FormItem><FormLabel>Estado (UF)</FormLabel><FormControl><Input placeholder="Ex: SP" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                            </div>

                            <FormField control={form.control} name="healthContraindications" render={({ field }) => (
                                <FormItem><FormLabel>Contraindicações e Observações</FormLabel><FormControl><Textarea rows={5} placeholder="Liste alergias, condições médicas, medicamentos em uso, etc." {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => router.push('/patients')}>Cancelar</Button>
                                <Button type="submit">Salvar Paciente</Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </>
    )
}

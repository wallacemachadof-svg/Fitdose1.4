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

const patientFormSchema = z.object({
  fullName: z.string().min(3, "Nome completo é obrigatório."),
  age: z.coerce.number().min(1, "Idade é obrigatória.").positive("Idade deve ser um número positivo."),
  initialWeight: z.coerce.number().min(1, "Peso inicial é obrigatório.").positive("Peso deve ser um número positivo."),
  height: z.coerce.number().min(0.5, "Altura é obrigatória.").positive("Altura deve ser um número positivo."),
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

    useEffect(() => {
        if (watchWeight && watchHeight) {
            setBmi(calculateBmi(watchWeight, watchHeight));
        } else {
            setBmi(null);
        }
    }, [watchWeight, watchHeight]);

    function onSubmit(data: PatientFormValues) {
        console.log("New Patient Data:", data);
        toast({
            title: "Paciente Registrado!",
            description: `${data.fullName} foi adicionado(a) com sucesso.`,
            variant: "default",
        });
        router.push("/patients");
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
                                    <FormItem><FormLabel>Altura (m)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="Ex: 1.75" {...field} /></FormControl><FormMessage /></FormItem>
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

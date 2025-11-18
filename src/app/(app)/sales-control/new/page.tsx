
'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CalendarIcon, ArrowLeft } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { addSale, getPatients, type Patient } from "@/lib/data";

const doseOptions = [
    { value: '2.5', label: '2.5 mg', price: 220 },
    { value: '3.75', label: '3.75 mg', price: 330 },
    { value: '5.0', label: '5.0 mg', price: 380 },
    { value: '6.25', label: '6.25 mg', price: 430 },
    { value: '7.05', label: '7.05 mg', price: 520 },
];

const saleFormSchema = z.object({
  patientId: z.string({ required_error: "Selecione um cliente." }),
  saleDate: z.date({ required_error: "A data da venda é obrigatória." }),
  soldDose: z.string({ required_error: "Selecione uma dose." }),
  price: z.coerce.number().min(0, "O preço não pode ser negativo."),
  discount: z.coerce.number().min(0, "O desconto não pode ser negativo.").optional(),
  total: z.coerce.number(),
  paymentStatus: z.enum(["pago", "pendente"], { required_error: "Selecione o status do pagamento." }),
  paymentDate: z.date().optional(),
  deliveryStatus: z.enum(["em agendamento", "entregue", "em processamento"], { required_error: "Selecione o status da entrega." }),
  deliveryDate: z.date().optional(),
  observations: z.string().optional(),
});

type SaleFormValues = z.infer<typeof saleFormSchema>;

export default function NewSalePage() {
    const router = useRouter();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [patients, setPatients] = useState<Patient[]>([]);

    useEffect(() => {
        const fetchPatients = async () => {
            const data = await getPatients();
            setPatients(data);
        };
        fetchPatients();
    }, []);

    const form = useForm<SaleFormValues>({
        resolver: zodResolver(saleFormSchema),
        defaultValues: {
            patientId: '',
            soldDose: '',
            price: 0,
            discount: 0,
            total: 0,
            paymentStatus: "pendente",
            deliveryStatus: "em processamento",
            observations: "",
        },
    });

    const watchSoldDose = form.watch("soldDose");
    const watchPrice = form.watch("price");
    const watchDiscount = form.watch("discount");


    useEffect(() => {
        const dose = doseOptions.find(d => d.value === watchSoldDose);
        if (dose) {
            form.setValue("price", dose.price);
        }
    }, [watchSoldDose, form]);

    useEffect(() => {
        const total = (watchPrice || 0) - (watchDiscount || 0);
        form.setValue("total", total);
    }, [watchPrice, watchDiscount, form]);

    async function onSubmit(data: SaleFormValues) {
        setIsSubmitting(true);
        try {
            await addSale(data);
            toast({
                title: "Venda Registrada!",
                description: `A venda para o paciente selecionado foi adicionada com sucesso.`,
            });
            router.push("/sales-control");
            router.refresh();
        } catch (error: any) {
            console.error("Failed to add sale", error);
             toast({
                variant: "destructive",
                title: "Erro ao salvar",
                description: error.message || "Não foi possível salvar a venda. Tente novamente.",
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <>
            <Button variant="ghost" asChild className="mb-4 -ml-4">
                <Link href="/sales-control">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar para Controle de Vendas
                </Link>
            </Button>
            <Card>
                <CardHeader>
                    <CardTitle>Registrar Nova Venda</CardTitle>
                    <CardDescription>Preencha os dados abaixo para registrar uma nova venda.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <FormField
                                    control={form.control}
                                    name="patientId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Cliente</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecione um paciente" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {patients.map(patient => (
                                                        <SelectItem key={patient.id} value={patient.id}>
                                                            {patient.fullName}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField control={form.control} name="saleDate" render={({ field }) => (
                                    <FormItem className="flex flex-col"><FormLabel>Data da Venda</FormLabel>
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

                             <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                                <FormField
                                    control={form.control}
                                    name="soldDose"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Dose Vendida (mg)</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecione" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {doseOptions.map(dose => (
                                                        <SelectItem key={dose.value} value={dose.value}>
                                                            {dose.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField control={form.control} name="price" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Valor (R$)</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" {...field} disabled />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                 <FormField control={form.control} name="discount" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Desconto (R$)</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                 <FormField control={form.control} name="total" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Valor Total (R$)</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" {...field} disabled />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                                 <FormField control={form.control} name="paymentStatus" render={({ field }) => (
                                    <FormItem className="space-y-3">
                                        <FormLabel>Status do Pagamento</FormLabel>
                                        <FormControl>
                                            <RadioGroup
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                            className="flex items-center gap-6"
                                            >
                                            <FormItem className="flex items-center space-x-3 space-y-0">
                                                <FormControl><RadioGroupItem value="pago" /></FormControl>
                                                <FormLabel className="font-normal">Pago</FormLabel>
                                            </FormItem>
                                            <FormItem className="flex items-center space-x-3 space-y-0">
                                                <FormControl><RadioGroupItem value="pendente" /></FormControl>
                                                <FormLabel className="font-normal">Pendente</FormLabel>
                                            </FormItem>
                                            </RadioGroup>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField control={form.control} name="paymentDate" render={({ field }) => (
                                    <FormItem className="flex flex-col"><FormLabel>Data do Pagamento</FormLabel>
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

                             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                                 <FormField
                                    control={form.control}
                                    name="deliveryStatus"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Status da Entrega</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecione o status" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="em processamento">Em Processamento</SelectItem>
                                                    <SelectItem value="em agendamento">Em Agendamento</SelectItem>
                                                    <SelectItem value="entregue">Entregue</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField control={form.control} name="deliveryDate" render={({ field }) => (
                                    <FormItem className="flex flex-col"><FormLabel>Data da Entrega</FormLabel>
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

                            <FormField control={form.control} name="observations" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Observações</FormLabel>
                                    <FormControl>
                                        <Textarea rows={4} placeholder="Alguma observação sobre a venda ou entrega..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            
                            <div className="flex justify-end gap-2 pt-4">
                                <Button type="button" variant="outline" onClick={() => router.push('/sales-control')} disabled={isSubmitting}>Cancelar</Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? 'Salvando...' : 'Salvar Venda'}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </>
    )
}

    
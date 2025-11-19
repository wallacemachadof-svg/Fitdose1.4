
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
import { CalendarIcon, ArrowLeft, AlertTriangle, Star } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { addSale, getPatients, getVials, type Patient, type Vial } from "@/lib/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const doseOptions = [
    { value: '2.5', label: '2.5 mg (10UI)', price: 220 },
    { value: '3.75', label: '3.75 mg (15UI)', price: 330 },
    { value: '5.0', label: '5.0 mg (20UI)', price: 430 },
    { value: '6.25', label: '6.25 mg (25UI)', price: 540 },
    { value: '7.5', label: '7.5 mg (30UI)', price: 620 },
];

const saleFormSchema = z.object({
  patientId: z.string({ required_error: "Selecione um cliente." }),
  saleDate: z.date({ required_error: "A data da venda é obrigatória." }),
  soldDose: z.string({ required_error: "Selecione uma dose." }),
  quantity: z.coerce.number().min(1, "A quantidade deve ser pelo menos 1.").default(1),
  price: z.coerce.number().min(0, "O preço não pode ser negativo."),
  discount: z.coerce.number().min(0, "O desconto não pode ser negativo.").optional(),
  total: z.coerce.number(),
  paymentStatus: z.enum(["pago", "pendente"], { required_error: "Selecione o status do pagamento." }),
  paymentDate: z.date().optional(),
  deliveryStatus: z.enum(["em agendamento", "entregue", "em processamento"], { required_error: "Selecione o status da entrega." }),
  deliveryDate: z.date().optional(),
  observations: z.string().optional(),
  pointsUsed: z.coerce.number().optional(),
});

type SaleFormValues = z.infer<typeof saleFormSchema>;

export default function NewSalePage() {
    const router = useRouter();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [vials, setVials] = useState<Vial[]>([]);
    const [totalRemainingMg, setTotalRemainingMg] = useState(0);

    useEffect(() => {
        const fetchData = async () => {
            const [patientsData, vialsData] = await Promise.all([getPatients(), getVials()]);
            setPatients(patientsData);
            setVials(vialsData);
            const remainingMg = vialsData.reduce((acc, v) => acc + v.remainingMg, 0);
            setTotalRemainingMg(remainingMg);
        };
        fetchData();
    }, []);

    const form = useForm<SaleFormValues>({
        resolver: zodResolver(saleFormSchema),
        defaultValues: {
            patientId: '',
            soldDose: '',
            quantity: 1,
            price: 0,
            discount: 0,
            total: 0,
            paymentStatus: "pendente",
            deliveryStatus: "em processamento",
            observations: "",
            pointsUsed: 0,
        },
    });
    
    const watchPatientId = form.watch("patientId");
    const watchSoldDose = form.watch("soldDose");
    const watchQuantity = form.watch("quantity");
    const watchPrice = form.watch("price");
    const watchDiscount = form.watch("discount");

    useEffect(() => {
        const patient = patients.find(p => p.id === watchPatientId);
        setSelectedPatient(patient || null);
        form.setValue("discount", 0);
        form.setValue("pointsUsed", 0);
    }, [watchPatientId, patients, form]);

    const selectedDoseMg = parseFloat(watchSoldDose || '0');
    const totalSoldMg = selectedDoseMg * (watchQuantity || 1);
    const isStockInsufficient = totalRemainingMg < totalSoldMg;

    useEffect(() => {
        const dose = doseOptions.find(d => d.value === watchSoldDose);
        if (dose) {
            form.setValue("price", dose.price * (watchQuantity || 1));
        } else {
            form.setValue("price", 0);
        }
        form.setValue("discount", 0);
        form.setValue("pointsUsed", 0);
    }, [watchSoldDose, watchQuantity, form]);

    useEffect(() => {
        const total = (watchPrice || 0) - (watchDiscount || 0);
        form.setValue("total", total < 0 ? 0 : total);
        
        // Convert discount back to points
        const pointsToUse = (watchDiscount || 0) * 10;
        form.setValue("pointsUsed", pointsToUse);

    }, [watchPrice, watchDiscount, form]);

    const maxDiscountAvailable = selectedPatient ? Math.floor(selectedPatient.points || 0) / 10 : 0;
    
    async function onSubmit(data: SaleFormValues) {
        if (isStockInsufficient) {
             toast({
                variant: "destructive",
                title: "Estoque Insuficiente",
                description: `Não há matéria-prima suficiente para vender a dose de ${totalSoldMg}mg.`,
            });
            return;
        }

        if (data.discount && data.discount > maxDiscountAvailable) {
             toast({
                variant: "destructive",
                title: "Pontos Insuficientes",
                description: `O desconto máximo disponível para este paciente é de ${formatCurrency(maxDiscountAvailable)}.`,
            });
            return;
        }

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

            {isStockInsufficient && watchSoldDose && (
                 <Alert variant="destructive" className="mb-6">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Estoque Insuficiente!</AlertTitle>
                    <AlertDescription>
                        Você não possui matéria-prima suficiente para vender a quantidade selecionada. 
                        Apenas {totalRemainingMg.toFixed(2)}mg estão disponíveis. 
                        Acesse a página de <Link href="/stock-control" className="font-bold underline">Controle de Estoque</Link> para adicionar novos frascos.
                    </AlertDescription>
                </Alert>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Registrar Nova Venda</CardTitle>
                    <CardDescription>Preencha os dados abaixo para registrar uma nova venda.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                            <fieldset disabled={isSubmitting || (isStockInsufficient && !!watchSoldDose)} className="space-y-8">
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
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                     <FormField
                                        control={form.control}
                                        name="soldDose"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Dose (mg)</FormLabel>
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
                                     <FormField control={form.control} name="quantity" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Quantidade de Doses</FormLabel>
                                            <FormControl>
                                                <Input type="number" min="1" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    <FormField control={form.control} name="price" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Subtotal (R$)</FormLabel>
                                            <FormControl>
                                                <Input type="number" step="0.01" {...field} disabled />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                    <FormField control={form.control} name="discount" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Desconto por Pontos (R$)</FormLabel>
                                            <FormControl>
                                                <Input type="number" step="0.01" {...field} max={maxDiscountAvailable} />
                                            </FormControl>
                                            {selectedPatient && <FormDescription className="text-xs">Disponível: {formatCurrency(maxDiscountAvailable)} ({selectedPatient.points || 0} pts)</FormDescription>}
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
                            </fieldset>
                            
                            <div className="flex justify-end gap-2 pt-4">
                                <Button type="button" variant="outline" onClick={() => router.push('/sales-control')} disabled={isSubmitting}>Cancelar</Button>
                                <Button type="submit" disabled={isSubmitting || (isStockInsufficient && !!watchSoldDose)}>
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

    
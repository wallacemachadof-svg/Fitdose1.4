

'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import * as z from "zod";
import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CalendarIcon, ArrowLeft, Loader2, ChevronDown, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { getSaleById, updateSale, getPatients, getPatientById, getSettings, type Patient, type Bioimpedance, type DosePrice, type Sale } from "@/lib/actions";
import { Combobox } from "@/components/ui/combobox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";

const deliverySchema = z.object({
  doseNumber: z.number(),
  status: z.enum(['em agendamento', 'entregue', 'em processamento']),
  deliveryDate: z.date().optional(),
});

const saleFormSchema = z.object({
    patientId: z.string({ required_error: 'Selecione um paciente.' }),
    saleDate: z.date({ required_error: 'A data da venda é obrigatória.' }),
    soldDose: z.string().min(1, 'A dose vendida é obrigatória.'),
    quantity: z.coerce.number().min(1, 'A quantidade deve ser pelo menos 1.'),
    price: z.coerce.number().min(0, 'O preço é obrigatório.'),
    discountPerDose: z.coerce.number().min(0).optional().default(0),
    pointsUsed: z.coerce.number().min(0).optional().default(0),
    total: z.coerce.number().min(0),
    serviceModel: z.enum(['presencial', 'online', 'hibrido']).optional(),
    paymentStatus: z.enum(['pago', 'pendente'], { required_error: 'O status do pagamento é obrigatório.' }),
    paymentMethod: z.enum(['dinheiro', 'pix', 'debito', 'credito', 'credito_parcelado', 'payment_link']).optional(),
    installments: z.coerce.number().min(2).max(12).optional(),
    operatorFee: z.coerce.number().min(0).optional().default(0),
    cashFlowMethod: z.enum(['unique', 'installments']).default('unique'),
    paymentDate: z.date().optional(),
    paymentDueDate: z.date().optional(),
    observations: z.string().optional(),
    bioimpedance: z.object({
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
    }).optional(),
    deliveries: z.array(deliverySchema).optional(),
});

type SaleFormValues = z.infer<typeof saleFormSchema>;

const bioimpedanceFields: { key: keyof Bioimpedance, label: string }[] = [
    { key: 'weight', label: 'Peso(Kg)' }, { key: 'bmi', label: 'IMC' }, { key: 'fatPercentage', label: 'Gordura(%)' }, { key: 'skeletalMusclePercentage', label: 'M. Esquelética(%)' }, { key: 'visceralFat', label: 'Gordura Visceral' }, { key: 'hydration', label: 'Água(%)' }, { key: 'metabolism', label: 'Metabolismo(kcal)' }, { key: 'obesityPercentage', label: 'Obesidade(%)' }, { key: 'boneMass', label: 'Ossos(Kg)' }, { key: 'protein', label: 'Proteína(%)' },
];

export default function EditSalePage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [patients, setPatients] = useState<{ value: string, label: string }[]>([]);
    const [dosePrices, setDosePrices] = useState<DosePrice[]>([]);

    const form = useForm<SaleFormValues>({
        resolver: zodResolver(saleFormSchema),
    });

    const { watch, setValue, control } = form;
    const watchPrice = watch("price");
    const watchDiscountPerDose = watch("discountPerDose");
    const watchPointsUsed = watch("pointsUsed");
    const watchQuantity = watch("quantity");
    const watchPaymentStatus = watch("paymentStatus");
    const watchPaymentMethod = watch("paymentMethod");
    const watchInstallments = watch("installments");
    const watchTotal = watch("total");

    const { fields, replace } = useFieldArray({
        control,
        name: "deliveries",
    });

    useEffect(() => {
        async function fetchInitialData() {
            setLoading(true);
            const [patientsData, settings, saleData] = await Promise.all([
                getPatients(),
                getSettings(),
                getSaleById(id),
            ]);

            setPatients(patientsData.map(p => ({ value: p.id, label: p.fullName })));
            setDosePrices(settings.dosePrices || []);

            if (saleData) {
                form.reset({
                    ...saleData,
                    saleDate: new Date(saleData.saleDate),
                    paymentDate: saleData.paymentDate ? new Date(saleData.paymentDate) : undefined,
                    paymentDueDate: saleData.paymentDueDate ? new Date(saleData.paymentDueDate) : undefined,
                    deliveries: saleData.deliveries?.map(d => ({...d, deliveryDate: d.deliveryDate ? new Date(d.deliveryDate) : undefined}))
                });
            } else {
                toast({ variant: 'destructive', title: 'Erro', description: 'Venda não encontrada.'});
                router.push('/sales-control');
            }
            setLoading(false);
        }
        fetchInitialData();
    }, [id, router, toast, form]);

    useEffect(() => {
        const price = watchPrice || 0;
        const discount = watchDiscountPerDose || 0;
        const pointsDiscount = (watchPointsUsed || 0) / 10;
        const quantity = watchQuantity || 1;
        const total = (price * quantity) - (discount * quantity) - pointsDiscount;
        setValue("total", total > 0 ? total : 0);
    }, [watchPrice, watchDiscountPerDose, watchPointsUsed, watchQuantity, setValue]);

    async function onSubmit(data: SaleFormValues) {
        setIsSubmitting(true);
        try {
            await updateSale(id, data);
            toast({
                title: "Venda Atualizada!",
                description: "A venda foi atualizada com sucesso.",
            });
            router.push("/sales-control");
        } catch (error) {
             const errorMessage = error instanceof Error ? error.message : "Não foi possível salvar a venda. Tente novamente.";
             toast({ variant: "destructive", title: "Erro ao salvar", description: errorMessage });
        } finally {
            setIsSubmitting(false);
        }
    }

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-48" />
                <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-1/2" />
                        <Skeleton className="h-4 w-3/4" />
                    </CardHeader>
                    <CardContent className="space-y-8">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <div className="flex justify-end"><Skeleton className="h-10 w-32" /></div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
             <Button variant="ghost" asChild className="-ml-4">
                <Link href="/sales-control">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar para Vendas
                </Link>
            </Button>
            <Card className="w-full max-w-4xl mx-auto">
                <CardHeader>
                    <CardTitle>Editar Venda</CardTitle>
                    <CardDescription>Ajuste os detalhes da venda e do pagamento.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <FormField control={control} name="patientId" render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Paciente</FormLabel>
                                        <Combobox options={patients} value={field.value} onChange={(value) => field.onChange(value)} placeholder="Selecione..." noResultsText="Nenhum paciente encontrado." />
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                 <FormField control={control} name="saleDate" render={({ field }) => (
                                    <FormItem className="flex flex-col"><FormLabel>Data da Venda</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                        {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Escolha a data</span>}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start"><Calendar locale={ptBR} mode="single" selected={field.value} onSelect={field.onChange} captionLayout="dropdown-buttons" fromYear={2020} toYear={new Date().getFullYear() + 5} /></PopoverContent>
                                        </Popover>
                                    <FormMessage />
                                    </FormItem>
                                )}/>
                            </div>
                            <div className="space-y-4 pt-4 border-t">
                               <h3 className="text-lg font-semibold">Detalhes do Produto</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <FormField control={control} name="soldDose" render={({ field }) => (
                                        <FormItem><FormLabel>Dose (mg)</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                <SelectContent>{dosePrices.map(dp => <SelectItem key={dp.dose} value={dp.dose}>{dp.dose} mg</SelectItem>)}</SelectContent>
                                            </Select>
                                        <FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={control} name="quantity" render={({ field }) => (
                                        <FormItem><FormLabel>Quantidade</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                </div>
                            </div>
                           
                            <div className="space-y-4 pt-4 border-t">
                                <h3 className="text-lg font-semibold">Detalhes Financeiros</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 items-end">
                                     <FormField control={control} name="price" render={({ field }) => (
                                        <FormItem><FormLabel>Preço/Dose (R$)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                     <FormField control={control} name="discountPerDose" render={({ field }) => (
                                        <FormItem><FormLabel>Desconto/Dose (R$)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                     <FormField control={control} name="pointsUsed" render={({ field }) => (
                                        <FormItem><FormLabel>Pontos Resgatados</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                                    )}/>
                                     <FormField control={control} name="total" render={({ field }) => (
                                        <FormItem><FormLabel>Total (R$)</FormLabel><FormControl><Input type="number" step="0.01" {...field} readOnly className="bg-muted font-bold text-lg h-12" /></FormControl></FormItem>
                                    )}/>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField control={control} name="paymentStatus" render={({ field }) => (
                                        <FormItem><FormLabel>Status Pagamento</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                <SelectContent><SelectItem value="pago">Pago</SelectItem><SelectItem value="pendente">Pendente</SelectItem></SelectContent>
                                            </Select>
                                        <FormMessage /></FormItem>
                                    )}/>
                                     {watchPaymentStatus === 'pago' && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <FormField control={control} name="paymentDate" render={({ field }) => (
                                                <FormItem className="flex flex-col"><FormLabel>Data Pagamento</FormLabel>
                                                    <Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Escolha a data</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar locale={ptBR} mode="single" selected={field.value} onSelect={field.onChange} captionLayout="dropdown-buttons" fromYear={2020} toYear={new Date().getFullYear() + 5} /></PopoverContent></Popover>
                                                <FormMessage /></FormItem>
                                            )}/>
                                            <FormField control={control} name="paymentMethod" render={({ field }) => (
                                                <FormItem><FormLabel>Forma Pagamento</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                        <SelectContent><SelectItem value="pix">PIX</SelectItem><SelectItem value="dinheiro">Dinheiro</SelectItem><SelectItem value="debito">Débito</SelectItem><SelectItem value="credito">Crédito (1x)</SelectItem><SelectItem value="credito_parcelado">Crédito Parcelado</SelectItem><SelectItem value="payment_link">Link de Pagamento</SelectItem></SelectContent>
                                                    </Select>
                                                <FormMessage /></FormItem>
                                            )}/>
                                        </div>
                                     )}
                                     {watchPaymentStatus === 'pendente' && (
                                        <FormField control={control} name="paymentDueDate" render={({ field }) => (
                                                <FormItem className="flex flex-col"><FormLabel>Data Vencimento</FormLabel>
                                                    <Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Escolha a data</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar locale={ptBR} mode="single" selected={field.value} onSelect={field.onChange} captionLayout="dropdown-buttons" fromYear={2020} toYear={new Date().getFullYear() + 5} /></PopoverContent></Popover>
                                                <FormMessage /></FormItem>
                                            )}/>
                                     )}
                                </div>
                                {watchPaymentMethod === 'credito_parcelado' && (
                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                                        <FormField control={control} name="installments" render={({ field }) => (
                                            <FormItem><FormLabel>Nº de Parcelas</FormLabel>
                                                <Select onValueChange={(v) => field.onChange(parseInt(v, 10))} value={String(field.value || '')}>
                                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                    <SelectContent>{Array.from({length: 11}, (_, i) => i + 2).map(n => <SelectItem key={n} value={String(n)}>{n}x</SelectItem>)}</SelectContent>
                                                </Select>
                                            <FormMessage /></FormItem>
                                        )}/>
                                     </div>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                                     <FormField control={control} name="cashFlowMethod" render={({ field }) => (
                                        <FormItem className="space-y-3"><FormLabel>Registro no Caixa</FormLabel>
                                            <FormControl><RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col space-y-1">
                                                <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="unique" /></FormControl><FormLabel className="font-normal">Lançamento Único</FormLabel></FormItem>
                                                <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="installments" /></FormControl><FormLabel className="font-normal">Lançamento Parcelado</FormLabel></FormItem>
                                            </RadioGroup></FormControl>
                                        <FormMessage /></FormItem>
                                     )}/>
                                      <FormField control={control} name="operatorFee" render={({ field }) => (
                                            <FormItem><FormLabel>Taxa da Operadora (R$)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl></FormItem>
                                        )}/>
                                 </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>Cancelar</Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Salvando...</> : 'Salvar Alterações'}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    )
}

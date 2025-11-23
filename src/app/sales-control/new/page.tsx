

'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
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
import { CalendarIcon, ArrowLeft, Loader2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { addSale, getPatients, getPatientById, getSettings, type Patient, type Bioimpedance, type DosePrice } from "@/lib/actions";
import { Combobox } from "@/components/ui/combobox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";


const saleFormSchema = z.object({
    patientId: z.string({ required_error: 'Selecione um paciente.' }),
    saleDate: z.date({ required_error: 'A data da venda é obrigatória.' }),
    soldDose: z.string().min(1, 'A dose vendida é obrigatória.'),
    quantity: z.coerce.number().min(1, 'A quantidade deve ser pelo menos 1.'),
    price: z.coerce.number().min(0, 'O preço é obrigatório.'),
    discount: z.coerce.number().min(0).optional().default(0),
    pointsUsed: z.coerce.number().min(0).optional().default(0),
    total: z.coerce.number().min(0),
    paymentStatus: z.enum(['pago', 'pendente'], { required_error: 'O status do pagamento é obrigatório.' }),
    paymentMethod: z.enum(['dinheiro', 'pix', 'debito', 'credito', 'payment_link']).optional(),
    paymentDate: z.date().optional(),
    paymentDueDate: z.date().optional(),
    deliveryStatus: z.enum(['em agendamento', 'entregue', 'em processamento'], { required_error: 'O status da entrega é obrigatório.' }),
    deliveryDate: z.date().optional(),
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
});

type SaleFormValues = z.infer<typeof saleFormSchema>;

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


export default function NewSalePage() {
    const router = useRouter();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [patients, setPatients] = useState<{ value: string, label: string }[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [dosePrices, setDosePrices] = useState<DosePrice[]>([]);

    useEffect(() => {
        async function fetchInitialData() {
            const [patientData, settings] = await Promise.all([
                getPatients(),
                getSettings(),
            ]);
            setPatients(patientData.map(p => ({ value: p.id, label: p.fullName })));
            setDosePrices(settings.dosePrices || []);
        }
        fetchInitialData();
    }, []);


    const form = useForm<SaleFormValues>({
        resolver: zodResolver(saleFormSchema),
        defaultValues: {
            saleDate: new Date(),
            quantity: 1,
            discount: 0,
            pointsUsed: 0,
            paymentStatus: "pendente",
            deliveryStatus: "em agendamento",
            price: 0,
            soldDose: "",
            total: 0,
            observations: "",
            bioimpedance: {
                weight: undefined,
                bmi: undefined,
                fatPercentage: undefined,
                skeletalMusclePercentage: undefined,
                visceralFat: undefined,
                hydration: undefined,
                metabolism: undefined,
                obesityPercentage: undefined,
                boneMass: undefined,
                protein: undefined,
            }
        },
    });
    
    const { watch, setValue } = form;
    const watchPatientId = watch("patientId");
    const watchSoldDose = watch("soldDose");
    const watchPrice = watch("price");
    const watchDiscount = watch("discount");
    const watchPointsUsed = watch("pointsUsed");
    const watchQuantity = watch("quantity");
    const watchPaymentStatus = watch("paymentStatus");

     useEffect(() => {
        const fetchPatientDetails = async () => {
            if (watchPatientId) {
                const patient = await getPatientById(watchPatientId);
                setSelectedPatient(patient);
                // Set dose and price based on patient's default or global settings
                const defaultDose = patient?.defaultDose || '';
                setValue("soldDose", defaultDose);
                
                const dosePriceInfo = dosePrices.find(dp => dp.dose === defaultDose);
                const priceToSet = patient?.defaultPrice ?? dosePriceInfo?.price ?? 0;
                setValue("price", priceToSet);

            } else {
                setSelectedPatient(null);
            }
        };
        fetchPatientDetails();
    }, [watchPatientId, setValue, dosePrices]);

    useEffect(() => {
        if (watchSoldDose) {
            const dosePrice = dosePrices.find(dp => dp.dose === watchSoldDose);
            if (dosePrice) {
                setValue("price", dosePrice.price);
            }
        }
    }, [watchSoldDose, dosePrices, setValue]);


    useEffect(() => {
        const price = watchPrice || 0;
        const discount = watchDiscount || 0;
        const pointsDiscount = (watchPointsUsed || 0) / 10;
        const quantity = watchQuantity || 1;
        const total = (price * quantity) - discount - pointsDiscount;
        setValue("total", total > 0 ? total : 0);
    }, [watchPrice, watchDiscount, watchPointsUsed, watchQuantity, setValue]);

    async function onSubmit(data: SaleFormValues) {
        setIsSubmitting(true);
        try {
            await addSale(data);
            toast({
                title: "Venda Registrada!",
                description: `A venda para ${selectedPatient?.fullName} foi registrada com sucesso.`,
            });
            router.push("/patients");
        } catch (error) {
             const errorMessage = error instanceof Error ? error.message : "Não foi possível salvar a venda. Tente novamente.";
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
            <Card className="w-full max-w-4xl mx-auto">
                <CardHeader>
                    <CardTitle>Lançar Venda e Aplicação</CardTitle>
                    <CardDescription>Preencha os dados abaixo para registrar uma nova venda e aplicação.</CardDescription>
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
                                 <FormField control={form.control} name="saleDate" render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Data da Venda/Aplicação *</FormLabel>
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
                            
                            <Collapsible>
                                <CollapsibleTrigger asChild>
                                    <Button variant="link" className="p-0 text-base">
                                        <ChevronDown className="h-4 w-4 mr-2" />
                                        Adicionar Dados da Bioimpedância (Opcional)
                                    </Button>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <Card className="mt-4 bg-muted/30">
                                        <CardHeader><CardTitle className="text-lg">Bioimpedância</CardTitle></CardHeader>
                                        <CardContent className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                            {bioimpedanceFields.map(field => (
                                                 <FormField 
                                                    key={field.key}
                                                    control={form.control} 
                                                    name={`bioimpedance.${field.key}`}
                                                    render={({ field: formField }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-xs">{field.label}</FormLabel>
                                                            <FormControl>
                                                                <Input type="number" step="0.1" placeholder="-" {...formField} value={formField.value ?? ''} />
                                                            </FormControl>
                                                        </FormItem>
                                                    )}
                                                 />
                                            ))}
                                        </CardContent>
                                    </Card>
                                </CollapsibleContent>
                            </Collapsible>

                            <div className="space-y-4 pt-4 border-t">
                               <h3 className="text-lg font-semibold">Detalhes do Produto</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="soldDose"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Dose Vendida (mg) *</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Selecione a dose" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {dosePrices.map(dp => (
                                                            <SelectItem key={dp.dose} value={dp.dose}>
                                                                {dp.dose} mg
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField control={form.control} name="quantity" render={({ field }) => (
                                        <FormItem><FormLabel>Quantidade *</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                </div>
                            </div>
                           
                            <div className="space-y-4 pt-4 border-t">
                                <h3 className="text-lg font-semibold">Detalhes Financeiros</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
                                     <FormField control={form.control} name="price" render={({ field }) => (
                                        <FormItem><FormLabel>Preço por Dose (R$) *</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                     <FormField control={form.control} name="discount" render={({ field }) => (
                                        <FormItem><FormLabel>Desconto (R$)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                     <FormField control={form.control} name="pointsUsed" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Pontos Resgatados</FormLabel>
                                            <FormControl><Input type="number" {...field} /></FormControl>
                                            <FormDescription className="text-xs">
                                                {selectedPatient ? `${selectedPatient.points || 0} pontos disponíveis` : 'Selecione um paciente'}
                                            </FormDescription>
                                        </FormItem>
                                    )}/>
                                     <FormField control={form.control} name="total" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Total a Pagar (R$)</FormLabel>
                                            <FormControl><Input type="number" step="0.01" {...field} readOnly className="bg-muted" /></FormControl>
                                        </FormItem>
                                    )}/>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField control={form.control} name="paymentStatus" render={({ field }) => (
                                        <FormItem><FormLabel>Status Pagamento *</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Selecione o status" /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="pago">Pago</SelectItem>
                                                    <SelectItem value="pendente">Pendente</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        <FormMessage /></FormItem>
                                    )}/>
                                     {watchPaymentStatus === 'pago' && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                             <FormField
                                                control={form.control}
                                                name="paymentMethod"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Forma de Pagamento</FormLabel>
                                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Selecione..." />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                <SelectItem value="pix">PIX</SelectItem>
                                                                <SelectItem value="dinheiro">Dinheiro</SelectItem>
                                                                <SelectItem value="debito">Débito</SelectItem>
                                                                <SelectItem value="credito">Crédito</SelectItem>
                                                                <SelectItem value="payment_link">Link de Pagamento</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                     )}
                                     {watchPaymentStatus === 'pendente' && (
                                        <FormField control={form.control} name="paymentDueDate" render={({ field }) => (
                                                <FormItem className="flex flex-col"><FormLabel>Data Prevista de Pagamento</FormLabel>
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
                                     )}
                                </div>
                            </div>
                           
                            <div className="space-y-4 pt-4 border-t">
                                <h3 className="text-lg font-semibold">Detalhes da Entrega</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     <FormField control={form.control} name="deliveryStatus" render={({ field }) => (
                                        <FormItem><FormLabel>Status Entrega *</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Selecione o status" /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="entregue">Entregue</SelectItem>
                                                    <SelectItem value="em agendamento">Em Agendamento</SelectItem>
                                                    <SelectItem value="em processamento">Em Processamento</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        <FormMessage /></FormItem>
                                    )}/>
                                    {form.watch('deliveryStatus') === 'entregue' && (
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
                                     )}
                                </div>
                            </div>
                            
                            <div className="pt-4 border-t">
                                <FormField control={form.control} name="observations" render={({ field }) => (
                                    <FormItem><FormLabel>Observações</FormLabel><FormControl><Textarea placeholder="Alguma observação sobre a venda ou entrega?" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>Cancelar</Button>
                                <Button type="submit" disabled={isSubmitting || !watchPatientId}>
                                    {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Salvando...</> : 'Salvar Venda'}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    )
}

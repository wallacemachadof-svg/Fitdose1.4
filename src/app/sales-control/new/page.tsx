

'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CalendarIcon, ArrowLeft, Loader2, ChevronDown, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { addSale, getPatients, getPatientById, getSettings, type Patient, type Bioimpedance, type DosePrice } from "@/lib/actions";
import { Combobox } from "@/components/ui/combobox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";

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
    const [totalDiscount, setTotalDiscount] = useState(0);

    const form = useForm<SaleFormValues>({
        resolver: zodResolver(saleFormSchema),
        defaultValues: {
            saleDate: new Date(),
            quantity: 1,
            discountPerDose: 0,
            pointsUsed: 0,
            paymentStatus: "pendente",
            price: 0,
            soldDose: "",
            total: 0,
            observations: "",
            operatorFee: 0,
            cashFlowMethod: 'unique',
            bioimpedance: {
                weight: undefined, bmi: undefined, fatPercentage: undefined, skeletalMusclePercentage: undefined, visceralFat: undefined, hydration: undefined, metabolism: undefined, obesityPercentage: undefined, boneMass: undefined, protein: undefined,
            },
            deliveries: [{ doseNumber: 1, status: 'em agendamento', deliveryDate: undefined }]
        },
    });
    
    const { watch, setValue, control } = form;
    const watchPatientId = watch("patientId");
    const watchSoldDose = watch("soldDose");
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
        const numDoses = watchQuantity || 1;
        const currentDeliveries = form.getValues('deliveries') || [];
        const newDeliveries = Array.from({ length: numDoses }, (_, i) => {
            return currentDeliveries[i] || {
                doseNumber: i + 1,
                status: 'em agendamento' as const,
                deliveryDate: undefined,
            };
        });
        replace(newDeliveries);
    }, [watchQuantity, form, replace]);


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

     useEffect(() => {
        const fetchPatientDetails = async () => {
            if (watchPatientId) {
                const patient = await getPatientById(watchPatientId);
                setSelectedPatient(patient);
                const defaultDose = patient?.defaultDose || '';
                setValue("soldDose", defaultDose);
                setValue("serviceModel", patient?.serviceModel || 'presencial');
                
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
        const discount = watchDiscountPerDose || 0;
        const pointsDiscount = (watchPointsUsed || 0) / 10;
        const quantity = watchQuantity || 1;
        const total = (price - discount) * quantity - pointsDiscount;
        setValue("total", total > 0 ? total : 0);
        setTotalDiscount(discount * quantity);
    }, [watchPrice, watchDiscountPerDose, watchPointsUsed, watchQuantity, setValue]);

    const handleCalculateFee = () => {
        const total = watchTotal;
        const installments = watchInstallments || 1;
        
        // As taxas da InfinityPay podem variar, este é um exemplo aproximado
        // Crédito 1x: ~4-5%
        // Débito: ~1.4-2%
        // Parcelado: a taxa aumenta com o número de parcelas
        let rate = 0;
        if (watchPaymentMethod === 'credito') {
            rate = 0.0499; // Exemplo: 4.99%
        } else if (watchPaymentMethod === 'debito') {
            rate = 0.0199; // Exemplo: 1.99%
        } else if (watchPaymentMethod === 'credito_parcelado') {
            // Tabela de exemplo progressiva, pode ser ajustada
            const rateMap: { [key: number]: number } = {
                2: 0.075, 3: 0.085, 4: 0.095, 5: 0.105, 6: 0.115,
                7: 0.125, 8: 0.135, 9: 0.145, 10: 0.155, 11: 0.165, 12: 0.175,
            };
            rate = rateMap[installments] || 0.175;
        }

        if (rate > 0) {
            const fee = total * rate;
            setValue('operatorFee', parseFloat(fee.toFixed(2)));
            toast({
                title: "Taxa Calculada!",
                description: `Estimativa de taxa: R$ ${fee.toFixed(2)} (${(rate * 100).toFixed(2)}%)`
            });
        } else {
             toast({
                variant: 'destructive',
                title: "Não aplicável",
                description: `O cálculo automático de taxa não se aplica a esta forma de pagamento.`
            });
        }
    }


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
                                <FormField control={control} name="patientId" render={({ field }) => (
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
                                 <FormField control={control} name="saleDate" render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Data da Venda/Aplicação *</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Input
                                                            placeholder="dd/MM/yyyy"
                                                            value={field.value ? format(field.value, 'dd/MM/yyyy') : ''}
                                                            onChange={(e) => {
                                                                const date = parse(e.target.value, 'dd/MM/yyyy', new Date());
                                                                if (!isNaN(date.getTime())) {
                                                                    field.onChange(date);
                                                                }
                                                            }}
                                                        />
                                                        <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50" />
                                                    </div>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar locale={ptBR} mode="single" selected={field.value} onSelect={field.onChange} initialFocus captionLayout="dropdown-buttons" fromYear={2020} toYear={new Date().getFullYear() + 5} />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                            </div>

                            <FormField control={control} name="serviceModel" render={({ field }) => (
                                <FormItem className="space-y-3">
                                    <FormLabel>Modelo de Atendimento da Venda</FormLabel>
                                    <FormControl>
                                        <RadioGroup onValueChange={field.onChange} value={field.value} className="flex items-center gap-6">
                                            <FormItem className="flex items-center space-x-3 space-y-0">
                                                <FormControl><RadioGroupItem value="presencial" /></FormControl>
                                                <FormLabel className="font-normal">Presencial</FormLabel>
                                            </FormItem>
                                            <FormItem className="flex items-center space-x-3 space-y-0">
                                                <FormControl><RadioGroupItem value="online" /></FormControl>
                                                <FormLabel className="font-normal">Online</FormLabel>
                                            </FormItem>
                                            <FormItem className="flex items-center space-x-3 space-y-0">
                                                <FormControl><RadioGroupItem value="hibrido" /></FormControl>
                                                <FormLabel className="font-normal">Híbrido</FormLabel>
                                            </FormItem>
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            
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
                                                    control={control} 
                                                    name={`bioimpedance.${field.key}`}
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
                                </CollapsibleContent>
                            </Collapsible>

                            <div className="space-y-4 pt-4 border-t">
                               <h3 className="text-lg font-semibold">Detalhes do Produto</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <FormField
                                        control={control}
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
                                    <FormField control={control} name="quantity" render={({ field }) => (
                                        <FormItem><FormLabel>Quantidade *</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                </div>
                            </div>
                           
                            <div className="space-y-4 pt-4 border-t">
                                <h3 className="text-lg font-semibold">Detalhes Financeiros</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 items-end">
                                     <FormField control={control} name="price" render={({ field }) => (
                                        <FormItem><FormLabel>Preço por Dose (R$)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                     <FormField control={control} name="discountPerDose" render={({ field }) => (
                                        <FormItem><FormLabel>Desconto por Dose (R$)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormItem>
                                        <FormLabel>Desconto Total (R$)</FormLabel>
                                        <Input type="number" step="0.01" value={totalDiscount.toFixed(2)} readOnly className="bg-muted" />
                                    </FormItem>
                                     <FormField control={control} name="pointsUsed" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Pontos Resgatados</FormLabel>
                                            <FormControl><Input type="number" {...field} /></FormControl>
                                            <FormDescription className="text-xs">
                                                {selectedPatient ? `${selectedPatient.points || 0} pontos disponíveis` : 'Selecione um paciente'}
                                            </FormDescription>
                                        </FormItem>
                                    )}/>
                                     <FormField control={control} name="total" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Total a Pagar (R$)</FormLabel>
                                            <FormControl><Input type="number" step="0.01" {...field} readOnly className="bg-muted font-bold text-lg h-12" /></FormControl>
                                        </FormItem>
                                    )}/>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField control={control} name="paymentStatus" render={({ field }) => (
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
                                            <FormField control={control} name="paymentDate" render={({ field }) => (
                                                <FormItem className="flex flex-col"><FormLabel>Data do Pagamento</FormLabel>
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <FormControl>
                                                              <div className="relative">
                                                                  <Input
                                                                      placeholder="dd/MM/yyyy"
                                                                      value={field.value ? format(field.value, 'dd/MM/yyyy') : ''}
                                                                      onChange={(e) => {
                                                                          const date = parse(e.target.value, 'dd/MM/yyyy', new Date());
                                                                          if (!isNaN(date.getTime())) {
                                                                              field.onChange(date);
                                                                          }
                                                                      }}
                                                                  />
                                                                  <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50" />
                                                              </div>
                                                            </FormControl>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-0" align="start">
                                                            <Calendar locale={ptBR} mode="single" selected={field.value} onSelect={field.onChange} initialFocus captionLayout="dropdown-buttons" fromYear={2020} toYear={new Date().getFullYear() + 5}/>
                                                        </PopoverContent>
                                                    </Popover>
                                                <FormMessage />
                                                </FormItem>
                                            )}/>
                                            <FormField control={control} name="paymentMethod" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Forma de Pagamento</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="pix">PIX</SelectItem>
                                                            <SelectItem value="dinheiro">Dinheiro</SelectItem>
                                                            <SelectItem value="debito">Débito</SelectItem>
                                                            <SelectItem value="credito">Crédito (1x)</SelectItem>
                                                            <SelectItem value="credito_parcelado">Crédito Parcelado</SelectItem>
                                                            <SelectItem value="payment_link">Link de Pagamento</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}/>
                                        </div>
                                     )}
                                     {watchPaymentStatus === 'pendente' && (
                                        <FormField control={control} name="paymentDueDate" render={({ field }) => (
                                                <FormItem className="flex flex-col"><FormLabel>Data Prevista de Pagamento</FormLabel>
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <FormControl>
                                                            <div className="relative">
                                                                <Input
                                                                    placeholder="dd/MM/yyyy"
                                                                    value={field.value ? format(field.value, 'dd/MM/yyyy') : ''}
                                                                    onChange={(e) => {
                                                                        const date = parse(e.target.value, 'dd/MM/yyyy', new Date());
                                                                        if (!isNaN(date.getTime())) {
                                                                            field.onChange(date);
                                                                        }
                                                                    }}
                                                                />
                                                                <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50" />
                                                            </div>
                                                            </FormControl>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-0" align="start">
                                                            <Calendar locale={ptBR} mode="single" selected={field.value} onSelect={field.onChange} initialFocus captionLayout="dropdown-buttons" fromYear={2020} toYear={new Date().getFullYear() + 5} />
                                                        </PopoverContent>
                                                    </Popover>
                                                <FormMessage />
                                                </FormItem>
                                            )}/>
                                     )}
                                </div>
                                {watchPaymentMethod === 'credito_parcelado' && (
                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                                        <FormField control={control} name="installments" render={({ field }) => (
                                            <FormItem><FormLabel>Nº de Parcelas (Cliente)</FormLabel>
                                                <Select onValueChange={(v) => field.onChange(parseInt(v, 10))} value={String(field.value || '')}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        {Array.from({length: 11}, (_, i) => i + 2).map(n => <SelectItem key={n} value={String(n)}>{n}x</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            <FormMessage /></FormItem>
                                        )}/>
                                     </div>
                                )}
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                                     <FormField control={control} name="cashFlowMethod" render={({ field }) => (
                                        <FormItem className="space-y-3">
                                            <FormLabel>Como registrar no Caixa?</FormLabel>
                                            <FormControl>
                                                <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col space-y-1">
                                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                                        <FormControl><RadioGroupItem value="unique" /></FormControl>
                                                        <FormLabel className="font-normal">Lançamento Único (Valor Total Líquido)</FormLabel>
                                                    </FormItem>
                                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                                        <FormControl><RadioGroupItem value="installments" /></FormControl>
                                                        <FormLabel className="font-normal">Lançamento Parcelado (Mês a Mês)</FormLabel>
                                                    </FormItem>
                                                </RadioGroup>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                     )}/>
                                      <FormField control={control} name="operatorFee" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Taxa da Operadora (R$)</FormLabel>
                                                <div className="flex items-center gap-2">
                                                    <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                                                     <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={handleCalculateFee}><Wand2 className="h-4 w-4"/></Button>
                                                </div>
                                                <FormDescription>Valor descontado pela maquininha.</FormDescription>
                                            </FormItem>
                                        )}/>
                                 </div>
                            </div>
                           
                            <div className="space-y-4 pt-4 border-t">
                                <h3 className="text-lg font-semibold">Gerenciamento de Entregas</h3>
                                {fields.map((field, index) => (
                                    <div key={field.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end p-4 border rounded-lg">
                                        <p className="font-semibold text-sm md:col-span-3">Dose {index + 1}</p>
                                         <FormField
                                            control={control}
                                            name={`deliveries.${index}.status`}
                                            render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Status Entrega</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione o status" /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="entregue">Entregue</SelectItem>
                                                        <SelectItem value="em agendamento">Em Agendamento</SelectItem>
                                                        <SelectItem value="em processamento">Em Processamento</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={control}
                                            name={`deliveries.${index}.deliveryDate`}
                                            render={({ field }) => (
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
                                            )}
                                        />
                                    </div>
                                ))}
                            </div>
                            
                            <div className="pt-4 border-t">
                                <FormField control={control} name="observations" render={({ field }) => (
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

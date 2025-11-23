

'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CalendarIcon, ArrowLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { addCashFlowEntry } from "@/lib/actions";

const cashFlowFormSchema = z.object({
    type: z.enum(['entrada', 'saida'], { required_error: 'O tipo é obrigatório.' }),
    purchaseDate: z.date({ required_error: 'A data é obrigatória.' }),
    description: z.string().min(3, 'A descrição é obrigatória.'),
    amount: z.coerce.number().positive('O valor deve ser positivo.'),
    paymentMethod: z.enum(['pix', 'dinheiro', 'debito', 'credito', 'credito_parcelado', 'payment_link'], { required_error: "Forma de pagamento é obrigatória."}),
    status: z.enum(['pago', 'pendente', 'vencido'], { required_error: 'O status é obrigatório.' }),
    dueDate: z.date().optional(),
    installments: z.coerce.number().int().min(1).optional(),
}).refine(data => {
    if(data.paymentMethod === 'credito_parcelado') {
        return data.installments && data.installments > 1 && data.dueDate;
    }
    return true;
}, {
    message: 'Para crédito parcelado, informe o número de parcelas (>1) e a data do primeiro vencimento.',
    path: ['installments']
});

type CashFlowFormValues = z.infer<typeof cashFlowFormSchema>;

export default function NewCashFlowPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<CashFlowFormValues>({
        resolver: zodResolver(cashFlowFormSchema),
        defaultValues: {
            type: 'saida',
            status: 'pendente',
            installments: 1,
        },
    });

    const watchPaymentMethod = form.watch('paymentMethod');

    async function onSubmit(data: CashFlowFormValues) {
        setIsSubmitting(true);
        try {
            await addCashFlowEntry(data);
            toast({
                title: "Lançamento Adicionado!",
                description: `O lançamento foi adicionado ao fluxo de caixa com sucesso.`,
            });
            router.push("/cash-flow");
        } catch (error) {
            console.error("Failed to add cash flow entry", error);
             toast({
                variant: "destructive",
                title: "Erro ao salvar",
                description: "Não foi possível salvar o lançamento. Tente novamente.",
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <>
            <Button variant="ghost" asChild className="mb-4 -ml-4">
                <Link href="/cash-flow">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar para o Fluxo de Caixa
                </Link>
            </Button>
            <Card>
                <CardHeader>
                    <CardTitle>Novo Lançamento no Caixa</CardTitle>
                    <CardDescription>Preencha os dados abaixo para registrar uma nova movimentação.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                            
                            <FormField control={form.control} name="type" render={({ field }) => (
                                <FormItem className="space-y-3">
                                    <FormLabel>Tipo de Lançamento</FormLabel>
                                    <FormControl>
                                        <RadioGroup
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                        className="flex items-center gap-6"
                                        >
                                        <FormItem className="flex items-center space-x-3 space-y-0">
                                            <FormControl><RadioGroupItem value="entrada" /></FormControl>
                                            <FormLabel className="font-normal">Entrada</FormLabel>
                                        </FormItem>
                                        <FormItem className="flex items-center space-x-3 space-y-0">
                                            <FormControl><RadioGroupItem value="saida" /></FormControl>
                                            <FormLabel className="font-normal">Saída</FormLabel>
                                        </FormItem>
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>

                            <FormField control={form.control} name="description" render={({ field }) => (
                                <FormItem><FormLabel>Descrição</FormLabel><FormControl><Input placeholder="Ex: Compra de material de escritório" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <FormField control={form.control} name="amount" render={({ field }) => (
                                    <FormItem><FormLabel>Valor Total (R$)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="Ex: 150.00" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="purchaseDate" render={({ field }) => (
                                    <FormItem className="flex flex-col"><FormLabel>Data da Compra</FormLabel>
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
                                                    <SelectItem value="credito">Crédito (1x)</SelectItem>
                                                    <SelectItem value="credito_parcelado">Crédito Parcelado</SelectItem>
                                                    <SelectItem value="payment_link">Link de Pagamento</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="status"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Status</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecione o status" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="pago">Pago</SelectItem>
                                                    <SelectItem value="pendente">Pendente</SelectItem>
                                                    <SelectItem value="vencido">Vencido</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            
                            {watchPaymentMethod === 'credito_parcelado' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
                                     <FormField control={form.control} name="installments" render={({ field }) => (
                                        <FormItem><FormLabel>Número de Parcelas</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="dueDate" render={({ field }) => (
                                        <FormItem className="flex flex-col"><FormLabel>Vencimento da 1ª Parcela</FormLabel>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                    <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                        {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Escolha a data</span>}
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
                            ) : (
                                <FormField control={form.control} name="dueDate" render={({ field }) => (
                                    <FormItem className="flex flex-col max-w-sm"><FormLabel>Data de Vencimento/Pagamento</FormLabel>
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
                            
                            <div className="flex justify-end gap-2 pt-4">
                                <Button type="button" variant="outline" onClick={() => router.push('/cash-flow')} disabled={isSubmitting}>Cancelar</Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Salvando...</> : 'Salvar Lançamento'}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </>
    )
}

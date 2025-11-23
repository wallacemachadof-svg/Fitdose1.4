

'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
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
import { getCashFlowEntryById, updateCashFlowEntry, type UpdateCashFlowData, type CashFlowEntry } from "@/lib/actions";
import { Skeleton } from "@/components/ui/skeleton";

const cashFlowEditFormSchema = z.object({
    type: z.enum(['entrada', 'saida'], { required_error: 'O tipo é obrigatório.' }),
    purchaseDate: z.date({ required_error: 'A data é obrigatória.' }),
    description: z.string().min(3, 'A descrição é obrigatória.'),
    amount: z.coerce.number().positive('O valor deve ser positivo.'),
    paymentMethod: z.enum(['pix', 'dinheiro', 'debito', 'credito', 'credito_parcelado', 'payment_link'], { required_error: "Forma de pagamento é obrigatória."}),
    status: z.enum(['pago', 'pendente', 'vencido'], { required_error: 'O status é obrigatório.' }),
    dueDate: z.date().optional(),
});

type CashFlowEditFormValues = z.infer<typeof cashFlowEditFormSchema>;

export default function EditCashFlowPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [entry, setEntry] = useState<CashFlowEntry | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<CashFlowEditFormValues>({
        resolver: zodResolver(cashFlowEditFormSchema),
    });

    useEffect(() => {
        if (!id) return;
        const fetchEntry = async () => {
            setLoading(true);
            const data = await getCashFlowEntryById(id);
            if (data) {
                setEntry(data);
                form.reset({
                    ...data,
                    purchaseDate: new Date(data.purchaseDate),
                    dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
                });
            } else {
                 toast({
                    variant: "destructive",
                    title: "Erro",
                    description: "Lançamento não encontrado.",
                });
                router.push('/cash-flow');
            }
            setLoading(false);
        };
        fetchEntry();
    }, [id, form, router, toast]);

    async function onSubmit(data: CashFlowEditFormValues) {
        if (!id) return;

        if (entry?.installments) {
            toast({
                variant: "destructive",
                title: "Ação não permitida",
                description: "Não é possível editar um lançamento que faz parte de um parcelamento. Exclua a compra original e lance novamente, se necessário.",
            });
            return;
        }

        setIsSubmitting(true);
        try {
            await updateCashFlowEntry(id, data);
            toast({
                title: "Lançamento Atualizado!",
                description: `O lançamento foi atualizado com sucesso.`,
            });
            router.push("/cash-flow");
        } catch (error) {
            console.error("Failed to update cash flow entry", error);
             toast({
                variant: "destructive",
                title: "Erro ao salvar",
                description: "Não foi possível salvar as alterações. Tente novamente.",
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    if (loading) {
        return (
            <div className="space-y-4">
                 <Skeleton className="h-10 w-48" />
                 <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-1/2" />
                        <Skeleton className="h-4 w-3/4" />
                    </CardHeader>
                    <CardContent className="space-y-8">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <div className="flex justify-end">
                            <Skeleton className="h-10 w-32" />
                        </div>
                    </CardContent>
                 </Card>
            </div>
        )
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
                    <CardTitle>Editar Lançamento</CardTitle>
                    <CardDescription>Atualize os dados da movimentação abaixo.</CardDescription>
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
                                        value={field.value}
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
                                            <Select onValueChange={field.onChange} value={field.value} disabled={!!entry?.installments}>
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
                                            {!!entry?.installments && <FormMessage>Não é possível alterar a forma de pagamento de um lançamento parcelado.</FormMessage>}
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="status"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Status</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
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
                            
                            <div className="flex justify-end gap-2 pt-4">
                                <Button type="button" variant="outline" onClick={() => router.push('/cash-flow')} disabled={isSubmitting}>Cancelar</Button>
                                <Button type="submit" disabled={isSubmitting || !!entry?.installments}>
                                    {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Salvando...</> : 'Salvar Alterações'}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </>
    )
}

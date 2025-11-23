

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
import { CalendarIcon, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { addVial } from "@/lib/actions";

const vialFormSchema = z.object({
    purchaseDate: z.date({ required_error: 'A data da compra é obrigatória.' }),
    totalMg: z.enum(['40', '60', '90'], { required_error: 'A quantidade total de mg é obrigatória.' }),
    cost: z.coerce.number().positive('O custo deve ser um valor positivo.'),
    quantity: z.coerce.number().int().min(1, 'A quantidade deve ser pelo menos 1.'),
});

type VialFormValues = z.infer<typeof vialFormSchema>;


export default function NewVialPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<VialFormValues>({
        resolver: zodResolver(vialFormSchema),
        defaultValues: {
            quantity: 1,
        },
    });

    async function onSubmit(data: VialFormValues) {
        setIsSubmitting(true);
        try {
            await addVial({
                ...data,
                totalMg: parseInt(data.totalMg, 10) as 40 | 60 | 90
            });
            toast({
                title: "Frasco Adicionado!",
                description: `${data.quantity} novo(s) frasco(s) de ${data.totalMg}mg foi/foram adicionado(s) ao estoque.`,
            });
            router.push("/stock-control");
        } catch (error) {
             console.error("Failed to add vial", error);
             toast({
                variant: "destructive",
                title: "Erro ao salvar",
                description: "Não foi possível adicionar o frasco. Tente novamente.",
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <>
             <Button variant="ghost" asChild className="mb-4 -ml-4">
                <Link href="/stock-control">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar para o Estoque
                </Link>
            </Button>
            <Card className="w-full max-w-2xl mx-auto">
                <CardHeader>
                    <CardTitle>Adicionar Novo Frasco</CardTitle>
                    <CardDescription>Preencha as informações do frasco comprado para adicioná-lo ao inventário.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                                <FormField control={form.control} name="totalMg" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Dosagem Total do Frasco</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Selecione a dosagem" /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="40">40 mg</SelectItem>
                                                <SelectItem value="60">60 mg</SelectItem>
                                                <SelectItem value="90">90 mg</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                           </div>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <FormField control={form.control} name="cost" render={({ field }) => (
                                    <FormItem><FormLabel>Custo Total (R$)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="Ex: 3150.00" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="quantity" render={({ field }) => (
                                    <FormItem><FormLabel>Quantidade de Frascos</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                           </div>

                           <div className="flex justify-end gap-2 pt-4">
                                <Button type="button" variant="outline" onClick={() => router.push('/stock-control')} disabled={isSubmitting}>Cancelar</Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? 'Salvando...' : 'Salvar no Estoque'}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </>
    )
}

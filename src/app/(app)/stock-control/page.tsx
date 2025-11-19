
'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useState, useEffect } from "react";
import { addVial, getVials, type Vial } from "@/lib/actions";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Warehouse, PlusCircle, CalendarIcon, Loader2, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Progress } from "@/components/ui/progress";

const vialFormSchema = z.object({
  purchaseDate: z.date({ required_error: "A data da compra é obrigatória." }),
  totalMg: z.enum(['40', '60', '90'], { required_error: "Selecione a miligramagem." }),
  cost: z.coerce.number().min(0.01, "O custo deve ser maior que zero."),
  quantity: z.coerce.number().min(1, "A quantidade deve ser de pelo menos 1.").default(1),
});

type VialFormValues = z.infer<typeof vialFormSchema>;

export default function StockControlPage() {
    const [vials, setVials] = useState<Vial[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        fetchVials();
    }, []);

    const fetchVials = async () => {
        setLoading(true);
        const data = await getVials();
        setVials(data);
        setLoading(false);
    };
    
    const onVialAdded = (newVials: Vial[]) => {
        setVials(prev => [...prev, ...newVials].sort((a,b) => a.purchaseDate.getTime() - b.purchaseDate.getTime()));
    }

    if (loading) {
        return <StockControlSkeleton />;
    }

    return (
        <div className="space-y-6">
             <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2"><Warehouse className="h-6 w-6" /> Controle de Estoque</h1>
                    <p className="text-muted-foreground">Visualize e gerencie seus frascos de matéria-prima.</p>
                </div>
            </div>
            
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Frascos Adquiridos</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{vials.length}</div>
                        <p className="text-xs text-muted-foreground">
                            Total de frascos em estoque.
                        </p>
                    </CardContent>
                </Card>
            </div>

            <NewVialForm onVialAdded={onVialAdded}/>
            
            <Card>
                <CardHeader>
                    <CardTitle>Frascos em Estoque</CardTitle>
                    <CardDescription>Lista de frascos disponíveis e seu consumo.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Data Compra</TableHead>
                                <TableHead>Custo Frasco</TableHead>
                                <TableHead>Custo por MG</TableHead>
                                <TableHead>Uso do Frasco (mg)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {vials.length > 0 ? (
                                vials.map((vial) => {
                                    const costPerMg = vial.cost / vial.totalMg;
                                    const usagePercentage = (vial.soldMg / vial.totalMg) * 100;
                                    return (
                                        <TableRow key={vial.id}>
                                            <TableCell className="font-semibold">{formatDate(vial.purchaseDate)}</TableCell>
                                            <TableCell>{formatCurrency(vial.cost)}</TableCell>
                                            <TableCell>{formatCurrency(costPerMg)}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-2">
                                                     <Progress value={usagePercentage} className="h-2"/>
                                                     <span className="text-xs text-muted-foreground">
                                                        {vial.soldMg.toFixed(2)}mg vendidos de {vial.totalMg}mg ({vial.remainingMg.toFixed(2)}mg restantes)
                                                     </span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">Nenhum frasco em estoque. Adicione um novo.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

interface NewVialFormProps {
    onVialAdded: (vials: Vial[]) => void;
}

function NewVialForm({ onVialAdded }: NewVialFormProps) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const form = useForm<VialFormValues>({
        resolver: zodResolver(vialFormSchema),
        defaultValues: {
            cost: 0,
            purchaseDate: new Date(),
            quantity: 1,
        },
    });

    async function onSubmit(data: VialFormValues) {
        setIsSubmitting(true);
        try {
            const newVials = await addVial({
                ...data,
                totalMg: parseInt(data.totalMg, 10) as 40 | 60 | 90,
            });
            toast({
                title: "Frasco(s) Adicionado(s)!",
                description: `${data.quantity} frasco(s) de ${data.totalMg}mg foram adicionados ao estoque.`,
            });
            onVialAdded(newVials);
            form.reset({ cost: 0, purchaseDate: new Date(), totalMg: undefined, quantity: 1 });
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Erro ao adicionar",
                description: "Não foi possível adicionar o frasco ao estoque.",
            });
        } finally {
            setIsSubmitting(false);
        }
    }
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Adicionar Novo Frasco</CardTitle>
            </CardHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <CardContent className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
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
                        <FormField
                            control={form.control}
                            name="totalMg"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>MG Total do Frasco</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="40">40 mg</SelectItem>
                                            <SelectItem value="60">60 mg</SelectItem>
                                            <SelectItem value="90">90 mg</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField control={form.control} name="cost" render={({ field }) => (
                            <FormItem><FormLabel>Valor do Frasco (R$)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="Ex: 1200.00" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="quantity" render={({ field }) => (
                            <FormItem><FormLabel>Quantidade</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                    </CardContent>
                    <CardFooter className="justify-end">
                         <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adicionando...</> : <><PlusCircle className="mr-2 h-4 w-4" /> Adicionar ao Estoque</>}
                        </Button>
                    </CardFooter>
                </form>
            </Form>
        </Card>
    );
}

function StockControlSkeleton() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div>
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-80 mt-2" />
                </div>
            </div>
             <Card>
                <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
                <CardContent className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </CardContent>
                <CardFooter className="justify-end">
                    <Skeleton className="h-10 w-48" />
                </CardFooter>
            </Card>

            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-4 w-64 mt-2" />
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {[...Array(4)].map((_, i) => <TableHead key={i}><Skeleton className="h-5 w-24" /></TableHead>)}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {[...Array(3)].map((_, i) => (
                                <TableRow key={i}>
                                    {[...Array(4)].map((_, j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

    
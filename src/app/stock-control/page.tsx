
'use client';

import { useState, useEffect } from 'react';
import { getVials, getStockForecast, type Vial, type StockForecast, adjustVialStock, getSales, type Sale, updateVialDetails } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { PlusCircle, Warehouse, Droplets, FlaskConical, AlertTriangle, Package, CalendarClock, ShoppingCart, SlidersHorizontal, Loader2, User, Edit, CloudDrizzle } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const DELIVERY_LEAD_TIME = 22; // 22 days

const adjustmentFormSchema = z.object({
  newRemainingMg: z.coerce.number().min(0, "A quantidade deve ser um valor positivo."),
  reason: z.string().min(10, "O motivo deve ter pelo menos 10 caracteres."),
});

type AdjustmentFormValues = z.infer<typeof adjustmentFormSchema>;

const editVialFormSchema = z.object({
    purchaseDate: z.date({ required_error: "A data é obrigatória."}),
    totalMg: z.enum(['40', '60', '90'], { required_error: 'A dosagem é obrigatória.'}),
    cost: z.coerce.number().positive("O custo deve ser um valor positivo."),
});

type EditVialFormValues = z.infer<typeof editVialFormSchema>;


export default function StockControlPage() {
    const [vials, setVials] = useState<Vial[]>([]);
    const [sales, setSales] = useState<Sale[]>([]);
    const [forecast, setForecast] = useState<StockForecast | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedVial, setSelectedVial] = useState<Vial | null>(null);
    const [isAdjusting, setIsAdjusting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isAdjustmentDialogOpen, setIsAdjustmentDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    const { toast } = useToast();

    const adjustmentForm = useForm<AdjustmentFormValues>({
        resolver: zodResolver(adjustmentFormSchema),
    });
    
    const editForm = useForm<EditVialFormValues>({
        resolver: zodResolver(editVialFormSchema),
    });

    const fetchStockData = async () => {
        setLoading(true);
        const [vialsData, forecastData, salesData] = await Promise.all([
            getVials(),
            getStockForecast(DELIVERY_LEAD_TIME),
            getSales()
        ]);
        setVials(vialsData);
        setForecast(forecastData);
        setSales(salesData);
        setLoading(false);
    };

    useEffect(() => {
        fetchStockData();
    }, []);

    const handleOpenAdjustDialog = (vial: Vial) => {
        setSelectedVial(vial);
        adjustmentForm.reset({
            newRemainingMg: vial.remainingMg,
            reason: "",
        });
        setIsAdjustmentDialogOpen(true);
    }
    
    const handleOpenEditDialog = (vial: Vial) => {
        setSelectedVial(vial);
        editForm.reset({
            purchaseDate: new Date(vial.purchaseDate),
            totalMg: String(vial.totalMg) as '40' | '60' | '90',
            cost: vial.cost,
        });
        setIsEditDialogOpen(true);
    }
    
    async function onAdjustmentSubmit(data: AdjustmentFormValues) {
        if (!selectedVial) return;
        setIsAdjusting(true);
        try {
            await adjustVialStock(selectedVial.id, data.newRemainingMg, data.reason);
            toast({
                title: "Estoque Ajustado!",
                description: `O frasco ${selectedVial.id} foi atualizado com sucesso.`
            });
            fetchStockData(); // Re-fetch data to update the view
            setIsAdjustmentDialogOpen(false);
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Erro ao ajustar estoque",
                description: error instanceof Error ? error.message : "Não foi possível salvar o ajuste."
            });
        } finally {
            setIsAdjusting(false);
        }
    }
    
    async function onEditSubmit(data: EditVialFormValues) {
        if (!selectedVial) return;
        setIsEditing(true);
        try {
            await updateVialDetails(selectedVial.id, {
                ...data,
                totalMg: parseInt(data.totalMg, 10) as 40 | 60 | 90,
            });
            toast({
                title: "Frasco Atualizado!",
                description: "Os detalhes do frasco foram salvos."
            });
            fetchStockData();
            setIsEditDialogOpen(false);
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Erro ao editar frasco",
                description: error instanceof Error ? error.message : "Não foi possível salvar as alterações."
            });
        } finally {
            setIsEditing(false);
        }
    }

    const totalMg = vials.reduce((acc, vial) => acc + vial.totalMg, 0);
    const remainingMg = vials.reduce((acc, vial) => acc + vial.remainingMg, 0);
    const stockPercentage = totalMg > 0 ? (remainingMg / totalMg) * 100 : 0;
    
    const getProgressColor = () => {
        if (stockPercentage <= 25) return 'bg-red-500';
        if (stockPercentage <= 50) return 'bg-yellow-500';
        return 'bg-primary';
    }

    const requiredVials = forecast?.totalPendingMg ? Math.ceil(forecast.totalPendingMg / 90) : 0;


    if (loading) {
        return (
             <div className="space-y-6">
                <Skeleton className="h-12 w-1/3" />
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                </div>
                <Skeleton className="h-96" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
             <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Controle de Estoque</h1>
                    <p className="text-muted-foreground">Gerencie seus frascos de Tirzepatida.</p>
                </div>
                 <Button asChild>
                    <Link href="/stock-control/new">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Adicionar Frasco
                    </Link>
                </Button>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Estoque Físico</CardTitle>
                        <FlaskConical className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${stockPercentage <= 25 ? 'text-red-500' : 'text-primary'}`}>{remainingMg.toFixed(1)} mg</div>
                        <p className="text-xs text-muted-foreground">de {totalMg.toFixed(1)} mg no total</p>
                        <Progress value={stockPercentage} indicatorClassName={getProgressColor()} className="mt-2" />
                         {stockPercentage <= 25 && (
                            <div className="mt-2 flex items-center text-xs text-red-500">
                                <AlertTriangle className="h-4 w-4 mr-1"/>
                                Estoque baixo!
                            </div>
                         )}
                    </CardContent>
                </Card>
                 <Card className="border-dashed border-sky-500 bg-sky-500/5">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-sky-700">Demanda Futura (Virtual)</CardTitle>
                        <CloudDrizzle className="h-4 w-4 text-sky-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-sky-600">{forecast?.totalPendingMg?.toFixed(1) ?? '0.0'} mg</div>
                        <p className="text-xs text-muted-foreground">
                            {requiredVials > 0 
                                ? `Necessário comprar: ${requiredVials} frasco(s) de 90mg`
                                : "Demanda de doses futuras ainda não entregues"
                            }
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Previsão de Compra</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {forecast?.purchaseDeadline ? (
                            <>
                                <div className="text-2xl font-bold text-amber-600">{formatDate(forecast.purchaseDeadline)}</div>
                                <p className="text-xs text-muted-foreground">Data limite para fazer novo pedido</p>
                            </>
                        ): (
                            <>
                                <div className="text-2xl font-bold text-green-600">Estoque Seguro</div>
                                <p className="text-xs text-muted-foreground">Previsão para mais de 3 meses</p>
                            </>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Previsão de Ruptura</CardTitle>
                        <CalendarClock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {forecast?.ruptureDate ? (
                            <>
                                <div className="text-2xl font-bold text-red-600">{formatDate(forecast.ruptureDate)}</div>
                                <p className="text-xs text-muted-foreground">Data que o estoque irá acabar</p>
                            </>
                        ) : (
                             <>
                                <div className="text-2xl font-bold">N/A</div>
                                <p className="text-xs text-muted-foreground">Sem dados de consumo suficientes</p>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Lista de Frascos Físicos</CardTitle>
                    <CardDescription>Detalhes de cada frasco em seu inventário.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {vials.length > 0 ? (
                        vials.map(vial => {
                            const vialSales = sales.filter(s => s.vialUsage?.some(vu => vu.vialId === vial.id));
                            
                            const usageHistory = vialSales.flatMap(sale => 
                                (sale.vialUsage || [])
                                    .filter(vu => vu.vialId === vial.id)
                                    .map(vu => ({
                                        patientId: sale.patientId,
                                        patientName: sale.patientName,
                                        mgUsed: vu.mgUsed,
                                        saleDate: sale.saleDate,
                                    }))
                            ).sort((a,b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());

                            return (
                            <Card key={vial.id} className="flex flex-col">
                                <CardHeader>
                                    <CardTitle className="text-lg">Frasco {vial.totalMg}mg</CardTitle>
                                    <CardDescription>Comprado em: {formatDate(vial.purchaseDate)}</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-grow space-y-3">
                                    <div className="text-sm">
                                        <span className="font-semibold">Custo:</span> {formatCurrency(vial.cost)}
                                    </div>
                                    <div className="text-sm">
                                        <span className="font-semibold">Restante:</span> {vial.remainingMg.toFixed(1)}mg / {vial.totalMg}mg
                                    </div>
                                    <Progress value={(vial.remainingMg / vial.totalMg) * 100} />
                                </CardContent>
                                <CardFooter className="flex-col items-start p-0">
                                    <Accordion type="single" collapsible className="w-full">
                                        <AccordionItem value="history" className="border-t">
                                            <AccordionTrigger className="px-6 py-3 text-sm font-semibold">
                                                Histórico de Uso ({usageHistory.length})
                                            </AccordionTrigger>
                                            <AccordionContent className="px-6">
                                                {usageHistory.length > 0 ? (
                                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                                    {usageHistory.map((usage, index) => (
                                                        <div key={index} className="flex justify-between items-center text-xs">
                                                            <Link href={`/patients/${usage.patientId}`} className="flex items-center gap-2 hover:underline text-primary">
                                                                <User className="h-3 w-3" />
                                                                {usage.patientName}
                                                            </Link>
                                                            <div className="text-right">
                                                                <p className="font-semibold">{usage.mgUsed}mg</p>
                                                                <p className="text-muted-foreground">{formatDate(usage.saleDate)}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                ) : (
                                                    <p className="text-xs text-muted-foreground text-center py-4">Nenhum uso registrado para este frasco.</p>
                                                )}
                                            </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>
                                    <div className="w-full flex justify-between items-center p-6 pt-3">
                                        <p className="text-xs text-muted-foreground">ID: {vial.id}</p>
                                        <div className='flex gap-2'>
                                            <Button variant="outline" size="sm" onClick={() => handleOpenEditDialog(vial)}>
                                                <Edit className="h-4 w-4 mr-2" />
                                                Editar
                                            </Button>
                                            <Button variant="outline" size="sm" onClick={() => handleOpenAdjustDialog(vial)}>
                                                <SlidersHorizontal className="h-4 w-4 mr-2" />
                                                Ajustar
                                            </Button>
                                        </div>
                                    </div>
                                </CardFooter>
                            </Card>
                        )})
                    ) : (
                         <div className="col-span-full text-center py-12 text-muted-foreground">
                            <p>Nenhum frasco no estoque.</p>
                            <Button variant="link" asChild><Link href="/stock-control/new">Adicionar o primeiro frasco</Link></Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isAdjustmentDialogOpen} onOpenChange={setIsAdjustmentDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Ajustar Estoque do Frasco</DialogTitle>
                        <DialogDescription>
                            Faça o balanço do frasco ID: <span className="font-mono bg-muted px-1 py-0.5 rounded">{selectedVial?.id}</span>.
                            A diferença será registrada como uma saída no fluxo de caixa.
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...adjustmentForm}>
                        <form onSubmit={adjustmentForm.handleSubmit(onAdjustmentSubmit)} className="space-y-4 py-4">
                            <FormField
                                control={adjustmentForm.control}
                                name="newRemainingMg"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nova Quantidade Restante (mg)</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.1" placeholder="Ex: 85.5" {...field} />
                                        </FormControl>
                                        <FormDescription>Estoque atual: {selectedVial?.remainingMg.toFixed(2)}mg</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={adjustmentForm.control}
                                name="reason"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Motivo do Ajuste</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Ex: Perda no manuseio, dose de teste, etc." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button type="button" variant="outline">Cancelar</Button>
                                </DialogClose>
                                <Button type="submit" disabled={isAdjusting}>
                                    {isAdjusting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Salvar Ajuste
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Frasco</DialogTitle>
                        <DialogDescription>
                            Altere os detalhes da compra do frasco ID: <span className="font-mono bg-muted px-1 py-0.5 rounded">{selectedVial?.id}</span>.
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...editForm}>
                        <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4 py-4">
                             <FormField control={editForm.control} name="purchaseDate" render={({ field }) => (
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
                            <FormField control={editForm.control} name="totalMg" render={({ field }) => (
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
                            <FormField control={editForm.control} name="cost" render={({ field }) => (
                                <FormItem><FormLabel>Custo Total (R$)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="Ex: 3150.00" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button type="button" variant="outline">Cancelar</Button>
                                </DialogClose>
                                <Button type="submit" disabled={isEditing}>
                                    {isEditing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Salvar Alterações
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

        </div>
    );
}


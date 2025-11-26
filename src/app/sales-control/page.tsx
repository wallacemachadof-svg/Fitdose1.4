
'use client';

import { useState, useEffect } from "react";
import { getSales, deleteSale, updateSaleDelivery, type Sale, type Delivery } from "@/lib/actions";
import { formatCurrency, formatDate, getPaymentStatusVariant, getDeliveryStatusVariant } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, MoreVertical, Edit, Trash2, Search, DollarSign, PackageX, ShoppingCart, Truck, Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { startOfMonth, endOfMonth, isWithinInterval, format } from "date-fns";
import { ptBR } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export default function SalesControlPage() {
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);
    const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const { toast } = useToast();
    const router = useRouter();
    const [paymentFilter, setPaymentFilter] = useState<'all' | 'pago' | 'pendente'>('all');
    const [deliveryFilter, setDeliveryFilter] = useState<'all' | 'entregue' | 'em agendamento' | 'em processamento'>('all');
    const [selectedMonth, setSelectedMonth] = useState<string>('current');
    const [searchTerm, setSearchTerm] = useState('');

    const fetchSales = async () => {
        setLoading(true);
        const data = await getSales();
        setSales(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchSales();
    }, []);

    const handleDeliveryStatusChange = async (saleId: string, doseNumber: number, newStatus: Delivery['status']) => {
        try {
            await updateSaleDelivery(saleId, doseNumber, newStatus);
            toast({
                title: "Status de Entrega Atualizado!",
                description: `A entrega para a dose ${doseNumber} foi atualizada.`,
            });
            fetchSales(); // Refresh data
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Erro ao atualizar entrega",
                description: error instanceof Error ? error.message : "Não foi possível atualizar o status.",
            });
        }
    };


    const availableMonths = sales.reduce((acc, sale) => {
        const date = sale.paymentStatus === 'pago' && sale.paymentDate ? sale.paymentDate : sale.saleDate;
        if (date) {
            const monthKey = format(new Date(date), 'yyyy-MM');
            if (!acc.find(item => item.value === monthKey)) {
                acc.push({
                    value: monthKey,
                    label: format(new Date(date), 'MMMM yyyy', { locale: ptBR }).replace(/^\w/, c => c.toUpperCase())
                });
            }
        }
        return acc;
    }, [] as { value: string, label: string }[]);
    
    availableMonths.sort((a,b) => b.value.localeCompare(a.value));


    const handleDeleteClick = (sale: Sale) => {
        setSaleToDelete(sale);
        setIsDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!saleToDelete) return;
        try {
            await deleteSale(saleToDelete.id);
            setSales(sales.filter(s => s.id !== saleToDelete.id));
            toast({
                title: "Venda Excluída",
                description: `A venda para "${saleToDelete.patientName}" foi removida com sucesso.`,
            });
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Erro ao excluir",
                description: "Não foi possível remover a venda.",
            });
        } finally {
            setIsDeleteDialogOpen(false);
            setSaleToDelete(null);
        }
    };
    
    const handleEditClick = (sale: Sale) => {
        router.push(`/sales-control/edit/${sale.id}`);
    }
    
    const today = new Date();
    
    let monthLabel: string;
    let startOfSelectedPeriod: Date | null = null;
    let endOfSelectedPeriod: Date | null = null;

    if (selectedMonth === 'all') {
        monthLabel = 'Todos os Meses';
    } else if (selectedMonth === 'current') {
        startOfSelectedPeriod = startOfMonth(today);
        endOfSelectedPeriod = endOfMonth(today);
        monthLabel = format(startOfSelectedPeriod, 'MMMM yyyy', { locale: ptBR }).replace(/^\w/, c => c.toUpperCase());
    } else {
        const [year, month] = selectedMonth.split('-').map(Number);
        startOfSelectedPeriod = new Date(year, month - 1, 1);
        endOfSelectedPeriod = endOfMonth(startOfSelectedPeriod);
        monthLabel = format(startOfSelectedPeriod, 'MMMM yyyy', { locale: ptBR }).replace(/^\w/, c => c.toUpperCase());
    }

    const salesInSelectedPeriod = selectedMonth === 'all'
        ? sales
        : sales.filter(s => {
            const dateToCheck = s.paymentStatus === 'pago' && s.paymentDate ? s.paymentDate : s.saleDate;
            return dateToCheck && startOfSelectedPeriod && endOfSelectedPeriod && isWithinInterval(new Date(dateToCheck), { start: startOfSelectedPeriod, end: endOfSelectedPeriod });
        });

    const pendingPaymentsInPeriod = salesInSelectedPeriod.filter(s => s.paymentStatus === 'pendente');
    const totalPendingAmountInPeriod = pendingPaymentsInPeriod.reduce((acc, sale) => acc + sale.total, 0);
    
    const revenueThisMonth = salesInSelectedPeriod
        .filter(s => s.paymentStatus === 'pago')
        .reduce((acc, sale) => acc + sale.total, 0);
        
    const totalValueInSelectedPeriod = salesInSelectedPeriod.reduce((acc, sale) => acc + sale.total, 0);

    const filteredSales = salesInSelectedPeriod.filter(sale => {
        if (paymentFilter !== 'all' && sale.paymentStatus !== paymentFilter) return false;
        if (deliveryFilter !== 'all' && !sale.deliveries.some(d => d.status === deliveryFilter)) return false;
        if (searchTerm && !sale.patientName.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
    });


    if (loading) {
        return (
             <div className="space-y-6">
                <Skeleton className="h-12 w-1/3" />
                <div className="grid gap-4 md:grid-cols-3">
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
                    <h1 className="text-2xl font-bold">Histórico de Vendas</h1>
                    <p className="text-muted-foreground">Acompanhe todas as suas vendas e lançamentos.</p>
                </div>
                 <Button asChild>
                    <Link href="/sales-control/new">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Nova Venda
                    </Link>
                </Button>
            </div>
            
             <Card>
                <CardHeader>
                    <CardTitle>Visão Financeira de Vendas - {monthLabel}</CardTitle>
                    <CardDescription>
                         <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                            <SelectTrigger className="w-full md:w-[280px] h-9 mt-2">
                                <SelectValue placeholder="Selecionar Mês" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="current">Mês Atual</SelectItem>
                                <SelectItem value="all">Todos os Meses</SelectItem>
                                {availableMonths.map(month => (
                                    <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Receita Realizada</CardTitle>
                            <DollarSign className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-500">{formatCurrency(revenueThisMonth)}</div>
                            <p className="text-xs text-muted-foreground">Soma dos valores pagos no período</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Pagamentos Pendentes</CardTitle>
                            <PackageX className="h-4 w-4 text-yellow-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-yellow-500">{formatCurrency(totalPendingAmountInPeriod)}</div>
                            <p className="text-xs text-muted-foreground">{pendingPaymentsInPeriod.length} vendas aguardando pagamento</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Vendido</CardTitle>
                            <ShoppingCart className="h-4 w-4 text-muted-foreground"/>
                        </CardHeader>
                        <CardContent>
                            <div className={`text-2xl font-bold`}>{formatCurrency(totalValueInSelectedPeriod)}</div>
                            <p className="text-xs text-muted-foreground">{salesInSelectedPeriod.length} vendas em {monthLabel}</p>
                        </CardContent>
                    </Card>
                </CardContent>
            </Card>


            <Card>
                <CardHeader>
                    <CardTitle>Histórico de Vendas</CardTitle>
                    <CardDescription>Use os filtros abaixo para encontrar vendas específicas.</CardDescription>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                        <Input 
                            placeholder="Buscar por nome do paciente..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <Select value={paymentFilter} onValueChange={(v) => setPaymentFilter(v as any)}>
                            <SelectTrigger><SelectValue placeholder="Filtrar por pagamento..." /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos Pagamentos</SelectItem>
                                <SelectItem value="pago">Pago</SelectItem>
                                <SelectItem value="pendente">Pendente</SelectItem>
                            </SelectContent>
                        </Select>
                         <Select value={deliveryFilter} onValueChange={(v) => setDeliveryFilter(v as any)}>
                            <SelectTrigger><SelectValue placeholder="Filtrar por entrega..." /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas Entregas</SelectItem>
                                <SelectItem value="entregue">Entregue</SelectItem>
                                <SelectItem value="em agendamento">Em Agendamento</SelectItem>
                                <SelectItem value="em processamento">Em Processamento</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Data</TableHead>
                                <TableHead>Paciente</TableHead>
                                <TableHead>Total</TableHead>
                                <TableHead>Status Pag.</TableHead>
                                <TableHead>Status Entrega</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredSales.length > 0 ? (
                                filteredSales.map((sale) => {
                                    const paymentStatus = getPaymentStatusVariant(sale.paymentStatus);
                                    const firstDeliveryStatus = sale.deliveries?.[0]?.status || sale.deliveryStatus;
                                    const deliveryStatus = getDeliveryStatusVariant(firstDeliveryStatus);
                                    
                                    return (
                                        <TableRow key={sale.id}>
                                            <TableCell>{formatDate(sale.saleDate)}</TableCell>
                                            <TableCell>
                                                <Link href={`/patients/${sale.patientId}`} className="font-medium hover:underline">
                                                    {sale.patientName}
                                                </Link>
                                            </TableCell>
                                            <TableCell className="font-semibold">{formatCurrency(sale.total)}</TableCell>
                                            <TableCell>
                                                <Badge variant={'default'} className={`${paymentStatus.color} ${paymentStatus.textColor} border-none`}>{paymentStatus.label}</Badge>
                                            </TableCell>
                                             <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="p-0 h-auto">
                                                            <Badge variant={'default'} className={`${deliveryStatus.color} ${deliveryStatus.textColor} border-none cursor-pointer`}>
                                                                {deliveryStatus.label}
                                                                {sale.deliveries && sale.deliveries.length > 1 ? ` (1/${sale.deliveries.length})` : ''}
                                                            </Badge>
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent>
                                                        {sale.deliveries?.map((delivery) => (
                                                            <DropdownMenuSub key={delivery.doseNumber}>
                                                                <DropdownMenuSubTrigger>
                                                                    Dose {delivery.doseNumber}: {getDeliveryStatusVariant(delivery.status).label}
                                                                </DropdownMenuSubTrigger>
                                                                <DropdownMenuPortal>
                                                                    <DropdownMenuSubContent>
                                                                        <DropdownMenuItem onClick={() => handleDeliveryStatusChange(sale.id, delivery.doseNumber, 'em agendamento')}><Truck className="mr-2 h-4 w-4" />Em Agendamento</DropdownMenuItem>
                                                                        <DropdownMenuItem onClick={() => handleDeliveryStatusChange(sale.id, delivery.doseNumber, 'entregue')}><Check className="mr-2 h-4 w-4" />Entregue</DropdownMenuItem>
                                                                    </DropdownMenuSubContent>
                                                                </DropdownMenuPortal>
                                                            </DropdownMenuSub>
                                                        ))}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                             </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleEditClick(sale)}>
                                                            <Edit className="mr-2 h-4 w-4" />
                                                            Editar
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleDeleteClick(sale)} className="text-destructive">
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Excluir
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        Nenhuma venda encontrada para este filtro.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

             <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta ação não pode ser desfeita. Isso excluirá permanentemente a venda para <span className="font-bold">{saleToDelete?.patientName}</span>.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">
                        Excluir
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

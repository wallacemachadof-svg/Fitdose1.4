
'use client';

import { useState, useEffect } from "react";
import { getSales, deleteSale, type Sale } from "@/lib/actions";
import { formatCurrency, formatDate, getPaymentStatusVariant, getDeliveryStatusVariant } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, MoreVertical, Edit, Trash2, DollarSign, PackageX, ShoppingCart } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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

export default function SalesControlPage() {
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);
    const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const { toast } = useToast();
    const [filter, setFilter] = useState<'all' | 'pago' | 'pendente'>('all');
    const [selectedMonth, setSelectedMonth] = useState<string>('current');

    useEffect(() => {
        const fetchSales = async () => {
            setLoading(true);
            const data = await getSales();
            setSales(data);
            setLoading(false);
        };
        fetchSales();
    }, []);

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
    
    const handleEditClick = () => {
        toast({
            title: "Função em desenvolvimento",
            description: "A edição de vendas será implementada em breve.",
        });
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
        if (filter === 'all') return true;
        return sale.paymentStatus === filter;
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
            
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Receita Realizada ({monthLabel})</CardTitle>
                         <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                            <SelectTrigger className="w-[180px] h-8 text-xs">
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
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-500">{formatCurrency(revenueThisMonth)}</div>
                         <p className="text-xs text-muted-foreground">Soma dos valores pagos no período</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pagamentos Pendentes ({monthLabel})</CardTitle>
                        <PackageX className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-500">{formatCurrency(totalPendingAmountInPeriod)}</div>
                        <p className="text-xs text-muted-foreground">{pendingPaymentsInPeriod.length} vendas aguardando pagamento</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Vendas no Mês</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-muted-foreground"/>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold`}>{salesInSelectedPeriod.length} <span className="text-lg font-medium text-muted-foreground">({formatCurrency(totalValueInSelectedPeriod)})</span></div>
                        <p className="text-xs text-muted-foreground">Total de vendas em {monthLabel}</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Histórico de Vendas ({monthLabel})</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Tabs value={filter} onValueChange={(value) => setFilter(value as any)}>
                         <div className="px-6">
                            <TabsList>
                                <TabsTrigger value="all">Todos</TabsTrigger>
                                <TabsTrigger value="pago">Pagos</TabsTrigger>
                                <TabsTrigger value="pendente">Pendentes</TabsTrigger>
                            </TabsList>
                        </div>
                        <TabsContent value={filter} className="mt-0">
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
                                            const deliveryStatus = getDeliveryStatusVariant(sale.deliveryStatus);
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
                                                        <Badge variant={'default'} className={`${deliveryStatus.color} ${deliveryStatus.textColor} border-none`}>{deliveryStatus.label}</Badge>
                                                     </TableCell>
                                                    <TableCell className="text-right">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                    <MoreVertical className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem onClick={handleEditClick}>
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
                         </TabsContent>
                    </Tabs>
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

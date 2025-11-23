

'use client';

import { useState, useEffect } from "react";
import { getSales, deleteSale, type Sale } from "@/lib/actions";
import { formatCurrency, formatDate, getPaymentStatusVariant, getDeliveryStatusVariant } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, MoreVertical, Edit, Trash2, DollarSign, PackageCheck, PackageX, ShoppingCart } from "lucide-react";
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
import { startOfMonth, endOfMonth, isWithinInterval } from "date-fns";

export default function SalesControlPage() {
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);
    const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const fetchSales = async () => {
            setLoading(true);
            const data = await getSales();
            setSales(data);
            setLoading(false);
        };
        fetchSales();
    }, []);

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
    const startOfCurrentMonth = startOfMonth(today);
    const endOfCurrentMonth = endOfMonth(today);

    const pendingPayments = sales.filter(s => s.paymentStatus === 'pendente');
    const totalPendingAmount = pendingPayments.reduce((acc, sale) => acc + sale.total, 0);
    
    const scheduledForThisMonth = pendingPayments.filter(s => 
        s.paymentDueDate && isWithinInterval(new Date(s.paymentDueDate), { start: startOfCurrentMonth, end: endOfCurrentMonth })
    ).reduce((acc, sale) => acc + sale.total, 0);

    const pendingDeliveryCount = sales.filter(s => s.deliveryStatus !== 'entregue').length;


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
                        <CardTitle className="text-sm font-medium">Receita Prevista (Mês Atual)</CardTitle>
                        <DollarSign className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-500">{formatCurrency(scheduledForThisMonth)}</div>
                         <p className="text-xs text-muted-foreground">de pagamentos pendentes este mês</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pagamentos Pendentes (Total)</CardTitle>
                        <PackageX className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-500">{formatCurrency(totalPendingAmount)}</div>
                        <p className="text-xs text-muted-foreground">{pendingPayments.length} vendas aguardando pagamento</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Entregas Pendentes</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-orange-500"/>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold text-orange-500`}>{pendingDeliveryCount}</div>
                        <p className="text-xs text-muted-foreground">Vendas aguardando entrega</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                 <CardHeader>
                    <CardTitle>Histórico de Vendas</CardTitle>
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
                            {sales.length > 0 ? (
                                sales.map((sale) => {
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
                                        Nenhuma venda registrada.
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

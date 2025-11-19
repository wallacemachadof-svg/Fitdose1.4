
'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getSales, deleteSale, type Sale } from "@/lib/actions";
import { formatDate, formatCurrency, getPaymentStatusVariant, getDeliveryStatusVariant } from "@/lib/utils";
import { PlusCircle, MoreVertical, Trash2, Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

export default function SalesControlPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchSales = async () => {
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
        toast({
            title: "Venda Excluída",
            description: `A venda para ${saleToDelete.patientName} foi removida com sucesso.`,
        });
        setSales(sales.filter(s => s.id !== saleToDelete.id));
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

  if (loading) {
    return <SalesControlSkeleton />
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Controle de Vendas</CardTitle>
            <CardDescription>Gerencie as doses vendidas.</CardDescription>
          </div>
          <Button asChild>
            <Link href="/sales-control/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Nova Venda
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Data Venda</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Valor</TableHead>
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
                        <TableCell>
                          <Link href={`/patients/${sale.patientId}`} className="font-medium text-primary-foreground hover:underline">
                            {sale.patientName}
                          </Link>
                        </TableCell>
                        <TableCell>{formatDate(sale.saleDate)}</TableCell>
                        <TableCell>{sale.quantity}x {sale.soldDose}mg</TableCell>
                        <TableCell>{formatCurrency(sale.price)}</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(sale.total)}</TableCell>
                        <TableCell>
                          <Badge variant={'default'} className={`${paymentStatus.color} ${paymentStatus.textColor} border-none`}>
                            {paymentStatus.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={'default'} className={`${deliveryStatus.color} ${deliveryStatus.textColor} border-none`}>
                            {deliveryStatus.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
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
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      Nenhuma venda encontrada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
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
    </>
  );
}

function SalesControlSkeleton() {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-4 w-52 mt-2" />
                </div>
                <Skeleton className="h-10 w-32" />
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            {[...Array(8)].map((_, i) => <TableHead key={i}><Skeleton className="h-5 w-24" /></TableHead>)}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {[...Array(3)].map((_, i) => (
                            <TableRow key={i}>
                                {[...Array(7)].map((_, j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}
                                <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}


'use client';

import { useState, useEffect } from "react";
import { getCashFlowEntries, deleteCashFlowEntry, type CashFlowEntry } from "@/lib/actions";
import { formatCurrency, formatDate, getPaymentStatusVariant } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowDownCircle, ArrowUpCircle, PlusCircle, MoreVertical, Edit, Trash2, Loader2, DollarSign, Package, PackageOpen, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useRouter } from 'next/navigation';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function CashFlowPage() {
    const [entries, setEntries] = useState<CashFlowEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [entryToDelete, setEntryToDelete] = useState<CashFlowEntry | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState<string>('current');
    const { toast } = useToast();
    const router = useRouter();

    useEffect(() => {
        const fetchEntries = async () => {
            const data = await getCashFlowEntries();
            setEntries(data);
            setLoading(false);
        };
        fetchEntries();
    }, []);

    const handleDeleteClick = (entry: CashFlowEntry) => {
        setEntryToDelete(entry);
        setIsDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!entryToDelete) return;
        try {
            await deleteCashFlowEntry(entryToDelete.id);
            toast({
                title: "Lançamento Excluído",
                description: `O lançamento "${entryToDelete.description}" foi removido com sucesso.`,
            });
            setEntries(entries.filter(e => e.id !== entryToDelete.id));
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Erro ao excluir",
                description: "Não foi possível remover o lançamento.",
            });
        } finally {
            setIsDeleteDialogOpen(false);
            setEntryToDelete(null);
        }
    };
    
    const handleEditClick = (entry: CashFlowEntry) => {
        router.push(`/cash-flow/edit/${entry.id}`);
    }

    const availableMonths = entries.reduce((acc, entry) => {
        const date = entry.dueDate || entry.purchaseDate;
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


    const today = new Date();
    let monthLabel: string;
    let startOfSelectedPeriod: Date | null = null;
    let endOfSelectedPeriod: Date | null = null;

    if (selectedMonth === 'all') {
        monthLabel = 'Geral';
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

    const entriesInPeriod = selectedMonth === 'all'
        ? entries
        : entries.filter(e => {
            const dateToCheck = e.status === 'pendente' || e.status === 'vencido' ? e.dueDate : e.purchaseDate;
            return dateToCheck && startOfSelectedPeriod && endOfSelectedPeriod && isWithinInterval(new Date(dateToCheck), { start: startOfSelectedPeriod, end: endOfSelectedPeriod });
        });
        
    const paidIncome = entriesInPeriod.filter(e => e.type === 'entrada' && e.status === 'pago');
    const paidExpenses = entriesInPeriod.filter(e => e.type === 'saida' && e.status === 'pago');
    const pendingIncome = entriesInPeriod.filter(e => e.type === 'entrada' && (e.status === 'pendente' || e.status === 'vencido'));
    const pendingExpenses = entriesInPeriod.filter(e => e.type === 'saida' && (e.status === 'pendente' || e.status === 'vencido'));

    const totalPaidIncome = paidIncome.reduce((acc, curr) => acc + curr.amount, 0);
    const totalPaidExpenses = paidExpenses.reduce((acc, curr) => acc + curr.amount, 0);
    const totalPendingIncome = pendingIncome.reduce((acc, curr) => acc + curr.amount, 0);
    const totalPendingExpenses = pendingExpenses.reduce((acc, curr) => acc + curr.amount, 0);
    
    const realBalance = totalPaidIncome - totalPaidExpenses;
    const projectedBalance = realBalance + totalPendingIncome - totalPendingExpenses;


    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-12 w-1/3" />
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                    <h1 className="text-2xl font-bold">Fluxo de Caixa</h1>
                    <p className="text-muted-foreground">Visualize suas movimentações financeiras.</p>
                </div>
                 <Button asChild>
                    <Link href="/cash-flow/new">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Novo Lançamento
                    </Link>
                </Button>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Visão Financeira - {monthLabel}</CardTitle>
                    <CardDescription>
                         <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                            <SelectTrigger className="w-full md:w-[280px] h-9 mt-2">
                                <SelectValue placeholder="Selecionar Mês" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="current">Mês Atual</SelectItem>
                                <SelectItem value="all">Visão Geral</SelectItem>
                                {availableMonths.map(month => (
                                    <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Receita Realizada</CardTitle>
                            <ArrowUpCircle className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-500">{formatCurrency(totalPaidIncome)}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Despesas Realizadas</CardTitle>
                            <ArrowDownCircle className="h-4 w-4 text-red-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-500">{formatCurrency(totalPaidExpenses)}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Balanço Realizado</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground"/>
                        </CardHeader>
                        <CardContent>
                            <div className={`text-2xl font-bold ${realBalance >= 0 ? 'text-foreground' : 'text-destructive'}`}>{formatCurrency(realBalance)}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Balanço Previsto</CardTitle>
                            <TrendingUp className="h-4 w-4 text-blue-500"/>
                        </CardHeader>
                        <CardContent>
                            <div className={`text-2xl font-bold text-blue-500`}>{formatCurrency(projectedBalance)}</div>
                            <p className="text-xs text-muted-foreground">Inclui pendentes do mês</p>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">A Receber (Pendente)</CardTitle>
                            <Package className="h-4 w-4 text-yellow-500"/>
                        </CardHeader>
                        <CardContent>
                            <div className={`text-2xl font-bold text-yellow-500`}>{formatCurrency(totalPendingIncome)}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">A Pagar (Pendente)</CardTitle>
                            <PackageOpen className="h-4 w-4 text-orange-500"/>
                        </CardHeader>
                        <CardContent>
                            <div className={`text-2xl font-bold text-orange-500`}>{formatCurrency(totalPendingExpenses)}</div>
                        </CardContent>
                    </Card>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-0">
                    <Tabs defaultValue="all">
                        <div className="p-6">
                            <TabsList>
                                <TabsTrigger value="all">Todos</TabsTrigger>
                                <TabsTrigger value="income">Entradas</TabsTrigger>
                                <TabsTrigger value="expenses">Saídas</TabsTrigger>
                            </TabsList>
                        </div>
                         <TabsContent value="all" className="mt-0">
                            <EntriesTable entries={entriesInPeriod} onEdit={handleEditClick} onDelete={handleDeleteClick} />
                        </TabsContent>
                        <TabsContent value="income" className="mt-0">
                            <EntriesTable entries={entriesInPeriod.filter(e => e.type === 'entrada')} onEdit={handleEditClick} onDelete={handleDeleteClick} />
                        </TabsContent>
                        <TabsContent value="expenses" className="mt-0">
                             <EntriesTable entries={entriesInPeriod.filter(e => e.type === 'saida')} onEdit={handleEditClick} onDelete={handleDeleteClick} />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta ação não pode ser desfeita. Isso excluirá permanentemente o lançamento <span className="font-bold">{entryToDelete?.description}</span>.
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

interface EntriesTableProps {
    entries: CashFlowEntry[];
    onEdit: (entry: CashFlowEntry) => void;
    onDelete: (entry: CashFlowEntry) => void;
}

function EntriesTable({ entries, onEdit, onDelete }: EntriesTableProps) {
    const paymentMethodLabels: Record<string, string> = {
        pix: "PIX",
        dinheiro: "Dinheiro",
        debito: "Débito",
        credito: "Crédito",
        credito_parcelado: "Créd. Parcelado",
        payment_link: "Link de Pagamento",
    };

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Data Compra</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Forma Pag.</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {entries.length > 0 ? (
                    entries.map((entry) => {
                        const status = getPaymentStatusVariant(entry.status);
                        const typeStyle = getPaymentStatusVariant(entry.type);
                        return (
                            <TableRow key={entry.id}>
                                <TableCell>{formatDate(entry.purchaseDate)}</TableCell>
                                <TableCell className="font-medium">{entry.description}</TableCell>
                                <TableCell className={`font-semibold ${typeStyle.color}`}>
                                    {entry.type === 'saida' && '- '}{formatCurrency(entry.amount)}
                                </TableCell>
                                <TableCell>{entry.paymentMethod ? paymentMethodLabels[entry.paymentMethod] ?? '-' : '-'}</TableCell>
                                <TableCell>{formatDate(entry.dueDate)}</TableCell>
                                <TableCell>
                                    <Badge variant={'default'} className={`${status.color} ${status.textColor} border-none`}>{status.label}</Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => onEdit(entry)}>
                                                <Edit className="mr-2 h-4 w-4" />
                                                Editar
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => onDelete(entry)} className="text-destructive">
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
                        <TableCell colSpan={7} className="h-24 text-center">
                            Nenhum lançamento encontrado para este período.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    )
}

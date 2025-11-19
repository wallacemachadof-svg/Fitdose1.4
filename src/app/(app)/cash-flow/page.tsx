'use client';

import { useState, useEffect } from "react";
import { getCashFlowEntries, deleteCashFlowEntry, type CashFlowEntry } from "@/lib/actions";
import { formatCurrency, formatDate, getPaymentStatusVariant } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowDownCircle, ArrowUpCircle, PlusCircle, MoreVertical, Edit, Trash2, Loader2, DollarSign } from "lucide-react";
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


export default function CashFlowPage() {
    const [entries, setEntries] = useState<CashFlowEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [entryToDelete, setEntryToDelete] = useState<CashFlowEntry | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const { toast } = useToast();

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
        toast({
            title: "Função em desenvolvimento",
            description: "A edição de lançamentos será implementada em breve.",
        });
    }

    const income = entries.filter(e => e.type === 'entrada');
    const expenses = entries.filter(e => e.type === 'saida');

    const totalIncome = income.reduce((acc, curr) => acc + curr.amount, 0);
    const totalExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);
    const balance = totalIncome - totalExpenses;

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
                    <h1 className="text-2xl font-bold">Fluxo de Caixa</h1>
                    <p className="text-muted-foreground">Visualize suas entradas e saídas.</p>
                </div>
                 <Button asChild>
                    <Link href="/cash-flow/new">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Novo Lançamento
                    </Link>
                </Button>
            </div>
            
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Entradas</CardTitle>
                        <ArrowUpCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-500">{formatCurrency(totalIncome)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Saídas</CardTitle>
                        <ArrowDownCircle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-500">{formatCurrency(totalExpenses)}</div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Saldo Atual</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground"/>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${balance >= 0 ? 'text-foreground' : 'text-destructive'}`}>{formatCurrency(balance)}</div>
                    </CardContent>
                </Card>
            </div>

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
                            <EntriesTable entries={entries} onEdit={handleEditClick} onDelete={handleDeleteClick} />
                        </TabsContent>
                        <TabsContent value="income" className="mt-0">
                            <EntriesTable entries={income} onEdit={handleEditClick} onDelete={handleDeleteClick} />
                        </TabsContent>
                        <TabsContent value="expenses" className="mt-0">
                             <EntriesTable entries={expenses} onEdit={handleEditClick} onDelete={handleDeleteClick} />
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
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Data</TableHead>
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
                                <TableCell className={`font-semibold ${typeStyle.color} ${typeStyle.textColor}`}>
                                    {entry.type === 'saida' && '- '}{formatCurrency(entry.amount)}
                                </TableCell>
                                <TableCell>{entry.paymentMethod ?? '-'}</TableCell>
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
                            Nenhum lançamento encontrado.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    )
}

    

    
import { getCashFlowEntries, type CashFlowEntry } from "@/lib/data";
import { formatCurrency, formatDate, getPaymentStatusVariant } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowDownCircle, ArrowUpCircle, PlusCircle } from "lucide-react";
import Link from "next/link";

export default async function CashFlowPage() {
    const entries = await getCashFlowEntries();
    const income = entries.filter(e => e.type === 'entrada');
    const expenses = entries.filter(e => e.type === 'saida');

    const totalIncome = income.reduce((acc, curr) => acc + curr.amount, 0);
    const totalExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);
    const balance = totalIncome - totalExpenses;

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
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${balance >= 0 ? 'text-foreground' : 'text-destructive'}`}>{formatCurrency(balance)}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Tabs defaultValue="income">
                        <div className="p-6">
                            <TabsList>
                                <TabsTrigger value="income">Entradas</TabsTrigger>
                                <TabsTrigger value="expenses">Saídas</TabsTrigger>
                            </TabsList>
                        </div>
                        <TabsContent value="income" className="mt-0">
                            <EntriesTable entries={income} />
                        </TabsContent>
                        <TabsContent value="expenses" className="mt-0">
                             <EntriesTable entries={expenses} />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}

function EntriesTable({ entries }: { entries: CashFlowEntry[] }) {
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
                </TableRow>
            </TableHeader>
            <TableBody>
                {entries.length > 0 ? (
                    entries.map((entry) => {
                        const status = getPaymentStatusVariant(entry.status);
                        return (
                            <TableRow key={entry.id}>
                                <TableCell>{formatDate(entry.purchaseDate)}</TableCell>
                                <TableCell className="font-medium">{entry.description}</TableCell>
                                <TableCell className={`font-semibold ${entry.type === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatCurrency(entry.amount)}
                                </TableCell>
                                <TableCell>{entry.paymentMethod ?? '-'}</TableCell>
                                <TableCell>{formatDate(entry.dueDate)}</TableCell>
                                <TableCell>
                                    <Badge variant={'default'} className={`${status.color} ${status.textColor} border-none`}>{status.label}</Badge>
                                </TableCell>
                            </TableRow>
                        );
                    })
                ) : (
                    <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                            Nenhum lançamento encontrado.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    )
}

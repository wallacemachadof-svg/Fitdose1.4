
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Box, PlusCircle, PackageSearch, PackageCheck, PackageX, History, Warehouse } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { useState, useEffect } from "react";
import { getSettings, getHofStock, addHofStock, type HofProduct, type HofStockEntry, type NewHofStockData } from "@/lib/actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const stockEntryFormSchema = z.object({
  productName: z.string(),
  quantity: z.coerce.number().min(1, "A quantidade deve ser maior que zero."),
  cost: z.coerce.number().min(0.01, "O custo deve ser maior que zero."),
  purchaseDate: z.date({ required_error: 'A data é obrigatória.' }),
});

type StockEntryFormValues = z.infer<typeof stockEntryFormSchema>;

function AddStockDialog({ product, onStockAdded }: { product: HofProduct; onStockAdded: () => void }) {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const form = useForm<StockEntryFormValues>({
        resolver: zodResolver(stockEntryFormSchema),
        defaultValues: {
            productName: product.name,
            purchaseDate: new Date(),
            quantity: 1,
            cost: product.cost
        },
    });

    async function onSubmit(data: StockEntryFormValues) {
        try {
            await addHofStock(data);
            toast({ title: "Estoque Lançado!", description: `${data.quantity} unidade(s) de ${data.productName} adicionada(s).` });
            onStockAdded();
            setOpen(false);
            form.reset();
        } catch (error) {
            toast({ variant: "destructive", title: "Erro ao lançar estoque." });
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm"><PlusCircle className="mr-2 h-4 w-4"/>Adicionar ao Estoque</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Lançar Compra: {product.name}</DialogTitle>
                    <DialogDescription>Registre uma nova entrada de produto no estoque.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="purchaseDate" render={({ field }) => (
                            <FormItem className="flex flex-col"><FormLabel>Data da Compra</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Escolha a data</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start"><Calendar locale={ptBR} mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}/>
                        <FormField control={form.control} name="quantity" render={({ field }) => (<FormItem><FormLabel>Quantidade Comprada ({product.unit})</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        <FormField control={form.control} name="cost" render={({ field }) => (<FormItem><FormLabel>Custo Total da Compra (R$)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        <DialogFooter>
                            <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Salvar Lançamento</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

export default function HofStockPage() {
  const [products, setProducts] = useState<HofProduct[]>([]);
  const [stock, setStock] = useState<HofStockEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStockData = async () => {
      setLoading(true);
      const [settingsData, stockData] = await Promise.all([getSettings(), getHofStock()]);
      setProducts(settingsData.hofProducts || []);
      setStock(stockData);
      setLoading(false);
  }

  useEffect(() => {
    fetchStockData();
  }, []);

  const productStockMap = stock.reduce((acc, entry) => {
      acc[entry.productName] = (acc[entry.productName] || 0) + entry.quantity;
      return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
       <div className="space-y-6">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-6 w-1/2" />
          <Card>
              <CardContent className="pt-6">
                  <Skeleton className="h-64 w-full" />
              </CardContent>
          </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
            <Box className="h-6 w-6 text-primary" />
            Estoque de Produtos HOF
        </h1>
        <p className="text-muted-foreground">
         Controle o inventário de seus produtos de estética avançada.
        </p>
      </div>
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Itens Cadastrados</CardTitle>
                <Warehouse className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{products.length}</div>
                <p className="text-xs text-muted-foreground">Tipos de produtos na lista</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Histórico de Compras</CardTitle>
                <History className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{stock.length}</div>
                <p className="text-xs text-muted-foreground">Lançamentos no total</p>
            </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader className="flex justify-between items-center">
            <div>
              <CardTitle>Inventário de Produtos</CardTitle>
              <CardDescription>Para adicionar novos tipos de produto, vá para a página de Administrador.</CardDescription>
            </div>
            <Button asChild variant="outline">
                <Link href="/admin"><PlusCircle className="mr-2 h-4 w-4"/>Gerenciar Tipos</Link>
            </Button>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead>Estoque Atual</TableHead>
                        <TableHead>Custo Unitário</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {products.map(product => {
                        const currentStock = productStockMap[product.name] || 0;
                        return (
                            <TableRow key={product.name}>
                                <TableCell className="font-medium">{product.name}</TableCell>
                                <TableCell>
                                    <span className={`font-semibold ${currentStock <= 2 ? 'text-red-500' : 'text-foreground'}`}>
                                        {currentStock} {product.unit}(s)
                                    </span>
                                </TableCell>
                                <TableCell>{formatCurrency(product.cost)}</TableCell>
                                <TableCell className="text-right">
                                    <AddStockDialog product={product} onStockAdded={fetchStockData} />
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  );
}

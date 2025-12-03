
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Box, PlusCircle, PackageSearch, PackageCheck, PackageX } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { useState, useEffect } from "react";
import { getSettings, type HofProduct } from "@/lib/actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export default function HofStockPage() {
  const [products, setProducts] = useState<HofProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      const settings = await getSettings();
      setProducts(settings.hofProducts || []);
      setLoading(false);
    }
    fetchProducts();
  }, []);

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
                <CardTitle className="text-sm font-medium">Itens em Estoque</CardTitle>
                <PackageSearch className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{products.length}</div>
                <p className="text-xs text-muted-foreground">Tipos de produtos cadastrados</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Estoque OK</CardTitle>
                <PackageCheck className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">(Em breve)</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Estoque Baixo</CardTitle>
                <PackageX className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">(Em breve)</p>
            </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader className="flex justify-between items-center">
            <div>
              <CardTitle>Produtos Cadastrados</CardTitle>
              <CardDescription>Esta é sua lista mestre de produtos. Para adicionar/remover, vá para a página de Administrador.</CardDescription>
            </div>
            <Button asChild variant="outline">
                <Link href="/admin"><PlusCircle className="mr-2 h-4 w-4"/>Adicionar Produto</Link>
            </Button>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead>Unidade</TableHead>
                        <TableHead>Custo</TableHead>
                        <TableHead>Estoque Atual</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {products.map(product => (
                        <TableRow key={product.name}>
                            <TableCell className="font-medium">{product.name}</TableCell>
                            <TableCell>{product.unit}</TableCell>
                            <TableCell>{formatCurrency(product.cost)}</TableCell>
                            <TableCell className="font-semibold text-muted-foreground">(Em breve)</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  );
}

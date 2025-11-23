
'use client';

import { useState, useEffect } from 'react';
import { getVials, type Vial } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { PlusCircle, Warehouse, Droplets, FlaskConical, AlertTriangle, Package } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDate } from '@/lib/utils';


export default function StockControlPage() {
    const [vials, setVials] = useState<Vial[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchVials = async () => {
            setLoading(true);
            const data = await getVials();
            setVials(data);
            setLoading(false);
        };
        fetchVials();
    }, []);

    const totalMg = vials.reduce((acc, vial) => acc + vial.totalMg, 0);
    const remainingMg = vials.reduce((acc, vial) => acc + vial.remainingMg, 0);
    const soldMg = totalMg - remainingMg;
    const stockPercentage = totalMg > 0 ? (remainingMg / totalMg) * 100 : 0;
    
    const getProgressColor = () => {
        if (stockPercentage <= 25) return 'bg-red-500';
        if (stockPercentage <= 50) return 'bg-yellow-500';
        return 'bg-primary';
    }


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
            
            <Card>
                <CardHeader>
                    <CardTitle>Visão Geral do Estoque</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="mb-4">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium">Estoque Restante</span>
                            <span className={`text-sm font-bold ${stockPercentage <= 25 ? 'text-red-500' : ''}`}>{stockPercentage.toFixed(1)}%</span>
                        </div>
                        <Progress value={stockPercentage} indicatorClassName={getProgressColor()} />
                         {stockPercentage <= 25 && (
                            <div className="mt-2 flex items-center text-sm text-red-500">
                                <AlertTriangle className="h-4 w-4 mr-2"/>
                                <p>Estoque baixo! Considere comprar mais frascos.</p>
                            </div>
                         )}
                    </div>
                     <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-6">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total em Estoque (mg)</CardTitle>
                                <Warehouse className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{totalMg.toFixed(1)} mg</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Estoque Utilizado (mg)</CardTitle>
                                <Droplets className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{soldMg.toFixed(1)} mg</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Estoque Restante (mg)</CardTitle>
                                <FlaskConical className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-primary">{remainingMg.toFixed(1)} mg</div>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Frascos em Estoque</CardTitle>
                                <Package className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{vials.length}</div>
                            </CardContent>
                        </Card>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Lista de Frascos</CardTitle>
                    <CardDescription>Detalhes de cada frasco em seu inventário.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {vials.length > 0 ? (
                        vials.map(vial => (
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
                                 <CardFooter>
                                    <p className="text-xs text-muted-foreground">ID: {vial.id}</p>
                                 </CardFooter>
                            </Card>
                        ))
                    ) : (
                         <div className="col-span-full text-center py-12 text-muted-foreground">
                            <p>Nenhum frasco no estoque.</p>
                            <Button variant="link" asChild><Link href="/stock-control/new">Adicionar o primeiro frasco</Link></Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

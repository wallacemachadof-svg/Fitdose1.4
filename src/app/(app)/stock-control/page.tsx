
'use client';

import { useState, useEffect } from "react";
import { getStockLevels, updateStockLevel, type Stock } from "@/lib/data";
import { getStockStatusVariant } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Warehouse, Edit, Save, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export default function StockControlPage() {
    const [stockLevels, setStockLevels] = useState<Stock[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingDose, setEditingDose] = useState<string | null>(null);
    const [newQuantity, setNewQuantity] = useState<number>(0);
    const [isUpdating, setIsUpdating] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const fetchStock = async () => {
            setLoading(true);
            const data = await getStockLevels();
            setStockLevels(data);
            setLoading(false);
        };
        fetchStock();
    }, []);

    const handleEditClick = (stockItem: Stock) => {
        setEditingDose(stockItem.dose);
        setNewQuantity(stockItem.quantity);
    };

    const handleCancelClick = () => {
        setEditingDose(null);
    };

    const handleSaveClick = async (dose: string) => {
        setIsUpdating(true);
        try {
            await updateStockLevel(dose, newQuantity);
            setStockLevels(stockLevels.map(s => s.dose === dose ? { ...s, quantity: newQuantity } : s));
            toast({
                title: "Estoque Atualizado!",
                description: `A quantidade da dose de ${dose}mg foi atualizada.`,
            });
            setEditingDose(null);
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Erro ao atualizar",
                description: "Não foi possível atualizar o estoque.",
            });
        } finally {
            setIsUpdating(false);
        }
    };

    if (loading) {
        return <StockControlSkeleton />;
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Warehouse className="h-6 w-6" />
                        <div>
                            <CardTitle>Controle de Estoque</CardTitle>
                            <CardDescription>Visualize e gerencie a quantidade de doses disponíveis.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Dose (mg)</TableHead>
                                <TableHead>Quantidade</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {stockLevels.map((item) => {
                                const status = getStockStatusVariant(item.quantity);
                                const isEditing = editingDose === item.dose;
                                return (
                                    <TableRow key={item.dose}>
                                        <TableCell className="font-semibold">{item.dose}</TableCell>
                                        <TableCell>
                                            {isEditing ? (
                                                <Input
                                                    type="number"
                                                    value={newQuantity}
                                                    onChange={(e) => setNewQuantity(parseInt(e.target.value, 10) || 0)}
                                                    className="w-24 h-8"
                                                    disabled={isUpdating}
                                                />
                                            ) : (
                                                item.quantity
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={'default'} className={`${status.color} ${status.textColor} border-none`}>{status.label}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {isEditing ? (
                                                <div className="flex gap-2 justify-end">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleSaveClick(item.dose)} disabled={isUpdating}>
                                                        {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 text-green-500" />}
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCancelClick} disabled={isUpdating}>
                                                        <X className="h-4 w-4 text-red-500" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditClick(item)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </Card>
        </div>
    );
}

function StockControlSkeleton() {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-8" />
                    <div>
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-64 mt-2" />
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead><Skeleton className="h-5 w-24" /></TableHead>
                            <TableHead><Skeleton className="h-5 w-24" /></TableHead>
                            <TableHead><Skeleton className="h-5 w-24" /></TableHead>
                            <TableHead className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {[...Array(5)].map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-10" /></TableCell>
                                <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

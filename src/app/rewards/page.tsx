
'use client';

import { useState, useEffect } from "react";
import { getPatients, type Patient } from "@/lib/actions";
import { formatCurrency, getHighestReward } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Award, Gift, Star, Ticket, Info } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export default function RewardsPage() {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        const fetchPatients = async () => {
            setLoading(true);
            const data = await getPatients();
            setPatients(data);
            setLoading(false);
        };
        fetchPatients();
    }, []);

    const filteredPatients = patients
        .filter(patient => patient.fullName.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => (b.points || 0) - (a.points || 0));

    const totalPoints = patients.reduce((acc, p) => acc + (p.points || 0), 0);
    const topPatient = filteredPatients[0];

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-12 w-1/3" />
                <div className="grid gap-4 md:grid-cols-2">
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                </div>
                <Card><CardContent className="pt-6"><Skeleton className="h-80" /></CardContent></Card>
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Programa de Recompensas</h1>
                <p className="text-muted-foreground">Acompanhe os pontos dos seus pacientes e suas recompensas.</p>
            </div>

             <Card className="bg-gradient-to-r from-primary/10 to-transparent">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Info className="h-5 w-5 text-primary" />Como Funciona o Programa?</CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-3 gap-6 text-sm">
                    <div className="flex items-start gap-3">
                        <Star className="h-6 w-6 text-yellow-500 mt-1"/>
                        <div>
                            <h3 className="font-semibold">Acumule Pontos</h3>
                            <p className="text-muted-foreground">Cada dose aplicada ou indicação de novo paciente gera pontos para o paciente.</p>
                        </div>
                    </div>
                     <div className="flex items-start gap-3">
                        <Gift className="h-6 w-6 text-red-500 mt-1"/>
                        <div>
                            <h3 className="font-semibold">Troque por Descontos</h3>
                            <p className="text-muted-foreground">Os pontos acumulados podem ser trocados por descontos na compra de novas doses.</p>
                        </div>
                    </div>
                     <div className="flex items-start gap-3">
                        <Award className="h-6 w-6 text-blue-500 mt-1"/>
                        <div>
                            <h3 className="font-semibold">Regra de Conversão</h3>
                            <p className="text-muted-foreground">A cada 10 pontos, o paciente ganha R$1,00 de desconto.</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

             <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ranking - Top 1 Paciente</CardTitle>
                        <Award className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        {topPatient ? (
                            <>
                            <div className="text-2xl font-bold">{topPatient.fullName}</div>
                            <p className="text-xs text-muted-foreground">
                                {topPatient.points || 0} pontos
                            </p>
                            </>
                        ) : (
                            <p className="text-sm text-muted-foreground">Nenhum paciente com pontos.</p>
                        )}
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Pontos Distribuídos</CardTitle>
                        <Ticket className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalPoints}</div>
                        <p className="text-xs text-muted-foreground">
                            Equivalente a {formatCurrency(totalPoints / 10)} em descontos.
                        </p>
                    </CardContent>
                </Card>
            </div>
            
            <Card>
                 <CardHeader>
                    <CardTitle>Pontuação dos Pacientes</CardTitle>
                     <CardDescription>
                        <Input 
                            placeholder="Buscar paciente..."
                            className="max-w-sm mt-2"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Ranking</TableHead>
                                <TableHead>Paciente</TableHead>
                                <TableHead>Pontos</TableHead>
                                <TableHead>Recompensa Disponível</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredPatients.length > 0 ? (
                                filteredPatients.map((patient, index) => {
                                    const reward = getHighestReward(patient.points || 0);
                                    return (
                                        <TableRow key={patient.id}>
                                             <TableCell className="font-bold text-lg text-muted-foreground w-24">
                                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                                                    #{index + 1}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Link href={`/patients/${patient.id}`} className="flex items-center gap-3 group">
                                                    <Avatar>
                                                        <AvatarImage src={patient.avatarUrl} alt={patient.fullName} />
                                                        <AvatarFallback>{patient.fullName.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <span className="font-medium group-hover:text-primary group-hover:underline">{patient.fullName}</span>
                                                </Link>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-bold text-lg">{patient.points || 0}</div>
                                            </TableCell>
                                            <TableCell>
                                                {reward ? (
                                                    <Badge variant="secondary" className="text-green-600 border-green-600/50">
                                                        <Gift className="h-4 w-4 mr-2" />
                                                        {reward.label}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-sm text-muted-foreground">Sem recompensas</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        Nenhum paciente encontrado.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

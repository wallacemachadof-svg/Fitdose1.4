
'use client';

import { useState, useEffect } from "react";
import { getPatients, reactivateTreatment, type Patient, type TreatmentStatus } from "@/lib/actions";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserX, UserCheck, Search, Info } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

const statusMap: Record<TreatmentStatus, { label: string; variant: 'destructive' | 'outline' | 'secondary' }> = {
    'abandoned': { label: 'Abandono', variant: 'destructive' },
    'non-payment': { label: 'Inadimplência', variant: 'destructive' },
    'completed': { label: 'Concluído', variant: 'outline' },
    'active': { label: 'Ativo', variant: 'secondary' },
};


export default function FinishedTreatmentsPage() {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const { toast } = useToast();

    const fetchPatients = async () => {
        setLoading(true);
        const allPatients = await getPatients();
        setPatients(allPatients.filter(p => p.treatmentStatus && p.treatmentStatus !== 'active'));
        setLoading(false);
    };

    useEffect(() => {
        fetchPatients();
    }, []);

    const handleReactivate = async (patientId: string) => {
        try {
            await reactivateTreatment(patientId);
            toast({
                title: "Paciente Reativado!",
                description: "O paciente foi movido de volta para a lista de ativos e um novo cronograma de doses foi gerado.",
            });
            fetchPatients();
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Erro ao reativar",
                description: "Não foi possível reativar o paciente.",
            });
        }
    };
    
    const filteredPatients = patients.filter(patient => 
        patient.fullName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return <FinishedTreatmentsPageSkeleton />;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Tratamentos Finalizados</h1>
                    <p className="text-muted-foreground">
                        Visualize e gerencie pacientes com tratamentos concluídos, abandonados ou pausados.
                    </p>
                </div>
                 <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Buscar paciente..."
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Paciente</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Data Finalização</TableHead>
                                <TableHead>Motivo</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredPatients.length > 0 ? (
                                filteredPatients.map((patient) => {
                                    const statusInfo = patient.treatmentStatus ? statusMap[patient.treatmentStatus] : { label: 'N/D', variant: 'secondary'};
                                    return (
                                        <TableRow key={patient.id}>
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
                                                <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                {formatDate(patient.terminationDate)}
                                            </TableCell>
                                             <TableCell>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Info className="h-4 w-4 shrink-0" />
                                                    <span className="truncate" title={patient.terminationReason}>{patient.terminationReason || 'Não informado'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button onClick={() => handleReactivate(patient.id)} size="sm">
                                                    <UserCheck className="mr-2 h-4 w-4" />
                                                    Reativar
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
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

function FinishedTreatmentsPageSkeleton() {
    return (
        <div className="space-y-6">
             <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div>
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-96 mt-2" />
                </div>
                 <Skeleton className="h-10 w-64" />
            </div>
            <Card>
                <CardContent className="p-0">
                    <Table>
                         <TableHeader>
                            <TableRow>
                                <TableHead><Skeleton className="h-5 w-32" /></TableHead>
                                <TableHead><Skeleton className="h-5 w-24" /></TableHead>
                                <TableHead><Skeleton className="h-5 w-28" /></TableHead>
                                <TableHead><Skeleton className="h-5 w-48" /></TableHead>
                                <TableHead className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {[...Array(3)].map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Skeleton className="h-10 w-10 rounded-full" />
                                            <Skeleton className="h-5 w-40" />
                                        </div>
                                    </TableCell>
                                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-56" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-9 w-28 ml-auto" /></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}


'use client';

import { useState, useEffect } from "react";
import { getPatients, deletePatient, type Patient } from "@/lib/actions";
import { formatCurrency, formatDate }from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlusCircle, MoreVertical, Edit, Trash2, Search, User, TrendingUp, TrendingDown, Phone } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export default function PatientsPage() {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);
    const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const { toast } = useToast();

    useEffect(() => {
        const fetchPatients = async () => {
            setLoading(true);
            const data = await getPatients();
            setPatients(data);
            setLoading(false);
        };
        fetchPatients();
    }, []);

    const handleDeleteClick = (patient: Patient) => {
        setPatientToDelete(patient);
        setIsDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!patientToDelete) return;
        try {
            await deletePatient(patientToDelete.id);
            setPatients(patients.filter(p => p.id !== patientToDelete.id));
            toast({
                title: "Paciente Excluído",
                description: `O paciente "${patientToDelete.fullName}" foi removido com sucesso.`,
            });
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Erro ao excluir",
                description: "Não foi possível remover o paciente.",
            });
        } finally {
            setIsDeleteDialogOpen(false);
            setPatientToDelete(null);
        }
    };
    
    const filteredPatients = patients.filter(patient =>
        patient.fullName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPatients = patients.length;
    const weightLossPatients = patients.filter(p => {
        const lastWeight = p.evolutions[p.evolutions.length - 1]?.bioimpedance?.weight;
        return lastWeight && lastWeight < p.initialWeight;
    }).length;

    const weightGainPatients = patients.filter(p => {
        const lastWeight = p.evolutions[p.evolutions.length - 1]?.bioimpedance?.weight;
        return lastWeight && lastWeight > p.initialWeight;
    }).length;
    
    if (loading) {
        return (
            <div className="space-y-6">
                 <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                    <div>
                        <h1 className="text-2xl font-bold">Pacientes</h1>
                        <p className="text-muted-foreground">Gerencie sua lista de pacientes.</p>
                    </div>
                     <div className="flex gap-2">
                        <Skeleton className="h-10 w-40" />
                        <Skeleton className="h-10 w-40" />
                    </div>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                </div>
                <Card><CardContent className="pt-6"><Skeleton className="h-64" /></CardContent></Card>
            </div>
        );
    }


    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Pacientes</h1>
                    <p className="text-muted-foreground">Gerencie sua lista de pacientes.</p>
                </div>
                <div className="flex gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Buscar paciente..."
                            className="pl-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button asChild>
                        <Link href="/cadastro">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Novo Paciente
                        </Link>
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Pacientes</CardTitle>
                        <User className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalPatients}</div>
                        <p className="text-xs text-muted-foreground">Pacientes ativos na base</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pacientes com Perda de Peso</CardTitle>
                        <TrendingDown className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{weightLossPatients}</div>
                        <p className="text-xs text-muted-foreground">Comparado ao peso inicial</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pacientes com Ganho de Peso</CardTitle>
                        <TrendingUp className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{weightGainPatients}</div>
                        <p className="text-xs text-muted-foreground">Comparado ao peso inicial</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Paciente</TableHead>
                                <TableHead>Contato</TableHead>
                                <TableHead>Início do Tratamento</TableHead>
                                <TableHead>Última Dose</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredPatients.length > 0 ? (
                                filteredPatients.map((patient) => {
                                    const lastAdministeredDose = patient.doses
                                        .filter(d => d.status === 'administered')
                                        .sort((a,b) => b.date.getTime() - a.date.getTime())[0];
                                    
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
                                            <div className="flex items-center gap-1">
                                                <Phone className="h-3 w-3 text-muted-foreground" />
                                                <span className="text-muted-foreground">{patient.phone || "Não informado"}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{formatDate(patient.firstDoseDate)}</TableCell>
                                        <TableCell>{lastAdministeredDose ? `Dose ${lastAdministeredDose.doseNumber} em ${formatDate(lastAdministeredDose.date)}` : 'Nenhuma'}</TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem asChild>
                                                        <Link href={`/patients/${patient.id}`}>
                                                            <Edit className="mr-2 h-4 w-4" />
                                                            Ver / Editar
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleDeleteClick(patient)} className="text-destructive">
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Excluir
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
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
                 {filteredPatients.length > 10 && 
                    <CardFooter className="p-4 border-t">
                        <p className="text-xs text-muted-foreground">Exibindo {filteredPatients.length} de {patients.length} pacientes.</p>
                    </CardFooter>
                 }
            </Card>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta ação não pode ser desfeita. Isso excluirá permanentemente o paciente <span className="font-bold">{patientToDelete?.fullName}</span> e todos os seus dados.
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

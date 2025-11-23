

'use client';

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from 'next/navigation';
import { getPatients, deletePatient, type Patient, type Dose } from "@/lib/actions";
import { formatCurrency, formatDate, getDoseStatus, getDaysUntilDose, getOverdueDays, generateOverdueWhatsAppLink, generateDueTodayWhatsAppLink, generateAbandonedTreatmentWhatsAppLink }from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlusCircle, MoreVertical, Edit, Trash2, Search, User, TrendingUp, TrendingDown, Phone } from "lucide-react";
import Link from "next/link";
import { FaWhatsapp } from 'react-icons/fa';
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

function PatientsPageContent() {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);
    const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const filter = searchParams.get('filter');


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
    
    const patientHasDoseWithStatus = (patient: Patient, checker: (dose: Dose) => boolean) => {
        const nextPendingDose = patient.doses.find(d => d.status === 'pending');
        if (!nextPendingDose) return false;
        return checker(nextPendingDose);
    }
    
    const filteredPatients = patients.filter(patient => {
        const nameMatch = patient.fullName.toLowerCase().includes(searchTerm.toLowerCase());
        if (!nameMatch) return false;

        if (!filter) return true;

        switch (filter) {
            case 'overdue':
                return patientHasDoseWithStatus(patient, (d) => getOverdueDays(d, patient.doses) > 0 && getOverdueDays(d, patient.doses) < 14);
            case 'due_today':
                return patientHasDoseWithStatus(patient, (d) => getDaysUntilDose(d) === 0);
            case 'abandoned':
                return patientHasDoseWithStatus(patient, (d) => getOverdueDays(d, patient.doses) >= 14);
            default:
                return true;
        }
    });

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
                    <p className="text-muted-foreground">
                        {filter === 'abandoned'
                            ? "Exibindo pacientes com risco de abandono (14+ dias de atraso)."
                            : filter
                            ? `Exibindo pacientes com doses ${filter.replace(/_/g, ' ')}.`
                            : 'Gerencie sua lista de pacientes.'
                        }
                    </p>
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
                        <Link href="/cadastro?source=internal">
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
                                <TableHead>Próxima Dose</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredPatients.length > 0 ? (
                                filteredPatients.map((patient) => {
                                    const nextPendingDose = patient.doses.find(d => d.status === 'pending');
                                    const status = nextPendingDose ? getDoseStatus(nextPendingDose, patient.doses) : { label: 'Concluído', color: 'bg-blue-500', textColor: 'text-white' };
                                    const overdueDays = nextPendingDose ? getOverdueDays(nextPendingDose, patient.doses) : 0;
                                    const isDueToday = nextPendingDose && getDaysUntilDose(nextPendingDose) === 0;
                                    const isAbandoned = overdueDays >= 14;

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
                                        <TableCell>{nextPendingDose ? `Dose ${nextPendingDose.doseNumber} em ${formatDate(nextPendingDose.date)}` : 'Nenhuma'}</TableCell>
                                        <TableCell>
                                            <Badge variant={status.color.startsWith('bg-') ? 'default' : 'outline'} className={`${status.color} ${status.textColor} border-none`}>{status.label}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                             {nextPendingDose && (overdueDays > 0 || isDueToday) && (
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-8 w-8 text-green-500 hover:text-green-600 mr-2" 
                                                    onClick={() => {
                                                        let link;
                                                        if (isAbandoned) {
                                                            link = generateAbandonedTreatmentWhatsAppLink(patient);
                                                        } else if (isDueToday) {
                                                            link = generateDueTodayWhatsAppLink(patient, nextPendingDose);
                                                        } else {
                                                            link = generateOverdueWhatsAppLink(patient);
                                                        }
                                                        window.open(link, '_blank');
                                                    }}
                                                >
                                                    <FaWhatsapp className="h-5 w-5" />
                                                </Button>
                                             )}
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem asChild>
                                                        <Link href={`/patients/${patient.id}/edit`}>
                                                            <Edit className="mr-2 h-4 w-4" />
                                                            Editar
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


export default function PatientsPage() {
    return (
        <Suspense fallback={<p>Carregando...</p>}>
            <PatientsPageContent />
        </Suspense>
    )
}

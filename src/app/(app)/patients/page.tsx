'use client';

import { useState, useEffect } from 'react';
import Link from "next/link";
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getPatients, deletePatient, type Patient } from "@/lib/data";
import { calculateBmi, formatDate } from "@/lib/utils";
import { PlusCircle, ArrowRight, MoreVertical, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const fetchPatients = async () => {
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
        toast({
            title: "Paciente Excluído",
            description: `${patientToDelete.fullName} foi removido(a) com sucesso.`,
        });
        setPatients(patients.filter(p => p.id !== patientToDelete.id));
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
  
  if (loading) {
    return <PatientsPageSkeleton />;
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Pacientes</CardTitle>
            <CardDescription>Visualize e gerencie seus pacientes.</CardDescription>
          </div>
          <Button asChild>
            <Link href="/patients/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Novo Paciente
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Paciente</TableHead>
                <TableHead className="hidden md:table-cell">Idade</TableHead>
                <TableHead className="hidden lg:table-cell">Data da 1ª Dose</TableHead>
                <TableHead className="hidden md:table-cell">IMC Inicial</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {patients.length > 0 ? (
                patients.map((patient) => {
                  const initialBmi = calculateBmi(patient.initialWeight, patient.height / 100);
                  const patientNameInitial = patient.fullName.charAt(0).toUpperCase();
                  return (
                    <TableRow key={patient.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={patient.avatarUrl} alt={patient.fullName} />
                            <AvatarFallback>{patientNameInitial}</AvatarFallback>
                          </Avatar>
                          <div className="font-medium">{patient.fullName}</div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{patient.age}</TableCell>
                      <TableCell className="hidden lg:table-cell">{formatDate(patient.firstDoseDate)}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="secondary">{initialBmi}</Badge>
                      </TableCell>
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
                                        <ArrowRight className="mr-2 h-4 w-4" />
                                        Ver Detalhes
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
                  );
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
    </>
  );
}

function PatientsPageSkeleton() {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-48 mt-2" />
                </div>
                <Skeleton className="h-10 w-36" />
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead><Skeleton className="h-5 w-24" /></TableHead>
                            <TableHead className="hidden md:table-cell"><Skeleton className="h-5 w-16" /></TableHead>
                            <TableHead className="hidden lg:table-cell"><Skeleton className="h-5 w-32" /></TableHead>
                            <TableHead className="hidden md:table-cell"><Skeleton className="h-5 w-24" /></TableHead>
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
                                <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-12" /></TableCell>
                                <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-28" /></TableCell>
                                <TableCell className="hidden md:table-cell"><Skeleton className="h-6 w-14 rounded-full" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
    
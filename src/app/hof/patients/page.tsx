
'use client';

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Search, Users, MoreVertical, Edit } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { getPatients, type Patient } from "@/lib/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function HofPatientsPage() {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);

     useEffect(() => {
        const fetchAndSetPatients = async () => {
            setLoading(true);
            const patientData = await getPatients();
            setPatients(patientData);
            setLoading(false);
        }
        fetchAndSetPatients();
    }, []);

    const filteredPatients = patients.filter(patient => 
        patient.fullName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
             <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                    <div>
                        <Skeleton className="h-8 w-64" />
                        <Skeleton className="h-4 w-96 mt-2" />
                    </div>
                    <Skeleton className="h-10 w-44" />
                </div>
                <Card>
                    <CardHeader><Skeleton className="h-10 w-full max-w-sm" /></CardHeader>
                    <CardContent className="p-0">
                       <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead><Skeleton className="h-5 w-32" /></TableHead>
                                    <TableHead><Skeleton className="h-5 w-48" /></TableHead>
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
                                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-9 w-9 ml-auto rounded-full" /></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Users className="h-6 w-6 text-primary" />
                        Pacientes (HOF)
                    </h1>
                    <p className="text-muted-foreground">
                        Gerencie seus pacientes de estética. A lista é compartilhada com o módulo de emagrecimento.
                    </p>
                </div>
                <Button asChild>
                    <Link href="/cadastro?source=internal">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Novo Paciente
                    </Link>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Buscar paciente..."
                            className="pl-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardHeader>
                 <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Paciente</TableHead>
                                <TableHead>Último Procedimento HOF</TableHead>
                                <TableHead>Próximo Retorno HOF</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredPatients.length > 0 ? (
                                filteredPatients.map(patient => (
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
                                        <TableCell className="text-muted-foreground">N/A</TableCell>
                                        <TableCell className="text-muted-foreground">N/A</TableCell>
                                        <TableCell className="text-right">
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
                                                            Editar Ficha
                                                        </Link>
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        Nenhum paciente encontrado. Comece cadastrando um novo.
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

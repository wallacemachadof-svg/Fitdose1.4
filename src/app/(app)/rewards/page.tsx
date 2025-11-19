
'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getPatients, type Patient } from "@/lib/actions";
import { getHighestReward, formatCurrency } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Award, Star, Gift } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function RewardsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPatients = async () => {
        setLoading(true);
        const data = await getPatients();
        // Sort patients by points descending
        const sortedData = data.sort((a, b) => (b.points || 0) - (a.points || 0));
        setPatients(sortedData);
        setLoading(false);
    };
    fetchPatients();
  }, []);

  if (loading) {
    return <RewardsPageSkeleton />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Award /> Programa de Recompensas</CardTitle>
        <CardDescription>Acompanhe o ranking de pontos dos seus pacientes e seus prêmios.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Posição</TableHead>
              <TableHead>Paciente</TableHead>
              <TableHead>Pontos</TableHead>
              <TableHead className="text-right">Prêmio Disponível</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {patients.length > 0 ? (
              patients.map((patient, index) => {
                const patientNameInitial = patient.fullName.charAt(0).toUpperCase();
                const reward = getHighestReward(patient.points || 0);
                return (
                  <TableRow key={patient.id}>
                    <TableCell className="font-medium text-lg w-16 text-center">{index + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={patient.avatarUrl} alt={patient.fullName} />
                          <AvatarFallback>{patientNameInitial}</AvatarFallback>
                        </Avatar>
                        <div className="font-medium">{patient.fullName}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                       <div className="flex items-center gap-2">
                         <span className="font-bold text-lg">{patient.points || 0}</span>
                         <Star className="h-4 w-4 text-yellow-500" />
                       </div>
                    </TableCell>
                     <TableCell className="text-right">
                        {reward ? (
                            <div className="flex items-center justify-end gap-2 text-accent-foreground font-semibold">
                                <Gift className="h-4 w-4 text-accent" />
                                <span>{reward.label} ({formatCurrency(reward.discountValue)})</span>
                            </div>
                        ) : (
                            <span className="text-muted-foreground text-sm">-</span>
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
  );
}

function RewardsPageSkeleton() {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-64" />
                <Skeleton className="h-4 w-80 mt-2" />
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead><Skeleton className="h-5 w-20" /></TableHead>
                            <TableHead><Skeleton className="h-5 w-48" /></TableHead>
                            <TableHead><Skeleton className="h-5 w-24" /></TableHead>
                            <TableHead className="text-right"><Skeleton className="h-5 w-32 ml-auto" /></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {[...Array(5)].map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-5 w-8 mx-auto" /></TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Skeleton className="h-10 w-10 rounded-full" />
                                        <Skeleton className="h-5 w-40" />
                                    </div>
                                </TableCell>
                                <TableCell><Skeleton className="h-6 w-12" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-5 w-28 ml-auto" /></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

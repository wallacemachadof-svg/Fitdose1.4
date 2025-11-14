import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getPatients } from "@/lib/data";
import { calculateBmi, formatDate } from "@/lib/utils";
import { PlusCircle, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default async function PatientsPage() {
  const patients = await getPatients();

  return (
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
              <TableHead>Ação</TableHead>
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
                    <TableCell>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/patients/${patient.id}`}>
                          Ver Detalhes <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
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
  );
}

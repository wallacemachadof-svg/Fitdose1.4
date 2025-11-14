import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getPatients, type Dose } from "@/lib/data";
import { getDoseStatus, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Syringe, User, BellDot } from "lucide-react";
import Link from 'next/link';
import { differenceInDays } from "date-fns";

type UpcomingDose = Dose & {
  patientId: string;
  patientName: string;
};

export default async function DashboardPage() {
  const patients = await getPatients();

  const totalPatients = patients.length;
  
  const allDoses: UpcomingDose[] = patients.flatMap(p => 
    p.doses
      .filter(d => d.status === 'pending')
      .map(d => ({ ...d, patientId: p.id, patientName: p.fullName }))
  );
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingDoses = allDoses
    .filter(d => {
      const doseDate = new Date(d.date);
      doseDate.setHours(0, 0, 0, 0);
      const diff = differenceInDays(doseDate, today);
      return diff >= 0 && diff <= 7;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const overdueDosesCount = allDoses.filter(d => {
    const doseDate = new Date(d.date);
    doseDate.setHours(0, 0, 0, 0);
    return differenceInDays(doseDate, today) < 0;
  }).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Pacientes
            </CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPatients}</div>
            <p className="text-xs text-muted-foreground">
              Pacientes ativos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Próximas Doses (7 dias)
            </CardTitle>
            <Syringe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingDoses.length}</div>
            <p className="text-xs text-muted-foreground">
              Doses agendadas para a semana
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Doses Vencidas</CardTitle>
            <BellDot className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overdueDosesCount}</div>
            <p className="text-xs text-muted-foreground">
              Doses pendentes de aplicação
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Agenda da Semana</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Paciente</TableHead>
                <TableHead>Data da Dose</TableHead>
                <TableHead>Dose N°</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {upcomingDoses.length > 0 ? (
                upcomingDoses.map((dose) => {
                  const status = getDoseStatus(dose);
                  return (
                    <TableRow key={`${dose.patientId}-${dose.id}`}>
                      <TableCell>
                        <Link href={`/patients/${dose.patientId}`} className="font-medium text-primary-foreground hover:underline">
                          {dose.patientName}
                        </Link>
                      </TableCell>
                      <TableCell>{formatDate(dose.date)}</TableCell>
                      <TableCell>{dose.doseNumber}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${status.color} ${status.textColor} border-none`}>
                          {status.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    Nenhuma dose agendada para os próximos 7 dias.
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


'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getPatients, getSales, type Dose, type Sale } from "@/lib/actions";
import { getDoseStatus, formatDate, formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Syringe, User, BellDot, BarChart3, PieChart, TrendingUp, DollarSign, Link as LinkIcon, Copy, Check } from "lucide-react";
import Link from 'next/link';
import { differenceInDays, subDays, format as formatDateFns } from "date-fns";
import { ptBR } from 'date-fns/locale';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Pie, PieChart as RechartsPieChart, Cell, Legend } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';

type UpcomingDose = Dose & {
  patientId: string;
  patientName: string;
};

type Patient = Awaited<ReturnType<typeof getPatients>>[0];

export default function DashboardPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [registrationLink, setRegistrationLink] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [patientData, salesData] = await Promise.all([
        getPatients(),
        getSales(),
      ]);
      setPatients(patientData);
      setSales(salesData);
      setRegistrationLink(`${window.location.origin}/cadastro`);
      setLoading(false);
    };
    fetchData();
  }, []);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(registrationLink);
    toast({
      title: "Link Copiado!",
      description: "O link de cadastro foi copiado para a área de transferência.",
    });
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

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

  const overdueDosesCount = patients.filter(p => 
    p.doses.some(d => getDoseStatus(d, p.doses).messageType === 'overdue')
  ).length;

  const thirtyDaysAgo = subDays(today, 30);
  const recentSales = sales.filter(s => new Date(s.saleDate) >= thirtyDaysAgo);
  
  const totalRevenueLast30Days = recentSales.reduce((acc, sale) => acc + sale.total, 0);

  const salesByDay = recentSales.reduce((acc, sale) => {
    const day = formatDateFns(new Date(sale.saleDate), 'dd/MM');
    acc[day] = (acc[day] || 0) + sale.total;
    return acc;
  }, {} as Record<string, number>);

  const salesByDayChartData = Object.entries(salesByDay).map(([name, total]) => ({ name, total })).reverse();

  const salesByDose = recentSales.reduce((acc, sale) => {
    const dose = `${sale.soldDose} mg`;
    acc[dose] = (acc[dose] || 0) + 1;
    return acc;
    }, {} as Record<string, number>);

  const salesByDoseChartData = Object.entries(salesByDose).map(([name, value]) => ({ name, value }));
  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#a4de6c', '#d0ed57'];


  return (
    <div className="flex flex-col gap-6">
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Link de Cadastro
              <LinkIcon className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
             <p className="text-xs text-muted-foreground">
                Envie este link para seus novos pacientes.
            </p>
             <div className="flex items-center space-x-2">
                <Input value={registrationLink} readOnly className="h-9"/>
                <Button variant="outline" size="icon" className="h-9 w-9" onClick={copyToClipboard}>
                    <Copy className="h-4 w-4" />
                </Button>
            </div>
          </CardContent>
        </Card>
        <Link href="/patients">
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pacientes Ativos
              </CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPatients}</div>
              <p className="text-xs text-muted-foreground">
                Total de pacientes registrados
              </p>
            </CardContent>
          </Card>
        </Link>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Receita (Últimos 30 dias)
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenueLast30Days)}</div>
             <p className="text-xs text-muted-foreground">
              Total de vendas no período
            </p>
          </CardContent>
        </Card>
        <Link href="/schedule">
            <Card className="hover:bg-muted/50 transition-colors">
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
        </Link>
        <Link href="/patients?filter=overdue">
            <Card className="hover:bg-destructive/10 transition-colors border-destructive/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Doses Vencidas</CardTitle>
                    <BellDot className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-destructive">{overdueDosesCount}</div>
                    <p className="text-xs text-muted-foreground">
                    Pacientes com doses pendentes
                    </p>
                </CardContent>
            </Card>
        </Link>
      </div>

       <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />Vendas nos Últimos 30 Dias</CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={salesByDayChartData}>
                            <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/>
                            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value}`}/>
                            <Tooltip formatter={(value) => formatCurrency(value as number)} cursor={{fill: 'hsl(var(--muted))'}} />
                            <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><PieChart className="h-5 w-5" />Vendas por Dose</CardTitle>
                </CardHeader>
                <CardContent>
                     <ResponsiveContainer width="100%" height={300}>
                        <RechartsPieChart>
                            <Pie data={salesByDoseChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={false} label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                                const radius = innerRadius + (outerRadius - innerRadius) * 1.2;
                                const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                                const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                                return (
                                <text x={x} y={y} fill="currentColor" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-xs">
                                    {`${(percent * 100).toFixed(0)}%`}
                                </text>
                                );
                            }}>
                                {salesByDoseChartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                             <Legend iconSize={10} />
                            <Tooltip formatter={(value, name) => [`${value} vendas`, name]} />
                        </RechartsPieChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>

      <Card>
        <CardHeader>
          <CardTitle>Agenda da Semana</CardTitle>
           <CardDescription>Doses com aplicação agendada para os próximos 7 dias.</CardDescription>
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
                  const patient = patients.find(p => p.id === dose.patientId);
                  const status = getDoseStatus(dose, patient?.doses);
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
                        <Badge variant={status.color.includes('bg-') ? 'default' : 'outline'} className={`${status.color} ${status.textColor} border-none`}>
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


function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
      <Skeleton className="h-80" />
    </div>
  );
}

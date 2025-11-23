

'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getPatients, getSales, type Patient, type Sale } from "@/lib/actions";
import { formatCurrency } from "@/lib/utils";
import { User, BarChart3, PieChart, DollarSign, Link as LinkIcon, Copy, ShoppingCart, PackageX, PackageCheck, AlertCircle, Clock, CalendarIcon, Building, Laptop, Handshake } from "lucide-react";
import Link from 'next/link';
import { subDays, format as formatDateFns, startOfToday, isWithinInterval, addDays } from "date-fns";
import { ptBR } from 'date-fns/locale';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Pie, PieChart as RechartsPieChart, Cell, Legend } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Combobox } from '@/components/ui/combobox';
import { getOverdueDays, getDaysUntilDose } from '@/lib/utils';


export default function DashboardPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [registrationLink, setRegistrationLink] = useState('');
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 29),
    to: new Date(),
  });
  const [selectedPatientId, setSelectedPatientId] = useState<string>('all');


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

  const patientOptions = useMemo(() => {
    const options = patients.map(p => ({ value: p.id, label: p.fullName }));
    options.unshift({ value: 'all', label: 'Todos os Pacientes' });
    return options;
  }, [patients]);
  
  
  const { 
    salesChartData, 
    totalFilteredRevenue, 
    filterTitle,
    salesByDoseChartData,
    overduePatientsCount,
    dueTodayPatientsCount,
    pendingPaymentsCount,
    pendingDeliveriesCount,
    presencialCount,
    onlineCount,
    hibridoCount,
  } = useMemo(() => {
    const startDate = dateRange?.from || subDays(startOfToday(), 29);
    const endDate = dateRange?.to || startOfToday();
    let title: string;

    // 1. Filter patients
    const filteredPatients = selectedPatientId === 'all' 
        ? patients 
        : patients.filter(p => p.id === selectedPatientId);

    // 2. Filter sales
    const filteredSalesByPatient = selectedPatientId === 'all'
        ? sales
        : sales.filter(s => s.patientId === selectedPatientId);

    const filteredSalesByDate = filteredSalesByPatient.filter(s => {
        const saleDate = new Date(s.saleDate);
        return isWithinInterval(saleDate, { start: startDate, end: addDays(endDate, 1) });
    });

    if (selectedPatientId === 'all') {
        title = `Visão Geral`;
    } else {
        const patientName = patients.find(p => p.id === selectedPatientId)?.fullName || 'Paciente';
        title = `Análise de ${patientName}`;
    }
    
    // --- Calculations based on filtered data ---

    const _presencialCount = filteredPatients.filter(p => p.serviceModel === 'presencial').length;
    const _onlineCount = filteredPatients.filter(p => p.serviceModel === 'online').length;
    const _hibridoCount = filteredPatients.filter(p => p.serviceModel === 'hibrido').length;

    // Doses (not dependent on date range, but on patient filter)
    const allPendingDoses = filteredPatients.flatMap(p => 
        p.doses
          .filter(d => d.status === 'pending')
          .map(d => ({ ...d, patientId: p.id, patientName: p.fullName, allDoses: p.doses }))
    );
    const _overdueDoses = allPendingDoses.filter(d => getOverdueDays(d, d.allDoses) > 0);
    const _dueToday = allPendingDoses.filter(d => getDaysUntilDose(d) === 0);
    const _overduePatientsCount = new Set(_overdueDoses.map(d => d.patientId)).size;
    const _dueTodayPatientsCount = new Set(_dueToday.map(d => d.patientId)).size;

    // Sales metrics (dependent on patient AND date range)
    const total = filteredSalesByDate.reduce((acc, sale) => acc + sale.total, 0);

    const salesByDay = filteredSalesByDate.reduce((acc, sale) => {
        const day = formatDateFns(new Date(sale.saleDate), 'dd/MM');
        acc[day] = (acc[day] || 0) + sale.total;
        return acc;
    }, {} as Record<string, number>);
    const _salesChartData = Object.entries(salesByDay).map(([name, total]) => ({ name, total })).reverse();
    
    const _pendingPayments = filteredSalesByDate.filter(s => s.paymentStatus === 'pendente').length;
    const _pendingDeliveries = filteredSalesByDate.filter(s => s.deliveryStatus !== 'entregue').length;

    const salesByDose = filteredSalesByDate.reduce((acc, sale) => {
        const dose = `${sale.soldDose} mg`;
        acc[dose] = (acc[dose] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    const _salesByDoseChartData = Object.entries(salesByDose).map(([name, value]) => ({ name, value }));

    return { 
        salesChartData: _salesChartData, 
        totalFilteredRevenue: total, 
        filterTitle: title,
        salesByDoseChartData: _salesByDoseChartData,
        overduePatientsCount: _overduePatientsCount,
        dueTodayPatientsCount: _dueTodayPatientsCount,
        pendingPaymentsCount: _pendingPayments,
        pendingDeliveriesCount: _pendingDeliveries,
        presencialCount: _presencialCount,
        onlineCount: _onlineCount,
        hibridoCount: _hibridoCount,
    };

  }, [sales, dateRange, selectedPatientId, patients]);


  if (loading) {
    return <DashboardSkeleton />;
  }
  
  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#a4de6c', '#d0ed57'];
  
  return (
    <div className="flex flex-col gap-6">
       <Card>
        <CardHeader>
          <CardTitle>{filterTitle}</CardTitle>
          <CardDescription>Use os filtros abaixo para analisar os dados do período e paciente desejado.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row justify-start items-center gap-4">
          <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
              <Combobox 
                  options={patientOptions}
                  value={selectedPatientId}
                  onChange={(value) => setSelectedPatientId(value)}
                  placeholder="Filtrar por paciente..."
                  noResultsText="Nenhum paciente encontrado."
              />
              <Popover>
                  <PopoverTrigger asChild>
                      <Button
                      id="date"
                      variant={"outline"}
                      className={cn(
                          "w-full md:w-[300px] justify-start text-left font-normal",
                          !dateRange && "text-muted-foreground"
                      )}
                      >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                          dateRange.to ? (
                          <>
                              {formatDateFns(dateRange.from, "dd/MM/y")} -{" "}
                              {formatDateFns(dateRange.to, "dd/MM/y")}
                          </>
                          ) : (
                          formatDateFns(dateRange.from, "dd/MM/y")
                          )
                      ) : (
                          <span>Selecione um período</span>
                      )}
                      </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={2}
                      locale={ptBR}
                      />
                  </PopoverContent>
              </Popover>
            </div>
          </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Atend. Presencial</CardTitle>
                <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{presencialCount}</div>
                <p className="text-xs text-muted-foreground">pacientes no total</p>
            </CardContent>
          </Card>
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Atend. Online</CardTitle>
                <Laptop className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{onlineCount}</div>
                <p className="text-xs text-muted-foreground">pacientes no total</p>
            </CardContent>
          </Card>
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Atend. Híbrido</CardTitle>
                <Handshake className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{hibridoCount}</div>
                <p className="text-xs text-muted-foreground">pacientes no total</p>
            </CardContent>
          </Card>
      </div>
      
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Link href="/patients?filter=overdue">
            <Card className="hover:bg-destructive/10 transition-colors border-destructive/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Doses Vencidas</CardTitle>
                    <AlertCircle className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-destructive">{overduePatientsCount}</div>
                    <p className="text-xs text-muted-foreground">Pacientes com doses atrasadas</p>
                </CardContent>
            </Card>
        </Link>
        <Link href="/patients?filter=due_today">
            <Card className="hover:bg-amber-500/10 transition-colors border-amber-500/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Vencem Hoje</CardTitle>
                    <Clock className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-amber-500">{dueTodayPatientsCount}</div>
                    <p className="text-xs text-muted-foreground">Pacientes com dose para hoje</p>
                </CardContent>
            </Card>
        </Link>
        <Link href="/sales-control?status=pendente">
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pagamentos Pendentes
              </CardTitle>
              <PackageX className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">{pendingPaymentsCount}</div>
               <p className="text-xs text-muted-foreground">Vendas no período</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/sales-control">
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Entregas Pendentes
              </CardTitle>
              <PackageCheck className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">{pendingDeliveriesCount}</div>
               <p className="text-xs text-muted-foreground">Vendas no período</p>
            </CardContent>
          </Card>
        </Link>
      </div>

       <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />Vendas no período</CardTitle>
                    <CardDescription>Receita total de {formatCurrency(totalFilteredRevenue)}</CardDescription>
                </CardHeader>
                <CardContent>
                    {salesChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={salesChartData}>
                                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/>
                                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value}`}/>
                                <Tooltip formatter={(value) => formatCurrency(value as number)} cursor={{fill: 'hsl(var(--muted))'}} />
                                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                            Nenhuma venda encontrada para este período.
                        </div>
                    )}
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><PieChart className="h-5 w-5" />Vendas por Dose</CardTitle>
                     <CardDescription>Distribuição das doses mais vendidas no período.</CardDescription>
                </CardHeader>
                <CardContent>
                    {salesByDoseChartData.length > 0 ? (
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
                    ) : (
                        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                            Nenhuma venda encontrada para este período.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Link de Cadastro Público
              <LinkIcon className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
             <p className="text-xs text-muted-foreground">
                Envie este link para seus novos pacientes realizarem o auto-cadastro.
            </p>
             <div className="flex items-center space-x-2">
                <Input value={registrationLink} readOnly className="h-9"/>
                <Button variant="outline" size="icon" className="h-9 w-9" onClick={copyToClipboard}>
                    <Copy className="h-4 w-4" />
                </Button>
            </div>
          </CardContent>
        </Card>
    </div>
  );
}


function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
       <Skeleton className="h-24" />
    </div>
  );
}

    

    
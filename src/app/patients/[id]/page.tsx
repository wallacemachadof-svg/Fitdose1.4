

'use client';

import { useState, useEffect, useMemo } from 'react';
import { notFound, useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  getPatientById,
  updateDose,
  deleteBioimpedanceEntry,
  type Patient,
  type Dose,
  type Evolution,
  type Bioimpedance,
} from '@/lib/actions';
import {
  calculateBmi,
  formatDate,
  getDoseStatus,
  generateWhatsAppLink,
  formatCurrency,
  getPaymentStatusVariant
} from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Activity,
    Weight,
    Ruler,
    Target,
    Phone,
    MapPin,
    CalendarIcon,
    Pencil,
    Bot,
    TrendingDown,
    Pill,
    Stethoscope,
    CircleSlash,
    Loader2,
    BarChart3,
    DollarSign,
    HeartPulse,
    UserCheck,
    Droplets,
    FileText,
    ArrowLeft,
    CheckSquare,
    Bone,
    Flame,
    Beef,
    ArrowDown,
    ArrowUp,
    Minus,
    Trash2,
} from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { Skeleton } from "@/components/ui/skeleton";
import { summarizeHealthData } from '@/ai/flows/summarize-health-data';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format as formatDateFns } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';

export default function PatientDetailPage() {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [evolutionToDelete, setEvolutionToDelete] = useState<Evolution | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const router = useRouter();
  const { toast } = useToast();
  const params = useParams();
  const patientId = params.id as string;

  useEffect(() => {
    if (!patientId) return;
    const fetchPatient = async () => {
      const fetchedPatient = await getPatientById(patientId);
      if (!fetchedPatient) {
        notFound();
      }
      setPatient(fetchedPatient);
      setLoading(false);
    };

    fetchPatient();
  }, [patientId]);

  const handleSummarize = async () => {
    if (!patient?.healthContraindications) return;
    setSummaryLoading(true);
    setSummary('');
    try {
        const result = await summarizeHealthData({ healthContraindicationsForm: patient.healthContraindications });
        setSummary(result.summary);
    } catch (error) {
        console.error('Error summarizing health data:', error);
        toast({
            variant: "destructive",
            title: "Erro ao resumir",
            description: "Ocorreu um erro ao gerar o resumo.",
        });
        setSummary('Ocorreu um erro ao gerar o resumo.');
    } finally {
        setSummaryLoading(false);
    }
  };

  const handleRescheduleDose = async (doseId: number, newDate: Date) => {
    if (!patient) return;
    try {
      const updatedPatient = await updateDose(patient.id, doseId, { date: newDate });
      if (updatedPatient) {
        setPatient(updatedPatient);
        toast({
          title: "Dose Reagendada!",
          description: `A dose ${doseId} e as subsequentes foram reagendadas.`,
        });
      }
    } catch (error) {
      console.error("Failed to reschedule dose", error);
      toast({
        variant: "destructive",
        title: "Erro ao reagendar",
        description: "Não foi possível reagendar a dose.",
      });
    }
  };

  const handleNotifyClick = (patient: Patient, dose: Dose) => {
    const whatsappUrl = generateWhatsAppLink(patient, dose);
    window.open(whatsappUrl, '_blank');
  };
  
  const handleDeleteEvolutionClick = (evolution: Evolution) => {
    setEvolutionToDelete(evolution);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDeleteEvolution = async () => {
    if (!evolutionToDelete || !patient) return;

    try {
        const updatedPatient = await deleteBioimpedanceEntry(patient.id, evolutionToDelete.id);
        setPatient(updatedPatient);
        toast({
            title: "Registro Excluído",
            description: "O registro de bioimpedância foi removido com sucesso.",
        });
    } catch (error) {
        console.error("Failed to delete bioimpedance entry:", error);
        toast({
            variant: "destructive",
            title: "Erro ao Excluir",
            description: "Não foi possível remover o registro de bioimpedância.",
        });
    } finally {
        setIsDeleteDialogOpen(false);
        setEvolutionToDelete(null);
    }
  };


  const evolutionChartData = useMemo(() => {
    if (!patient || !patient.evolutions) return [];
    
    const dataPoints = patient.evolutions
        .filter(e => e.date && e.bioimpedance)
        .map(e => ({
            date: new Date(e.date),
            ...e.bioimpedance
        }));

    if (patient.initialWeight && patient.firstDoseDate) {
        const initialDate = new Date(patient.firstDoseDate);
        if (!dataPoints.some(dp => isSameDay(dp.date, initialDate))) {
            dataPoints.push({
                date: initialDate,
                weight: patient.initialWeight,
                bmi: calculateBmi(patient.initialWeight, patient.height / 100),
            });
        }
    }
    
    return dataPoints.sort((a,b) => a.date.getTime() - b.date.getTime());

  }, [patient]);

  const evolutionHistoryData = useMemo(() => {
    if (!patient) return [];
    const history = patient.evolutions.map(e => ({
      id: e.id,
      date: e.date,
      ...e.bioimpedance,
      isInitial: false
    }));

    if (patient.initialWeight && patient.firstDoseDate) {
      const initialDate = new Date(patient.firstDoseDate);
      // Add initial record only if there's no evolution on the same day
      if (!history.some(h => isSameDay(new Date(h.date), initialDate))) {
        history.push({
          id: 'initial-record',
          date: initialDate,
          weight: patient.initialWeight,
          bmi: calculateBmi(patient.initialWeight, patient.height / 100),
          isInitial: true,
        });
      }
    }
    
    return history.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [patient]);


  if (loading || !patient) {
    return <PatientDetailSkeleton />;
  }
  
  const lastEvolutionWeight = patient.evolutions?.slice().reverse().find(e => e.bioimpedance?.weight)?.bioimpedance?.weight;
  const currentWeight = lastEvolutionWeight ?? patient.initialWeight;

  const lastEvolutionBmi = patient.evolutions?.slice().reverse().find(e => e.bioimpedance?.bmi)?.bioimpedance?.bmi;
  const currentBmi = lastEvolutionBmi ?? calculateBmi(currentWeight, patient.height / 100);

  const weightToLose = patient.desiredWeight ? currentWeight - patient.desiredWeight : 0;
  const patientNameInitial = patient.fullName.charAt(0).toUpperCase();

  const totalPaid = patient.doses
    .filter(d => d.payment?.status === 'pago' && d.payment?.amount)
    .reduce((acc, d) => acc + (d.payment?.amount || 0), 0);

  const HealthInfoItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string | null | undefined }) => {
    if (!value) return null;
    return (
      <div className="flex items-start gap-3">
        <Icon className="w-4 h-4 text-muted-foreground mt-1" />
        <div>
            <p className="font-semibold text-sm">{label}</p>
            <p className="text-sm text-muted-foreground">{value}</p>
        </div>
      </div>
    );
  };
  
  const chartMetrics: { key: keyof Bioimpedance, label: string, icon: React.ElementType, unit?: string }[] = [
      { key: 'weight', label: 'Peso', icon: Weight, unit: 'kg' },
      { key: 'bmi', label: 'IMC', icon: Activity },
      { key: 'fatPercentage', label: 'Gordura', icon: Activity, unit: '%' },
      { key: 'skeletalMusclePercentage', label: 'Massa Muscular', icon: UserCheck, unit: '%' },
      { key: 'visceralFat', label: 'Gordura Visceral', icon: HeartPulse },
      { key: 'hydration', label: 'Água', icon: Droplets, unit: '%' },
      { key: 'metabolism', label: 'Metabolismo', icon: Flame, unit: 'kcal' },
      { key: 'boneMass', label: 'Massa Óssea', icon: Bone, unit: 'kg' },
      { key: 'protein', label: 'Proteína', icon: Beef, unit: '%' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <Button variant="ghost" asChild className="-ml-4">
            <Link href="/patients">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar para Pacientes
            </Link>
        </Button>
        <Button asChild>
            <Link href={`/patients/${patientId}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar Perfil
            </Link>
        </Button>
      </div>

      <div className="flex flex-col md:flex-row items-start gap-6">
        <Card className="w-full md:w-1/3">
          <CardHeader className="items-center text-center">
            <Avatar className="w-24 h-24 mb-4">
              <AvatarImage src={patient.avatarUrl} alt={patient.fullName} />
              <AvatarFallback className="text-3xl">{patientNameInitial}</AvatarFallback>
            </Avatar>
            <CardTitle>{patient.fullName}</CardTitle>
            {patient.age && <CardDescription>{patient.age} anos</CardDescription>}
            {patient.indication?.name && (
                <CardDescription>
                    {patient.indication.type === 'indicado' ? 'Indicado(a) por ' : 'Indicou '} 
                    {patient.indication.patientId ? (
                        <Link href={`/patients/${patient.indication.patientId}`} className="text-primary hover:underline">{patient.indication.name}</Link>
                    ) : (
                        patient.indication.name
                    )}
                </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {patient.phone && <div className="flex items-center gap-3"><Phone className="w-4 h-4 text-muted-foreground" /> <span>{patient.phone}</span></div>}
            {patient.address?.street && <div className="flex items-start gap-3"><MapPin className="w-4 h-4 text-muted-foreground mt-1" /> <span>{`${patient.address.street}, ${patient.address.number} - ${patient.address.city}, ${patient.address.state}`}</span></div>}
            {patient.firstDoseDate && <div className="flex items-center gap-3"><CalendarIcon className="w-4 h-4 text-muted-foreground" /> <span>Início: {formatDate(patient.firstDoseDate)}</span></div>}
          </CardContent>
        </Card>
        <div className="w-full md:w-2/3 grid grid-cols-2 lg:grid-cols-3 gap-4">
            <InfoCard icon={Weight} label="Peso Atual" value={`${currentWeight.toFixed(1)} kg`} />
            <InfoCard icon={Activity} label="IMC Atual" value={currentBmi ? currentBmi.toFixed(2) : '-'} />
            <InfoCard icon={Ruler} label="Altura" value={`${patient.height} cm`} />
            {patient.desiredWeight && <InfoCard icon={Target} label="Meta de Peso" value={`${patient.desiredWeight} kg`} /> }
            {patient.desiredWeight && <InfoCard icon={TrendingDown} label="Faltam Perder" value={`${weightToLose > 0 ? weightToLose.toFixed(1) : 0} kg`} /> }
            <InfoCard icon={DollarSign} label="Total Pago" value={formatCurrency(totalPaid)} />
        </div>
      </div>
      
       <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Evolução da Bioimpedância</CardTitle>
              <CardDescription>Visualize o progresso de cada métrica ao longo do tempo.</CardDescription>
            </div>
            <Button asChild variant="outline">
              <Link href={`/bioimpedance?patientId=${patient.id}`}>
                <Pencil className="mr-2 h-4 w-4" />
                Lançar Nova Medida
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {evolutionChartData.length > 1 ? (
             <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {chartMetrics.map(metric => {
                const data = evolutionChartData
                  .map(e => ({
                    date: formatDate(e.date),
                    value: e[metric.key as keyof typeof e] as number
                  }))
                  .filter(item => item.value !== undefined && item.value !== null);

                if (data.length < 2) return null;

                const firstValue = data[0].value;
                const lastValue = data[data.length - 1].value;
                const change = lastValue - firstValue;

                return (
                  <EvolutionChartCard
                    key={metric.key}
                    title={metric.label}
                    icon={metric.icon}
                    data={data}
                    change={change}
                    unit={metric.unit}
                  />
                );
              })}
             </div>
          ) : (
            <p className="text-sm text-center text-muted-foreground py-8">
              É necessário pelo menos dois registros de bioimpedância para gerar os gráficos. Adicione um na página de <Link href={`/bioimpedance?patientId=${patient.id}`} className="text-primary hover:underline font-semibold">Bioimpedância</Link>.
            </p>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><HeartPulse className="h-5 w-5" />Histórico de Evolução</CardTitle>
          <CardDescription>Todos os registros de bioimpedância do paciente.</CardDescription>
        </CardHeader>
        <CardContent>
           <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Peso (kg)</TableHead>
                    <TableHead>IMC</TableHead>
                    <TableHead>Gordura (%)</TableHead>
                    <TableHead>Músculo (%)</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {evolutionHistoryData.length > 0 ? (
                    evolutionHistoryData.map((evo) => (
                        <TableRow key={evo.id} className={cn(evo.isInitial && "bg-muted/50")}>
                            <TableCell>{formatDate(evo.date)} {evo.isInitial && <Badge variant="outline" className="ml-2">Inicial</Badge>}</TableCell>
                            <TableCell>{evo.weight?.toFixed(2) ?? '-'}</TableCell>
                            <TableCell>{evo.bmi?.toFixed(2) ?? '-'}</TableCell>
                            <TableCell>{(evo as any).fatPercentage?.toFixed(2) ?? '-'}</TableCell>
                            <TableCell>{(evo as any).skeletalMusclePercentage?.toFixed(2) ?? '-'}</TableCell>
                            <TableCell className="text-right">
                                {!evo.isInitial && (
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteEvolutionClick(evo as Evolution)}>
                                        <Trash2 className="h-4 w-4" />
                                        <span className="sr-only">Excluir registro</span>
                                    </Button>
                                )}
                            </TableCell>
                        </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={6} className="text-center h-24">Nenhum registro de bioimpedância encontrado.</TableCell>
                    </TableRow>
                )}
            </TableBody>
           </Table>
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5"/>Ficha de Avaliação de Saúde</CardTitle>
              <CardDescription>Observações, contraindicações e histórico do paciente.</CardDescription>
            </div>
            {patient.healthContraindications && (
            <Dialog>
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm" onClick={handleSummarize}>
                        <Bot className="w-4 h-4 mr-2"/>
                        Resumir com IA
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Resumo da IA</DialogTitle>
                        <DialogDescription>
                            Análise das contraindicações e riscos potenciais.
                        </DialogDescription>
                    </DialogHeader>
                    {summaryLoading ? <Skeleton className="h-24 w-full" /> : <p className="text-sm text-muted-foreground">{summary}</p>}
                </DialogContent>
            </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
            <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-4">
                    <h4 className="font-semibold">Histórico e Uso</h4>
                    <HealthInfoItem icon={Pill} label="Medicamentos de uso diário" value={patient.dailyMedications || "Nenhum informado"} />
                    <HealthInfoItem icon={CircleSlash} label="Uso de anticoncepcional oral" value={patient.oralContraceptive === 'yes' ? 'Sim' : (patient.oralContraceptive === 'no' ? 'Não' : 'Não informado')} />
                     <HealthInfoItem 
                        icon={Stethoscope} 
                        label="Uso anterior de Monjauro" 
                        value={
                            patient.usedMonjauro === 'yes' 
                            ? `Sim (Dose: ${patient.monjauroDose}, Tempo: ${patient.monjauroTime})`
                            : (patient.usedMonjauro === 'no' ? 'Não' : 'Não informado')
                        } 
                    />
                    {patient.consentGiven && patient.consentDate && (
                         <HealthInfoItem 
                            icon={CheckSquare}
                            label="Termo de Consentimento"
                            value={`Assinado em ${formatDate(patient.consentDate)}`}
                        />
                    )}
                </div>
                <div className="space-y-4">
                    <h4 className="font-semibold">Condições e Contraindicações</h4>
                    <div className="text-sm text-muted-foreground space-y-2">
                        {patient.healthContraindications && patient.healthContraindications.split(', ').map((item, index) => {
                            if (!item.trim()) return null;
                            return (
                            <p key={index} className={`flex items-start gap-2 ${item.startsWith('[CONTRAINDICADO]') ? 'text-destructive font-medium' : ''}`}>
                                <span className='mt-1'>
                                {item.startsWith('[CONTRAINDICADO]') ? '🚫' : 'ⓘ'}
                                </span>
                                <span>{item.replace('[CONTRAINDICADO]', '')}</span>
                            </p>
                            )
                        })}
                    </div>
                </div>
            </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Agenda de Doses</CardTitle>
          <CardDescription>Acompanhe o progresso do tratamento.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dose</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status Aplicação</TableHead>
                <TableHead>Status Pag.</TableHead>
                <TableHead>Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {patient.doses.map((dose) => {
                const status = getDoseStatus(dose, patient.doses);
                const paymentStatus = getPaymentStatusVariant(dose.payment?.status ?? 'pendente');
                return (
                  <TableRow key={dose.id}>
                    <TableCell className="font-semibold">{dose.doseNumber}</TableCell>
                    <TableCell>
                      {dose.status === 'pending' ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" className={cn("p-1 h-auto justify-start font-normal -ml-2", !dose.date && "text-muted-foreground")}>
                              {formatDate(dose.date)}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={new Date(dose.date)}
                              onSelect={(newDate) => {
                                if (newDate) {
                                  handleRescheduleDose(dose.id, newDate);
                                }
                              }}
                              initialFocus
                              locale={ptBR}
                            />
                          </PopoverContent>
                        </Popover>
                      ) : (
                        formatDate(dose.date)
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.color.startsWith('bg-') ? 'default' : 'outline'} className={`${status.color} ${status.textColor} border-none`}>{status.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={paymentStatus.label === 'Pago' ? 'default' : 'outline'} className={`${paymentStatus.color} ${paymentStatus.textColor} border-none`}>{paymentStatus.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {dose.status === 'pending' && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-green-500 hover:text-green-600" onClick={() => handleNotifyClick(patient, dose)}>
                            <FaWhatsapp className="h-5 w-5" />
                            <span className="sr-only">Notificar via WhatsApp</span>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
       <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. Isso excluirá permanentemente o registro de bioimpedância da data <span className="font-semibold">{evolutionToDelete ? formatDate(evolutionToDelete.date) : ''}</span>.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmDeleteEvolution} className="bg-destructive hover:bg-destructive/90">
                      <Trash2 className="mr-2 h-4 w-4"/>
                      Sim, excluir registro
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string | number | null }) {
    if (value === null || value === undefined) return null;
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
            </CardContent>
        </Card>
    )
}

function EvolutionChartCard({ title, icon: Icon, data, change, unit='' }: { title: string, icon: React.ElementType, data: {date: string, value: number}[], change: number, unit?: string}) {
    const TrendIcon = change === 0 ? Minus : change > 0 ? ArrowUp : ArrowDown;
    const trendColor = change === 0 ? "text-muted-foreground" : change > 0 ? "text-green-500" : "text-red-500";
    
    return (
        <Card className="flex flex-col">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        {title}
                    </CardTitle>
                    <div className={`flex items-center font-bold text-sm ${trendColor}`}>
                        <span>{change.toFixed(1)}{unit}</span>
                        <TrendIcon className="h-4 w-4" />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-1 -mb-4">
                <ResponsiveContainer width="100%" height={100}>
                    <LineChart data={data}>
                        <Tooltip
                            content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                return (
                                    <div className="bg-background/80 backdrop-blur-sm p-2 border rounded-md shadow-lg">
                                    <p className="label text-sm">{`${label}`}</p>
                                    <p className="intro font-bold text-primary">{`${payload[0].value?.toFixed(1)} ${unit}`}</p>
                                    </div>
                                );
                                }
                                return null;
                            }}
                        />
                        <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                        <XAxis dataKey="date" hide/>
                        <YAxis domain={['dataMin - 1', 'dataMax + 1']} hide/>
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}

function PatientDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <Skeleton className="h-10 w-44" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="flex flex-col md:flex-row items-start gap-6">
        <Card className="w-full md:w-1/3">
          <CardHeader className="items-center text-center">
            <Skeleton className="w-24 h-24 rounded-full mb-4" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
        <div className="w-full md:w-2/3 grid grid-cols-2 lg:grid-cols-3 gap-4">
            <Card><CardContent className="pt-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
            <Card><CardContent className="pt-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
            <Card><CardContent className="pt-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
            <Card><CardContent className="pt-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
            <Card><CardContent className="pt-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
            <Card><CardContent className="pt-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
        </div>
      </div>
      <Card><CardHeader><Skeleton className="h-8 w-1/3" /></CardHeader><CardContent><Skeleton className="h-40 w-full" /></CardContent></Card>
      <Card><CardHeader><Skeleton className="h-8 w-1/3" /></CardHeader><CardContent><Skeleton className="h-20 w-full" /></CardContent></Card>
      <Card><CardHeader><Skeleton className="h-8 w-1/3" /></CardHeader><CardContent><Skeleton className="h-64 w-full" /></CardContent></Card>
    </div>
  );
}

const isSameDay = (date1: Date, date2: Date) =>
  date1.getFullYear() === date2.getFullYear() &&
  date1.getMonth() === date2.getMonth() &&
  date1.getDate() === date2.getDate();

    







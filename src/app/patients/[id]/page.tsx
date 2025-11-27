

'use client';

import { useState, useEffect, useMemo } from 'react';
import { notFound, useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  getPatientById,
  updateDose,
  deleteBioimpedanceEntry,
  getSettings,
  updateDosePayment,
  endTreatment,
  type Patient,
  type Dose,
  type Evolution,
  type Bioimpedance,
  type TreatmentStatus,
} from '@/lib/actions';
import {
  calculateBmi,
  formatDate,
  getDoseStatus,
  generateWhatsAppLink,
  formatCurrency,
  getPaymentStatusVariant,
  generateNutritionalAssessmentLink
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
    Network,
    AlertTriangle,
    Apple,
    UserX,
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format as formatDateFns, differenceInDays, startOfToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

function DosePaymentEditor({ dose, patientId, onUpdate }: { dose: Dose; patientId: string; onUpdate: (updatedPatient: Patient) => void; }) {
    const [status, setStatus] = useState(dose.payment.status);
    const [date, setDate] = useState<Date | undefined>(dose.payment.date ? new Date(dose.payment.date) : (dose.payment.status === 'pago' ? new Date(dose.date) : undefined));
    const [method, setMethod] = useState(dose.payment.method);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const updatedPatient = await updateDosePayment(patientId, dose.id, {
                status,
                date: status === 'pago' ? date : undefined,
                method: status === 'pago' ? method : undefined,
            });
            if (updatedPatient) {
                onUpdate(updatedPatient);
                toast({ title: "Pagamento atualizado!" });
            }
        } catch (e) {
            toast({ variant: 'destructive', title: 'Erro ao salvar pagamento' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                 <Button variant="ghost" className="p-0 h-auto font-normal" disabled={isSaving}>
                    <DosePaymentBadge dose={dose} />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
                <div className="grid gap-4">
                    <div className="space-y-2">
                        <h4 className="font-medium leading-none">Editar Pagamento</h4>
                        <p className="text-sm text-muted-foreground">
                           Altere o status do pagamento para a Dose {dose.doseNumber}.
                        </p>
                    </div>
                    <div className="grid gap-2">
                        <div className="grid grid-cols-3 items-center gap-4">
                            <Label htmlFor="status">Status</Label>
                             <Select value={status} onValueChange={(v) => setStatus(v as 'pago' | 'pendente')}>
                                <SelectTrigger className="col-span-2 h-8">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pago">Pago</SelectItem>
                                    <SelectItem value="pendente">Pendente</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {status === 'pago' && (
                             <>
                                <div className="grid grid-cols-3 items-center gap-4">
                                <Label htmlFor="payment-date">Data</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="col-span-2 h-8 justify-start text-left font-normal">
                                            {date ? formatDateFns(date, 'dd/MM/yy') : 'Selecione'}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                     <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={date} onSelect={setDate} initialFocus captionLayout="dropdown-buttons" fromYear={2020} toYear={new Date().getFullYear() + 5} /></PopoverContent>
                                </Popover>
                                </div>
                                <div className="grid grid-cols-3 items-center gap-4">
                                <Label htmlFor="payment-method">Forma</Label>
                                <Select value={method} onValueChange={(v) => setMethod(v as any)}>
                                    <SelectTrigger className="col-span-2 h-8"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pix">PIX</SelectItem>
                                        <SelectItem value="dinheiro">Dinheiro</SelectItem>
                                        <SelectItem value="debito">Débito</SelectItem>
                                        <SelectItem value="credito">Crédito</SelectItem>
                                        <SelectItem value="credito_parcelado">Créd. Parcelado</SelectItem>
                                        <SelectItem value="payment_link">Link de Pagamento</SelectItem>
                                    </SelectContent>
                                </Select>
                                </div>
                            </>
                        )}
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Salvar
                        </Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}

const DosePaymentBadge = ({ dose }: { dose: Dose }) => {
    const paymentStatusInfo = getPaymentStatusVariant(dose.payment?.status ?? 'pendente');
    const { settings } = useSettings();
    
    const isOverdue = dose.payment.status === 'pendente' && dose.payment.dueDate && new Date(dose.payment.dueDate) < startOfToday();
    const overdueDays = isOverdue ? differenceInDays(startOfToday(), new Date(dose.payment.dueDate!)) : 0;
    const lateFee = isOverdue ? overdueDays * (settings.dailyLateFee || 0) : 0;
    const totalAmountDue = (dose.payment.amount || 0) + lateFee;

    if (isOverdue) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger>
                        <Badge variant="destructive" className="cursor-help">
                            <AlertTriangle className="h-3 w-3 mr-1" /> Vencido
                        </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                        <div className="p-1 text-sm space-y-1">
                            <p><strong>Vencimento:</strong> {formatDate(dose.payment.dueDate)} ({overdueDays} dias de atraso)</p>
                            <p><strong>Valor Original:</strong> {formatCurrency(dose.payment.amount || 0)}</p>
                            <p><strong>Multa por Atraso:</strong> {formatCurrency(lateFee)}</p>
                            <p className="font-bold"><strong>Total a Cobrar:</strong> {formatCurrency(totalAmountDue)}</p>
                        </div>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        )
    }

    return (
        <Badge variant={'default'} className={`${paymentStatusInfo.color} ${paymentStatusInfo.textColor} border-none`}>
            {paymentStatusInfo.label}
        </Badge>
    )
}

const useSettings = () => {
    const [settings, setSettings] = useState<{ dailyLateFee?: number }>({});
    useEffect(() => {
        getSettings().then(setSettings);
    }, []);
    return { settings };
}

function EndTreatmentDialog({ patient, onTreatmentEnded }: { patient: Patient, onTreatmentEnded: () => void }) {
    const [status, setStatus] = useState<TreatmentStatus>('completed');
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [open, setOpen] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async () => {
        if (!reason) {
            toast({ variant: 'destructive', title: 'Motivo obrigatório', description: 'Por favor, descreva o motivo da finalização.' });
            return;
        }
        setIsSubmitting(true);
        try {
            await endTreatment(patient.id, status, reason);
            toast({ title: 'Tratamento Finalizado!', description: `${patient.fullName} foi movido para a lista de tratamentos finalizados.` });
            onTreatmentEnded();
            setOpen(false);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível finalizar o tratamento.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <UserX className="mr-2 h-4 w-4" />
                    Finalizar Tratamento
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Finalizar tratamento de {patient.fullName}</DialogTitle>
                    <DialogDescription>
                        Selecione o motivo e adicione uma nota de evolução. O paciente será movido para a lista de "Tratamentos Finalizados".
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Motivo da Finalização</Label>
                        <Select value={status} onValueChange={(v) => setStatus(v as TreatmentStatus)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="completed">Tratamento Concluído</SelectItem>
                                <SelectItem value="abandoned">Abandono de Tratamento</SelectItem>
                                <SelectItem value="non-payment">Inadimplência</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="termination-reason">Nota de Evolução / Detalhes</Label>
                        <Textarea
                            id="termination-reason"
                            placeholder="Ex: Paciente atingiu a meta de peso e recebeu alta."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting || !reason}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirmar Finalização
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function PatientDetailPage() {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [settings, setSettings] = useState<{ dailyLateFee?: number }>({});
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [evolutionToDelete, setEvolutionToDelete] = useState<Evolution | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const router = useRouter();
  const { toast } = useToast();
  const params = useParams();
  const patientId = params.id as string;

  const fetchPatientData = async () => {
    const [fetchedPatient, fetchedSettings] = await Promise.all([
      getPatientById(patientId),
      getSettings()
    ]);
    if (!fetchedPatient) {
      notFound();
    }
    setPatient(fetchedPatient);
    setSettings(fetchedSettings);
    setLoading(false);
  };

  useEffect(() => {
    if (!patientId) return;
    fetchPatientData();
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
  
  const handleSendAssessment = () => {
    if(!patient) return;
    const link = generateNutritionalAssessmentLink(patient.id);
    const message = `Olá, ${patient.fullName.split(' ')[0]}! Para personalizar ainda mais seu acompanhamento, por favor, preencha nossa avaliação nutricional. Leva apenas alguns minutos! Clique no link: ${link}`;
    const whatsappUrl = `https://wa.me/55${patient.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
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
        <div className='flex gap-2'>
            <Button variant="outline" onClick={handleSendAssessment}>
                <Apple className="mr-2 h-4 w-4" />
                Avaliação Nutricional
            </Button>
            <EndTreatmentDialog patient={patient} onTreatmentEnded={() => router.push('/finished-treatments')} />
            <Button asChild>
                <Link href={`/patients/${patientId}/edit`}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar Perfil
                </Link>
            </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-start gap-6">
        <Card className="w-full md:w-1/3">
          <CardHeader className="items-center text-center">
            <Avatar className="w-24 h-24 mb-4">
              <AvatarImage src={patient.avatarUrl} alt={patient.fullName} />
              <AvatarFallback className="text-3xl">{patientNameInitial}</AvatarFallback>
            </Avatar>
            <CardTitle>{patient.fullName}</CardTitle>
            <div className='flex items-center gap-4 text-muted-foreground'>
                {patient.age && <CardDescription>{patient.age} anos</CardDescription>}
                {patient.serviceModel && <CardDescription className='flex items-center gap-1 capitalize'><Network className='h-3 w-3'/> {patient.serviceModel}</CardDescription>}
            </div>
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
          <CardTitle className="flex items-center gap-2"><HeartPulse className="h-5 w-5"/>Histórico de Evolução</CardTitle>
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
          <CardDescription>Acompanhe o cronograma de aplicações.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dose</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status Aplicação</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {patient.doses.map((dose) => {
                const status = getDoseStatus(dose, patient.doses);
                
                return (
                  <TableRow key={`${dose.id}-${dose.doseNumber}`}>
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
                              captionLayout="dropdown-buttons" 
                              fromYear={2020} 
                              toYear={new Date().getFullYear() + 5}
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
                      <DosePaymentEditor dose={dose} patientId={patient.id} onUpdate={setPatient} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
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
                        <RechartsTooltip
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

    







    






'use client';

import { useState, useEffect, useMemo } from 'react';
import { notFound, useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  getPatientById,
  updateDose,
  addPatientEvolution,
  type Patient,
  type Dose,
  type Evolution,
  type Bioimpedance
} from '@/lib/actions';
import {
  calculateBmi,
  formatDate,
  getDoseStatus,
  generateWhatsAppLink,
  formatCurrency,
  getPaymentStatusVariant
} from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
    BookPlus,
    Camera,
    Upload,
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
    Beef
} from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { Skeleton } from "@/components/ui/skeleton";
import { summarizeHealthData } from '@/ai/flows/summarize-health-data';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format as formatDateFns } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const doseManagementSchema = z.object({
  date: z.date({ required_error: "A data é obrigatória." }),
  time: z.string().optional(),
  status: z.enum(['administered', 'pending']),
  weight: z.coerce.number().optional(),
  administeredDose: z.coerce.number().optional(),
  paymentMethod: z.enum(['cash', 'pix', 'debit', 'credit', 'payment_link']).optional(),
  installments: z.coerce.number().optional(),
}).refine(data => {
    if (data.status === 'administered') {
        return !!data.weight && !!data.administeredDose;
    }
    return true;
}, {
    message: "Peso e dose aplicada são obrigatórios para doses administradas.",
    path: ["status"],
});

type DoseManagementFormValues = z.infer<typeof doseManagementSchema>;


export default function PatientDetailPage() {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [selectedDose, setSelectedDose] = useState<Dose | null>(null);
  const [isDoseModalOpen, setIsDoseModalOpen] = useState(false);
  
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

  const handleManageDoseClick = (dose: Dose) => {
    setSelectedDose(dose);
    setIsDoseModalOpen(true);
  }

  const handleNotifyClick = (patient: Patient, dose: Dose) => {
    const whatsappUrl = generateWhatsAppLink(patient, dose);
    window.open(whatsappUrl, '_blank');
  };
  
  const onDoseUpdate = (updatedPatient: Patient) => {
    setPatient(updatedPatient);
  }

  const onEvolutionAdded = (updatedPatient: Patient) => {
    setPatient(updatedPatient);
  }

  const weightChartData = useMemo(() => {
    if (!patient) return [];
    
    const data = patient.evolutions
      .filter(e => e.date && e.bioimpedance?.fatPercentage) // Changed to check for a bioimpedance value
      .map(e => ({
        date: formatDate(e.date),
        peso: e.bioimpedance?.fatPercentage, // Example, should be weight from somewhere
      }));

    if (patient.initialWeight && patient.firstDoseDate) {
        const initialData = { date: formatDate(patient.firstDoseDate), peso: patient.initialWeight };
        if (data.length > 0) {
            // This assumes evolutions are sorted by date, which they should be.
            const firstEvoDate = new Date(patient.evolutions[0].date);
            if (new Date(patient.firstDoseDate) < firstEvoDate) {
                 return [initialData, ...data]
            }
        }
        return [initialData];
    }
      
    return data;
  }, [patient]);

  if (loading || !patient) {
    return <PatientDetailSkeleton />;
  }
  
  const currentWeight = patient.doses.findLast(d => d.status === 'administered' && d.weight)?.weight ?? patient.initialWeight;
  const currentBmi = calculateBmi(currentWeight, patient.height / 100);
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
            <InfoCard icon={Activity} label="IMC Atual" value={currentBmi} />
            <InfoCard icon={Ruler} label="Altura" value={`${patient.height} cm`} />
            {patient.desiredWeight && <InfoCard icon={Target} label="Meta de Peso" value={`${patient.desiredWeight} kg`} /> }
            {patient.desiredWeight && <InfoCard icon={TrendingDown} label="Faltam Perder" value={`${weightToLose > 0 ? weightToLose.toFixed(1) : 0} kg`} /> }
            <InfoCard icon={DollarSign} label="Total Pago" value={formatCurrency(totalPaid)} />
        </div>
      </div>
      
       {weightChartData.length > 0 && (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Evolução de Peso</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={weightChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" stroke="#888888" fontSize={12} />
                        <YAxis stroke="#888888" fontSize={12} domain={['dataMin - 2', 'dataMax + 2']} tickFormatter={(value) => `${value}kg`} />
                        <Tooltip content={<CustomTooltip />} />
                        <Line type="monotone" dataKey="peso" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
      )}

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
      
      <EvolutionSection patient={patient} onEvolutionAdded={onEvolutionAdded} />

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
                const status = getDoseStatus(dose);
                const paymentStatus = getPaymentStatusVariant(dose.payment?.status ?? 'pendente');
                return (
                  <TableRow key={dose.id}>
                    <TableCell className="font-semibold">{dose.doseNumber}</TableCell>
                    <TableCell>{formatDate(dose.date)}</TableCell>
                    <TableCell>
                      <Badge variant={status.color.startsWith('bg-') ? 'default' : 'outline'} className={`${status.color} ${status.textColor} border-none`}>{status.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={paymentStatus.label === 'Pago' ? 'default' : 'outline'} className={`${paymentStatus.color} ${paymentStatus.textColor} border-none`}>{paymentStatus.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleManageDoseClick(dose)}>
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">Gerenciar Dose</span>
                        </Button>
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
      
      {selectedDose && (
        <DoseManagementDialog 
            isOpen={isDoseModalOpen}
            setIsOpen={setIsDoseModalOpen}
            dose={selectedDose}
            patientId={patient.id}
            onDoseUpdate={onDoseUpdate}
        />
      )}
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

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background/80 backdrop-blur-sm p-2 border rounded-md shadow-lg">
        <p className="label font-bold">{`Data: ${label}`}</p>
        <p className="intro text-primary">{`Peso: ${payload[0].value} kg`}</p>
      </div>
    );
  }

  return null;
};

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

interface DoseManagementDialogProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    dose: Dose;
    patientId: string;
    onDoseUpdate: (patient: Patient) => void;
}

function DoseManagementDialog({ isOpen, setIsOpen, dose, patientId, onDoseUpdate }: DoseManagementDialogProps) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<DoseManagementFormValues>({
        resolver: zodResolver(doseManagementSchema),
        defaultValues: {
            date: new Date(dose.date),
            time: dose.time || '',
            status: dose.status,
            weight: dose.weight || undefined,
            administeredDose: dose.administeredDose || undefined,
            paymentMethod: dose.payment?.method || undefined,
            installments: dose.payment?.installments || undefined,
        },
    });

    useEffect(() => {
        form.reset({
            date: new Date(dose.date),
            time: dose.time || '',
            status: dose.status,
            weight: dose.weight || undefined,
            administeredDose: dose.administeredDose || undefined,
            paymentMethod: dose.payment?.method || undefined,
            installments: dose.payment?.installments || undefined,
        });
    }, [dose, form]);

    const watchStatus = form.watch("status");
    const watchPaymentMethod = form.watch("paymentMethod");

    async function onSubmit(data: DoseManagementFormValues) {
        setIsSubmitting(true);
        try {
            const updatedPatient = await updateDose(patientId, dose.id, {
                date: data.date,
                time: data.time,
                status: data.status,
                weight: data.weight,
                administeredDose: data.administeredDose,
                payment: {
                    ...dose.payment,
                    method: data.paymentMethod,
                    installments: data.installments,
                    amount: dose.payment?.amount || 0
                },
            });

            if (updatedPatient) {
                toast({
                    title: "Dose Atualizada!",
                    description: `A dose ${dose.doseNumber} foi atualizada com sucesso.`,
                });
                onDoseUpdate(updatedPatient);
                setIsOpen(false);
            } else {
                throw new Error("Patient not found after update");
            }
        } catch (error) {
            console.error("Failed to update dose", error);
            toast({
                variant: "destructive",
                title: "Erro ao salvar",
                description: "Não foi possível atualizar a dose. Tente novamente.",
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Gerenciar Dose N° {dose.doseNumber}</DialogTitle>
                    <DialogDescription>
                        Atualize ou reagende a dose.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="date"
                                render={({ field }) => (
                                <FormItem className="flex flex-col"><FormLabel>Data da Dose</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                            <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                {field.value ? formatDateFns(field.value, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar locale={ptBR} mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                                        </PopoverContent>
                                    </Popover>
                                <FormMessage />
                                </FormItem>
                            )}/>
                             <FormField control={form.control} name="time" render={({ field }) => (
                                <FormItem><FormLabel>Horário</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                        </div>
                        
                        <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                                <FormItem className="space-y-3">
                                    <FormLabel>Status da Dose</FormLabel>
                                    <FormControl>
                                        <RadioGroup
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                            className="flex items-center gap-6"
                                        >
                                            <FormItem className="flex items-center space-x-3 space-y-0">
                                                <FormControl><RadioGroupItem value="pending" /></FormControl>
                                                <FormLabel className="font-normal">Pendente</FormLabel>
                                            </FormItem>
                                            <FormItem className="flex items-center space-x-3 space-y-0">
                                                <FormControl><RadioGroupItem value="administered" /></FormControl>
                                                <FormLabel className="font-normal">Administrada</FormLabel>
                                            </FormItem>
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {watchStatus === 'administered' && (
                           <>
                                <div className="grid grid-cols-2 gap-4">
                                     <FormField control={form.control} name="weight" render={({ field }) => (
                                        <FormItem><FormLabel>Peso (kg)</FormLabel><FormControl><Input type="number" step="0.1" placeholder="Ex: 84.5" {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                     <FormField control={form.control} name="administeredDose" render={({ field }) => (
                                        <FormItem><FormLabel>Dose Aplicada (mg)</FormLabel><FormControl><Input type="number" step="0.1" placeholder="Ex: 2.5" {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                </div>
                                <FormField
                                    control={form.control}
                                    name="paymentMethod"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Forma de Pagamento</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecione o pagamento" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="cash">Dinheiro</SelectItem>
                                                    <SelectItem value="pix">PIX</SelectItem>
                                                    <SelectItem value="debit">Débito</SelectItem>
                                                    <SelectItem value="credit">Crédito</SelectItem>
                                                    <SelectItem value="payment_link">Link de Pagamento</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                {watchPaymentMethod === 'credit' && (
                                     <FormField control={form.control} name="installments" render={({ field }) => (
                                        <FormItem><FormLabel>Parcelas</FormLabel><FormControl><Input type="number" placeholder="Ex: 2" {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                )}
                           </>
                        )}
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="outline" disabled={isSubmitting}>Cancelar</Button>
                            </DialogClose>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : 'Salvar'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

const evolutionFormSchema = z.object({
    notes: z.string().min(1, "As anotações são obrigatórias."),
    photoUrl: z.string().optional(),
    bioimpedance: z.object({
        fatPercentage: z.coerce.number().optional(),
        muscleMass: z.coerce.number().optional(),
        visceralFat: z.coerce.number().optional(),
        metabolicAge: z.coerce.number().optional(),
        hydration: z.coerce.number().optional(),
        boneMass: z.coerce.number().optional(),
        metabolism: z.coerce.number().optional(),
        protein: z.coerce.number().optional(),
    }).optional(),
});

type EvolutionFormValues = z.infer<typeof evolutionFormSchema>;

interface EvolutionSectionProps {
    patient: Patient;
    onEvolutionAdded: (patient: Patient) => void;
}

function EvolutionSection({ patient, onEvolutionAdded }: EvolutionSectionProps) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const form = useForm<EvolutionFormValues>({
        resolver: zodResolver(evolutionFormSchema),
        defaultValues: {
            notes: "",
            photoUrl: "",
            bioimpedance: {
                fatPercentage: undefined,
                muscleMass: undefined,
                visceralFat: undefined,
                metabolicAge: undefined,
                hydration: undefined,
                boneMass: undefined,
                metabolism: undefined,
                protein: undefined,
            }
        },
    });

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const dataUrl = reader.result as string;
                setImagePreview(dataUrl);
                form.setValue("photoUrl", dataUrl);
            };
            reader.readAsDataURL(file);
        }
    };

    async function onSubmit(data: EvolutionFormValues) {
        setIsSubmitting(true);
        try {
            const updatedPatient = await addPatientEvolution(patient.id, data);
            toast({
                title: "Evolução Adicionada!",
                description: "O registro de evolução foi salvo com sucesso.",
            });
            onEvolutionAdded(updatedPatient);
            form.reset();
            setImagePreview(null);
        } catch (error) {
            console.error("Failed to add evolution", error);
            toast({
                variant: "destructive",
                title: "Erro ao salvar",
                description: "Não foi possível salvar a evolução.",
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><HeartPulse className="h-5 w-5"/> Evolução de Desempenho</CardTitle>
                <CardDescription>Adicione e visualize a evolução do paciente, incluindo bioimpedância.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mb-6">
                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Anotações da Evolução</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Descreva a evolução do paciente, observações, etc." rows={3} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        
                        <div>
                            <h4 className="text-sm font-medium mb-2">Dados de Bioimpedância (Opcional)</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <FormField control={form.control} name="bioimpedance.fatPercentage" render={({ field }) => (
                                    <FormItem><FormLabel>% Gordura</FormLabel><FormControl><Input type="number" step="0.1" placeholder="Ex: 25.5" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="bioimpedance.muscleMass" render={({ field }) => (
                                    <FormItem><FormLabel>Massa Musc. (%)</FormLabel><FormControl><Input type="number" step="0.1" placeholder="Ex: 35.5" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="bioimpedance.visceralFat" render={({ field }) => (
                                    <FormItem><FormLabel>Gordura Visceral</FormLabel><FormControl><Input type="number" placeholder="Ex: 8" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="bioimpedance.hydration" render={({ field }) => (
                                    <FormItem><FormLabel>Água (%)</FormLabel><FormControl><Input type="number" step="0.1" placeholder="Ex: 55.3" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                 <FormField control={form.control} name="bioimpedance.metabolism" render={({ field }) => (
                                    <FormItem><FormLabel>Metabolismo</FormLabel><FormControl><Input type="number" placeholder="Ex: 1753" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                 <FormField control={form.control} name="bioimpedance.boneMass" render={({ field }) => (
                                    <FormItem><FormLabel>Massa Óssea</FormLabel><FormControl><Input type="number" step="0.1" placeholder="Ex: 2.7" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="bioimpedance.protein" render={({ field }) => (
                                    <FormItem><FormLabel>Proteína (%)</FormLabel><FormControl><Input type="number" step="0.1" placeholder="Ex: 13.2" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="bioimpedance.metabolicAge" render={({ field }) => (
                                    <FormItem><FormLabel>Idade Metab.</FormLabel><FormControl><Input type="number" placeholder="Ex: 35" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                            </div>
                        </div>


                        <FormField
                            control={form.control}
                            name="photoUrl"
                            render={({ field }) => (
                                <FormItem>
                                     <FormLabel>Foto da Evolução (Opcional)</FormLabel>
                                     <div className="flex items-center gap-4">
                                        {imagePreview && (
                                            <div className="relative w-24 h-24 rounded-md border">
                                                <Image src={imagePreview} alt="Preview" layout="fill" className="object-cover rounded-md" />
                                            </div>
                                        )}
                                        <FormControl>
                                            <div>
                                                <input
                                                    id="evolution-photo"
                                                    type="file"
                                                    className="hidden"
                                                    accept="image/*"
                                                    onChange={handleImageChange}
                                                />
                                                <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('evolution-photo')?.click()}>
                                                    <Camera className="mr-2 h-4 w-4" />
                                                    {imagePreview ? 'Trocar Foto' : 'Adicionar Foto'}
                                                </Button>
                                            </div>
                                        </FormControl>
                                     </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="flex justify-end">
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : <><BookPlus className="mr-2 h-4 w-4" /> Salvar Evolução</>}
                            </Button>
                        </div>
                    </form>
                </Form>
                <div className="space-y-4 pt-6 border-t">
                    <h4 className="font-semibold text-md">Histórico de Evolução</h4>
                     {patient.evolutions && patient.evolutions.length > 0 ? (
                        <div className="space-y-6">
                            {patient.evolutions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(evo => (
                                <Card key={evo.id} className="bg-muted/50">
                                    <CardHeader className="p-4 flex-row justify-between items-center">
                                        <CardTitle className="text-base">{formatDate(evo.date)}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-4 pt-0 grid md:grid-cols-3 gap-6">
                                        <div className="md:col-span-2">
                                            <p className="text-sm text-muted-foreground">{evo.notes}</p>
                                            {evo.bioimpedance && (
                                                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-xs">
                                                    <BioimpedanceItem icon={Activity} label="% Gordura" value={evo.bioimpedance.fatPercentage} unit="%" />
                                                    <BioimpedanceItem icon={UserCheck} label="Massa Muscular" value={evo.bioimpedance.muscleMass} unit="%" />
                                                    <BioimpedanceItem icon={HeartPulse} label="Gordura Visceral" value={evo.bioimpedance.visceralFat} />
                                                    <BioimpedanceItem icon={Droplets} label="Água" value={evo.bioimpedance.hydration} unit="%" />
                                                    <BioimpedanceItem icon={Flame} label="Metabolismo" value={evo.bioimpedance.metabolism} unit=" kcal" />
                                                    <BioimpedanceItem icon={Bone} label="Massa Óssea" value={evo.bioimpedance.boneMass} unit=" kg" />
                                                    <BioimpedanceItem icon={Beef} label="Proteína" value={evo.bioimpedance.protein} unit="%" />
                                                    <BioimpedanceItem icon={CalendarIcon} label="Idade Metabólica" value={evo.bioimpedance.metabolicAge} unit=" anos" />
                                                </div>
                                            )}
                                        </div>
                                        {evo.photoUrl && (
                                            <div className="relative w-full aspect-square rounded-md border overflow-hidden">
                                                <Image src={evo.photoUrl} alt={`Evolução em ${formatDate(evo.date)}`} layout="fill" className="object-cover"/>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                     ) : (
                        <p className="text-sm text-center text-muted-foreground py-8">Nenhuma evolução registrada ainda.</p>
                     )}
                </div>
            </CardContent>
        </Card>
    );
}

function BioimpedanceItem({ icon: Icon, label, value, unit }: { icon: React.ElementType, label: string, value?: number | null, unit?: string }) {
    if (value === undefined || value === null) return null;
    return (
        <div className="flex items-center gap-2 p-1.5 bg-background/50 rounded">
            <Icon className="h-4 w-4 text-muted-foreground"/>
            <div className="flex justify-between items-baseline w-full">
                <span className="font-medium text-foreground/80">{label}:</span>
                <span className="font-semibold text-foreground">{value}{unit}</span>
            </div>
        </div>
    )
}



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
  type Bioimpedance,
  linkPatientToAuth,
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
    KeyRound,
    UserCog,
    Mail,
    Send,
} from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { Skeleton } from "@/components/ui/skeleton";
import { summarizeHealthData } from '@/ai/flows/summarize-health-data';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format as formatDateFns } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import { useAuth } from '@/firebase';

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

const createAccessFormSchema = z.object({
  email: z.string().email("Por favor, insira um email válido."),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
});

type CreateAccessFormValues = z.infer<typeof createAccessFormSchema>;

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
   const onPatientUpdate = (updatedPatient: Patient) => {
    setPatient(updatedPatient);
  }


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
      { key: 'muscleMassPercentage', label: 'Massa Muscular', icon: UserCheck, unit: '%' },
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

       <AccessControlCard patient={patient} onPatientUpdate={onPatientUpdate}/>
      
       <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Evolução da Bioimpedância</CardTitle>
          <CardDescription>Visualize o progresso de cada métrica ao longo do tempo.</CardDescription>
        </CardHeader>
        <CardContent>
          {evolutionChartData.length > 1 ? (
             <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {chartMetrics.map(metric => {
                const data = evolutionChartData
                  .map(e => ({
                    date: formatDate(e.date),
                    value: e[metric.key] as number
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
              É necessário pelo menos dois registros de bioimpedância para gerar os gráficos. Adicione um na aba <Link href="/bioimpedance" className="text-primary hover:underline font-semibold">Bioimpedância</Link>.
            </p>
          )}
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

function AccessControlCard({ patient, onPatientUpdate }: { patient: Patient, onPatientUpdate: (patient: Patient) => void }) {
    const { createUser } = useAuth();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCreateAccessOpen, setIsCreateAccessOpen] = useState(false);

    const form = useForm<CreateAccessFormValues>({
        resolver: zodResolver(createAccessFormSchema),
        defaultValues: {
            email: '',
            password: ''
        },
    });

    async function onSubmit(data: CreateAccessFormValues) {
        setIsSubmitting(true);
        try {
            const user = await createUser(data.email, data.password);
            if (user) {
                const updatedPatient = await linkPatientToAuth(patient.id, user.uid, data.email);
                onPatientUpdate(updatedPatient);
                toast({
                    title: "Acesso Criado!",
                    description: "O paciente agora pode acessar o portal com as credenciais fornecidas.",
                });
                setIsCreateAccessOpen(false);
            }
        } catch (error: any) {
            console.error("Failed to create user", error);
            const message = error.code === 'auth/email-already-in-use' 
                ? 'Este e-mail já está em uso por outra conta.'
                : 'Não foi possível criar o acesso. Tente novamente.';
            toast({
                variant: "destructive",
                title: "Erro ao Criar Acesso",
                description: message,
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><UserCog className="h-5 w-5"/>Acesso do Paciente</CardTitle>
                <CardDescription>Gerencie o acesso do paciente ao portal do cliente.</CardDescription>
            </CardHeader>
            <CardContent>
                {patient.authId ? (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-4 w-4 text-muted-foreground"/>
                            <span className="font-semibold">Email de Acesso:</span>
                            <span className="text-muted-foreground">{patient.authEmail}</span>
                        </div>
                        <Button variant="outline">
                            <Send className="mr-2 h-4 w-4"/>
                            Reenviar Credenciais
                        </Button>
                    </div>
                ) : (
                    <div className="flex flex-col items-start gap-4">
                        <p className="text-sm text-muted-foreground">Este paciente ainda não tem acesso ao portal.</p>
                        <Dialog open={isCreateAccessOpen} onOpenChange={setIsCreateAccessOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <KeyRound className="mr-2 h-4 w-4"/>
                                    Criar Acesso
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Criar Acesso para {patient.fullName}</DialogTitle>
                                    <DialogDescription>
                                        Defina o e-mail e a senha para que o paciente possa acessar o portal.
                                    </DialogDescription>
                                </DialogHeader>
                                <Form {...form}>
                                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                        <FormField
                                            control={form.control}
                                            name="email"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>E-mail do Paciente</FormLabel>
                                                    <FormControl>
                                                        <Input type="email" placeholder="email@paciente.com" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                         <FormField
                                            control={form.control}
                                            name="password"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Senha</FormLabel>
                                                    <FormControl>
                                                        <Input type="password" placeholder="••••••••" {...field} />
                                                    </FormControl>
                                                     <FormDescription className="text-xs">
                                                        A senha deve ter pelo menos 6 caracteres.
                                                     </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <DialogFooter>
                                            <DialogClose asChild>
                                                <Button type="button" variant="outline" disabled={isSubmitting}>Cancelar</Button>
                                            </DialogClose>
                                            <Button type="submit" disabled={isSubmitting}>
                                                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Criando...</> : 'Criar e Salvar'}
                                            </Button>
                                        </DialogFooter>
                                    </form>
                                </Form>
                            </DialogContent>
                        </Dialog>
                    </div>
                )}
            </CardContent>
        </Card>
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

const isSameDay = (date1: Date, date2: Date) =>
  date1.getFullYear() === date2.getFullYear() &&
  date1.getMonth() === date2.getMonth() &&
  date1.getDate() === date2.getDate();

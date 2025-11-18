
'use client';

import { useState, useEffect } from 'react';
import { notFound, useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import {
  getPatientById,
  updateDose,
  addPatientEvolution,
  type Patient,
  type Dose,
  type Evolution,
} from '@/lib/data';
import {
  calculateBmi,
  formatDate,
  getDoseStatus,
  generateWhatsAppLink,
} from '@/lib/utils';
import { useForm, useForm as useEvolutionForm } from 'react-hook-form';
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


const doseManagementSchema = z.object({
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

  if (loading || !patient) {
    return <PatientDetailSkeleton />;
  }
  
  const currentWeight = patient.doses.findLast(d => d.status === 'administered' && d.weight)?.weight ?? patient.initialWeight;
  const currentBmi = calculateBmi(currentWeight, patient.height / 100);
  const weightToLose = currentWeight - patient.desiredWeight;
  const patientNameInitial = patient.fullName.charAt(0).toUpperCase();

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
      <div className="flex flex-col md:flex-row items-start gap-6">
        <Card className="w-full md:w-1/3">
          <CardHeader className="items-center text-center">
            <Avatar className="w-24 h-24 mb-4">
              <AvatarImage src={patient.avatarUrl} alt={patient.fullName} />
              <AvatarFallback className="text-3xl">{patientNameInitial}</AvatarFallback>
            </Avatar>
            <CardTitle>{patient.fullName}</CardTitle>
            <CardDescription>{patient.age} anos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-3"><Phone className="w-4 h-4 text-muted-foreground" /> <span>{patient.phone}</span></div>
            <div className="flex items-start gap-3"><MapPin className="w-4 h-4 text-muted-foreground mt-1" /> <span>{`${patient.address.street}, ${patient.address.number} - ${patient.address.city}, ${patient.address.state}`}</span></div>
             <div className="flex items-center gap-3"><CalendarIcon className="w-4 h-4 text-muted-foreground" /> <span>Início: {formatDate(patient.firstDoseDate)}</span></div>
          </CardContent>
        </Card>
        <div className="w-full md:w-2/3 grid grid-cols-2 lg:grid-cols-3 gap-4">
            <InfoCard icon={Weight} label="Peso Atual" value={`${currentWeight.toFixed(1)} kg`} />
            <InfoCard icon={Activity} label="IMC Atual" value={currentBmi} />
            <InfoCard icon={Ruler} label="Altura" value={`${patient.height} cm`} />
            <InfoCard icon={Target} label="Meta de Peso" value={`${patient.desiredWeight} kg`} />
            <InfoCard icon={TrendingDown} label="Faltam Perder" value={`${weightToLose > 0 ? weightToLose.toFixed(1) : 0} kg`} />
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Ficha de Avaliação de Saúde</CardTitle>
              <CardDescription>Observações, contraindicações e histórico do paciente.</CardDescription>
            </div>
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
                </div>
                <div className="space-y-4">
                    <h4 className="font-semibold">Condições e Contraindicações</h4>
                    <div className="text-sm text-muted-foreground space-y-2">
                        {patient.healthContraindications.split(', ').map((item, index) => {
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
                <TableHead>Peso</TableHead>
                <TableHead>IMC</TableHead>
                <TableHead>Dose Aplicada</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {patient.doses.map((dose) => {
                const status = getDoseStatus(dose);
                return (
                  <TableRow key={dose.id}>
                    <TableCell className="font-semibold">{dose.doseNumber}</TableCell>
                    <TableCell>{formatDate(dose.date)}</TableCell>
                    <TableCell>{dose.weight ? `${dose.weight.toFixed(1)} kg` : '-'}</TableCell>
                    <TableCell>{dose.bmi ? dose.bmi.toFixed(2) : '-'}</TableCell>
                    <TableCell>{dose.administeredDose ? `${dose.administeredDose} mg` : '-'}</TableCell>
                    <TableCell>
                      <Badge variant={status.color.startsWith('bg-') ? 'default' : 'outline'} className={`${status.color} ${status.textColor} border-none`}>{status.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleManageDoseClick(dose)} disabled={dose.status === 'administered'}>
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
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value ?? '-'}</div>
            </CardContent>
        </Card>
    )
}

function PatientDetailSkeleton() {
  return (
    <div className="space-y-6">
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
        </div>
      </div>
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
            status: dose.status,
            weight: dose.weight || undefined,
            administeredDose: dose.administeredDose || undefined,
            paymentMethod: dose.payment?.method || undefined,
            installments: dose.payment?.installments || undefined,
        },
    });

    useEffect(() => {
        form.reset({
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
                status: data.status,
                weight: data.weight,
                administeredDose: data.administeredDose,
                payment: data.paymentMethod ? {
                    method: data.paymentMethod,
                    installments: data.installments,
                } : undefined,
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
                        Atualize as informações da dose agendada para {formatDate(dose.date)}.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

    const form = useEvolutionForm<EvolutionFormValues>({
        resolver: zodResolver(evolutionFormSchema),
        defaultValues: {
            notes: "",
            photoUrl: "",
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
                <CardTitle>Evolução de Desempenho</CardTitle>
                <CardDescription>Adicione e visualize a evolução do paciente ao longo do tempo.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mb-6">
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
                                            <>
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
                                            </>
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
                        <div className="grid gap-6">
                            {patient.evolutions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(evo => (
                                <Card key={evo.id} className="bg-muted/50">
                                    <CardHeader className="p-4 flex-row justify-between items-center">
                                        <CardTitle className="text-base">{formatDate(evo.date)}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-4 pt-0 grid md:grid-cols-3 gap-4">
                                        <p className="text-sm text-muted-foreground col-span-3 md:col-span-2">{evo.notes}</p>
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
    

    

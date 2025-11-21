
'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter, useParams } from "next/navigation";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, ArrowLeft, CalendarIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { getPatientById, updatePatient, type Patient, type UpdatePatientData } from "@/lib/actions";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const healthConditions = [
    { id: "hypertension", label: "Hipertensão" },
    { id: "diabetes", label: "Diabetes" },
    { id: "heart_disease", label: "Doença Cardíaca" },
    { id: "thyroid", label: "Problemas de Tireoide" },
    { id: "allergies", label: "Alergias" },
    { id: "respiratory", label: "Problemas Respiratórios" },
] as const;

const contraindicationsList = [
    { id: "allergy", label: "Alergia ao glimepirida ou componentes da fórmula" },
    { id: "hypoglycemia", label: "Hipoglicemia não controlada" },
    { id: "ketoacidosis", label: "Cetoacidose diabética e coma diabético" },
    { id: "renal_failure", label: "Insuficiência renal grave" },
    { id: "hepatic_failure", label: "Insuficiência hepática grave" },
    { id: "pregnancy", label: "Gravidez e amamentação" },
    { id: "alcohol", label: "Uso concomitante de álcool" },
    { id: "drug_interaction_hypo", label: "Interações com medicamentos que aumentam o risco de hipoglicemia" },
    { id: "cardiovascular", label: "Histórico de doenças cardiovasculares graves (monitoramento necessário)" },
    { id: "drug_interaction_efficacy", label: "Uso de medicamentos que podem afetar a eficácia do Monjauro (ex: AINEs, diuréticos, corticosteroides)" },
] as const;


const patientEditFormSchema = z.object({
  fullName: z.string().min(3, "Nome completo é obrigatório."),
  initialWeight: z.coerce.number().min(1, "Peso inicial é obrigatório.").positive("Peso deve ser um número positivo."),
  height: z.coerce.number().min(1, "Altura é obrigatória.").positive("Altura deve ser um número positivo."),
  age: z.coerce.number().positive("Idade deve ser um número positivo.").optional(),
  desiredWeight: z.coerce.number().positive("Peso deve ser um número positivo.").optional(),
  firstDoseDate: z.date().optional(),
  zip: z.string().optional(),
  street: z.string().optional(),
  number: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  phone: z.string().optional(),
  healthConditions: z.array(z.string()).optional(),
  contraindications: z.array(z.string()).optional(),
  otherHealthIssues: z.string().optional(),
  dailyMedications: z.string().optional(),
  oralContraceptive: z.enum(['yes', 'no']).optional(),
  usedMonjauro: z.enum(['yes', 'no']).optional(),
  monjauroDose: z.string().optional(),
  monjauroTime: z.string().optional(),
  indicationSource: z.enum(['yes', 'no']).optional(),
  indicationName: z.string().optional(),
}).refine(data => {
    if (data.usedMonjauro === 'yes') {
        return !!data.monjauroDose && !!data.monjauroTime;
    }
    return true;
}, {
    message: "Dose e tempo de uso são obrigatórios se você já usou Monjauro.",
    path: ["usedMonjauro"],
}).refine(data => {
    if (data.indicationSource === 'yes') {
        return !!data.indicationName;
    }
    return true;
}, {
    message: "Por favor, informe quem o indicou.",
    path: ["indicationName"],
});

type PatientEditFormValues = z.infer<typeof patientEditFormSchema>;

export default function PatientEditPage() {
    const router = useRouter();
    const params = useParams();
    const patientId = params.id as string;
    const { toast } = useToast();
    const [patient, setPatient] = useState<Patient | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<PatientEditFormValues>({
        resolver: zodResolver(patientEditFormSchema),
    });

    useEffect(() => {
        if (!patientId) return;

        const fetchPatient = async () => {
            setLoading(true);
            const fetchedPatient = await getPatientById(patientId);
            setPatient(fetchedPatient);
            
            if (fetchedPatient) {
                // Parse healthContraindications back into form fields
                const hcString = fetchedPatient.healthContraindications || '';
                const conditions = healthConditions.filter(c => hcString.includes(c.label)).map(c => c.id);
                const contrainds = contraindicationsList.filter(c => hcString.includes(c.label)).map(c => c.id);
                
                const otherIssues = hcString
                    .split(', ')
                    .filter(s => s && !s.startsWith('[CONTRAINDICADO]'))
                    .filter(s => !healthConditions.some(c => c.label === s))
                    .join(', ');

                form.reset({
                    fullName: fetchedPatient.fullName,
                    initialWeight: fetchedPatient.initialWeight,
                    height: fetchedPatient.height,
                    age: fetchedPatient.age,
                    desiredWeight: fetchedPatient.desiredWeight,
                    firstDoseDate: fetchedPatient.firstDoseDate ? new Date(fetchedPatient.firstDoseDate) : undefined,
                    zip: fetchedPatient.address.zip,
                    street: fetchedPatient.address.street,
                    number: fetchedPatient.address.number,
                    city: fetchedPatient.address.city,
                    state: fetchedPatient.address.state,
                    phone: fetchedPatient.phone,
                    healthConditions: conditions,
                    contraindications: contrainds,
                    otherHealthIssues: otherIssues,
                    dailyMedications: fetchedPatient.dailyMedications,
                    oralContraceptive: fetchedPatient.oralContraceptive,
                    usedMonjauro: fetchedPatient.usedMonjauro,
                    monjauroDose: fetchedPatient.monjauroDose,
                    monjauroTime: fetchedPatient.monjauroTime,
                    indicationSource: fetchedPatient.indication?.name ? 'yes' : 'no',
                    indicationName: fetchedPatient.indication?.name
                });
            }
            setLoading(false);
        }
        fetchPatient();
    }, [patientId, form]);

    async function onSubmit(data: PatientEditFormValues) {
        if (!patient) return;
        setIsSubmitting(true);
        try {
            const conditions = data.healthConditions
                ?.map(id => healthConditions.find(c => c.id === id)?.label)
                .filter(Boolean) ?? [];

            const contraindications = data.contraindications
                ?.map(id => contraindicationsList.find(c => c.id === id)?.label)
                .filter(Boolean)
                .map(label => `[CONTRAINDICADO] ${label}`) ?? [];
                
            const fullContraindications = [
                ...conditions,
                ...contraindications,
                data.otherHealthIssues
            ].filter(Boolean).join(', ');
            
            const indication = data.indicationSource === 'yes' && data.indicationName
                ? { type: 'indicado' as const, name: data.indicationName, patientId: patient.indication?.patientId }
                : undefined;

            const patientDataForApi: UpdatePatientData = {
                fullName: data.fullName,
                initialWeight: data.initialWeight,
                height: data.height,
                age: data.age,
                desiredWeight: data.desiredWeight,
                firstDoseDate: data.firstDoseDate,
                address: {
                  zip: data.zip,
                  street: data.street,
                  number: data.number,
                  city: data.city,
                  state: data.state,
                },
                phone: data.phone,
                healthContraindications: fullContraindications || 'Nenhuma observação.',
                indication,
                dailyMedications: data.dailyMedications,
                oralContraceptive: data.oralContraceptive,
                usedMonjauro: data.usedMonjauro,
                monjauroDose: data.monjauroDose,
                monjauroTime: data.monjauroTime,
            };
            
            await updatePatient(patient.id, patientDataForApi);
            toast({
                title: "Paciente Atualizado!",
                description: "Os dados do paciente foram salvos com sucesso.",
            });
            router.push(`/patients/${patient.id}`);
            router.refresh();
        } catch (error) {
            console.error("Failed to update patient", error);
             toast({
                variant: "destructive",
                title: "Erro ao Salvar",
                description: "Não foi possível atualizar os dados do paciente. Por favor, tente novamente.",
            });
        } finally {
            setIsSubmitting(false);
        }
    }
    
    if (loading) {
        return (
             <div className="space-y-6">
                <Skeleton className="h-10 w-48" />
                <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-1/3" />
                        <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent className="space-y-8">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-24 w-full" />
                        <div className="flex justify-end">
                            <Skeleton className="h-10 w-32" />
                        </div>
                    </CardContent>
                </Card>
             </div>
        )
    }

    if (!patient) {
        return (
            <div>
                <h1 className="text-xl font-bold">Paciente não encontrado</h1>
                <p className="text-muted-foreground">O paciente que você está tentando editar não foi encontrado.</p>
                <Button variant="link" asChild><Link href="/patients">Voltar para a lista</Link></Button>
            </div>
        )
    }

    const watchUsedMonjauro = form.watch("usedMonjauro");
    const watchIndicationSource = form.watch("indicationSource");


    return (
        <>
        <Button variant="ghost" asChild className="mb-4 -ml-4">
            <Link href={`/patients/${patientId}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar para o Perfil
            </Link>
        </Button>
        <Card>
            <CardHeader>
                <CardTitle>Editar Perfil de {patient.fullName}</CardTitle>
                <CardDescription>Atualize os dados do paciente abaixo.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                         <h3 className="text-lg font-semibold -mb-2">Informações Pessoais e de Contato</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <FormField control={form.control} name="fullName" render={({ field }) => (
                                <FormItem><FormLabel>Nome Completo</FormLabel><FormControl><Input placeholder="Nome completo do paciente" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="phone" render={({ field }) => (
                                <FormItem><FormLabel>Telefone (WhatsApp)</FormLabel><FormControl><Input placeholder="(XX) XXXXX-XXXX" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-end">
                            <FormField control={form.control} name="age" render={({ field }) => (
                                <FormItem><FormLabel>Idade</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="height" render={({ field }) => (
                                <FormItem><FormLabel>Altura (cm)</FormLabel><FormControl><Input type="number" placeholder="Ex: 175" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="initialWeight" render={({ field }) => (
                                <FormItem><FormLabel>Peso Inicial (kg)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="desiredWeight" render={({ field }) => (
                                <FormItem><FormLabel>Meta de Peso (kg)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                             <FormField
                                control={form.control}
                                name="firstDoseDate"
                                render={({ field }) => (
                                <FormItem className="flex flex-col"><FormLabel>Início do Tratamento</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                            <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}
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
                        </div>
                        
                        <h3 className="text-lg font-semibold border-t pt-6 -mb-2">Endereço</h3>
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField control={form.control} name="zip" render={({ field }) => (
                                <FormItem><FormLabel>CEP</FormLabel><FormControl><Input placeholder="00000-000" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField control={form.control} name="street" render={({ field }) => (
                                <FormItem className="col-span-2"><FormLabel>Rua</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="number" render={({ field }) => (
                                <FormItem><FormLabel>Número</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="city" render={({ field }) => (
                                <FormItem><FormLabel>Cidade</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="state" render={({ field }) => (
                                <FormItem><FormLabel>Estado (UF)</FormLabel><FormControl><Input placeholder="Ex: SP" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                        </div>

                         <div className="space-y-8 border-t pt-6">
                            <h3 className="text-lg font-semibold">Avaliação de Saúde</h3>
                            
                            <FormField control={form.control} name="otherHealthIssues" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Você possui algum problema de saúde não listado abaixo?</FormLabel>
                                    <FormControl>
                                        <Textarea rows={3} placeholder="Liste problemas de saúde não mencionados, se houver." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>

                            <FormField
                                control={form.control}
                                name="healthConditions"
                                render={() => (
                                    <FormItem>
                                    <div className="mb-4">
                                        <FormLabel className="text-base">Condições de Saúde Pré-existentes</FormLabel>
                                        <FormDescription>
                                            Selecione todas as condições que se aplicam ao paciente.
                                        </FormDescription>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {healthConditions.map((item) => (
                                        <FormField
                                            key={item.id}
                                            control={form.control}
                                            name="healthConditions"
                                            render={({ field }) => {
                                                return (
                                                <FormItem key={item.id} className="flex flex-row items-center space-x-3 space-y-0">
                                                    <FormControl>
                                                    <Checkbox
                                                        checked={field.value?.includes(item.id)}
                                                        onCheckedChange={(checked) => {
                                                        return checked
                                                            ? field.onChange([...(field.value || []), item.id])
                                                            : field.onChange(field.value?.filter((value) => value !== item.id))
                                                        }}
                                                    />
                                                    </FormControl>
                                                    <FormLabel className="font-normal">{item.label}</FormLabel>
                                                </FormItem>
                                                )
                                            }}
                                            />
                                        ))}
                                    </div>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="contraindications"
                                render={() => (
                                    <FormItem>
                                    <div className="mb-4">
                                        <FormLabel className="text-base">Contraindicações do Medicamento</FormLabel>
                                        <FormDescription>
                                            Marque se o paciente possui alguma das contraindicações abaixo.
                                        </FormDescription>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                    {contraindicationsList.map((item) => (
                                        <FormField
                                            key={item.id}
                                            control={form.control}
                                            name="contraindications"
                                            render={({ field }) => {
                                                return (
                                                <FormItem key={item.id} className="flex flex-row items-start space-x-3 space-y-0">
                                                    <FormControl>
                                                    <Checkbox
                                                        checked={field.value?.includes(item.id)}
                                                        onCheckedChange={(checked) => {
                                                        return checked
                                                            ? field.onChange([...(field.value || []), item.id])
                                                            : field.onChange(field.value?.filter((value) => value !== item.id))
                                                        }}
                                                    />
                                                    </FormControl>
                                                    <FormLabel className="font-normal text-sm">{item.label}</FormLabel>
                                                </FormItem>
                                                )
                                            }}
                                            />
                                        ))}
                                    </div>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            
                            <FormField control={form.control} name="dailyMedications" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Quais medicamentos o paciente toma todos os dias?</FormLabel>
                                    <FormControl>
                                        <Textarea rows={3} placeholder="Liste os medicamentos de uso contínuo." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>

                            <FormField control={form.control} name="oralContraceptive" render={({ field }) => (
                                <FormItem className="space-y-3">
                                    <FormLabel>Faz uso de anticoncepcional oral?</FormLabel>
                                    <FormControl>
                                        <RadioGroup onValueChange={field.onChange} value={field.value} className="flex items-center gap-6">
                                        <FormItem className="flex items-center space-x-3 space-y-0">
                                            <FormControl><RadioGroupItem value="yes" /></FormControl>
                                            <FormLabel className="font-normal">Sim</FormLabel>
                                        </FormItem>
                                        <FormItem className="flex items-center space-x-3 space-y-0">
                                            <FormControl><RadioGroupItem value="no" /></FormControl>
                                            <FormLabel className="font-normal">Não</FormLabel>
                                        </FormItem>
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            
                            <FormField control={form.control} name="usedMonjauro" render={({ field }) => (
                                <FormItem className="space-y-3">
                                    <FormLabel>Já tomou este medicamento (ou similar) antes?</FormLabel>
                                    <FormControl>
                                        <RadioGroup onValueChange={field.onChange} value={field.value} className="flex items-center gap-6">
                                        <FormItem className="flex items-center space-x-3 space-y-0">
                                            <FormControl><RadioGroupItem value="yes" /></FormControl>
                                            <FormLabel className="font-normal">Sim</FormLabel>
                                        </FormItem>
                                        <FormItem className="flex items-center space-x-3 space-y-0">
                                            <FormControl><RadioGroupItem value="no" /></FormControl>
                                            <FormLabel className="font-normal">Não</FormLabel>
                                        </FormItem>
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>

                            {watchUsedMonjauro === 'yes' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField control={form.control} name="monjauroDose" render={({ field }) => (
                                        <FormItem><FormLabel>Qual a dose?</FormLabel><FormControl><Input placeholder="Ex: 2.5mg" {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="monjauroTime" render={({ field }) => (
                                        <FormItem><FormLabel>Há quanto tempo?</FormLabel><FormControl><Input placeholder="Ex: 3 meses" {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                </div>
                            )}

                             <FormField control={form.control} name="indicationSource" render={({ field }) => (
                                <FormItem className="space-y-3">
                                    <FormLabel>Foi indicado(a) por alguém?</FormLabel>
                                    <FormControl>
                                        <RadioGroup onValueChange={field.onChange} value={field.value} className="flex items-center gap-6">
                                        <FormItem className="flex items-center space-x-3 space-y-0">
                                            <FormControl><RadioGroupItem value="yes" /></FormControl>
                                            <FormLabel className="font-normal">Sim</FormLabel>
                                        </FormItem>
                                        <FormItem className="flex items-center space-x-3 space-y-0">
                                            <FormControl><RadioGroupItem value="no" /></FormControl>
                                            <FormLabel className="font-normal">Não</FormLabel>
                                        </FormItem>
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>

                            {watchIndicationSource === 'yes' && (
                                <FormField control={form.control} name="indicationName" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Quem indicou?</FormLabel>
                                        <FormControl><Input placeholder="Nome de quem indicou" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                            )}

                        </div>
                        
                        <div className="flex justify-end gap-2 pt-4 border-t">
                             <Button type="button" variant="outline" onClick={() => router.push(`/patients/${patientId}`)} disabled={isSubmitting}>Cancelar</Button>
                            <Button type="submit" disabled={isSubmitting} size="lg">
                                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Salvando Alterações...</> : 'Salvar Alterações'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
        </>
    )
}

    
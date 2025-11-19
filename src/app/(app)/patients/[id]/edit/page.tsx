
'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter, useParams, notFound } from "next/navigation";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CalendarIcon, ArrowLeft, User as UserIcon, Upload, Loader2 } from "lucide-react";
import { cn, calculateBmi } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { getPatientById, updatePatient, getPatients, type Patient } from "@/lib/actions";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import Image from "next/image";
import { Combobox } from "@/components/ui/combobox";
import { Skeleton } from "@/components/ui/skeleton";

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

const patientFormSchema = z.object({
  fullName: z.string().min(3, "Nome completo é obrigatório."),
  age: z.coerce.number().min(1, "Idade é obrigatória.").positive("Idade deve ser um número positivo."),
  initialWeight: z.coerce.number().min(1, "Peso inicial é obrigatório.").positive("Peso deve ser um número positivo."),
  height: z.coerce.number().min(1, "Altura é obrigatória.").positive("Altura deve ser um número positivo."),
  desiredWeight: z.coerce.number().min(1, "Peso desejado é obrigatório.").positive("Peso deve ser um número positivo."),
  firstDoseDate: z.date({
    required_error: "A data da primeira dose é obrigatória.",
  }),
  zip: z.string().min(8, "CEP deve ter 8 dígitos.").max(9, "CEP inválido."),
  street: z.string().min(1, "Rua é obrigatória."),
  number: z.string().min(1, "Número é obrigatório."),
  city: z.string().min(1, "Cidade é obrigatória."),
  state: z.string().min(2, "Estado é obrigatório.").max(2, "Use a sigla do estado."),
  phone: z.string().min(10, "Telefone inválido."),
  healthConditions: z.array(z.string()).optional(),
  contraindications: z.array(z.string()).optional(),
  otherHealthIssues: z.string().optional(),
  dailyMedications: z.string().optional(),
  oralContraceptive: z.enum(['yes', 'no']).optional(),
  usedMonjauro: z.enum(['yes', 'no']),
  monjauroDose: z.string().optional(),
  monjauroTime: z.string().optional(),
  avatarUrl: z.string().optional(),
  indicationType: z.enum(['indicado', 'indicador', 'nao_se_aplica']).optional(),
  indicationName: z.string().optional(),
  indicationPatientId: z.string().optional(),
}).refine(data => {
    if (data.usedMonjauro === 'yes') {
        return !!data.monjauroDose && !!data.monjauroTime;
    }
    return true;
}, {
    message: "Dose e tempo de uso são obrigatórios se você já usou Monjauro.",
    path: ["usedMonjauro"],
});

type PatientFormValues = z.infer<typeof patientFormSchema>;

export default function EditPatientPage() {
    const router = useRouter();
    const params = useParams();
    const patientId = params.id as string;
    const { toast } = useToast();
    
    const [patient, setPatient] = useState<Patient | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [bmi, setBmi] = useState<number | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [allPatients, setAllPatients] = useState<Patient[]>([]);

    const form = useForm<PatientFormValues>({
        resolver: zodResolver(patientFormSchema),
        defaultValues: {
            fullName: "",
            age: 0,
            initialWeight: 0,
            height: 0,
            desiredWeight: 0,
            zip: "",
            street: "",
            number: "",
            city: "",
            state: "",
            phone: "",
            healthConditions: [],
            contraindications: [],
            otherHealthIssues: "",
            dailyMedications: "",
            oralContraceptive: undefined,
            usedMonjauro: 'no',
            monjauroDose: "",
            monjauroTime: "",
            avatarUrl: "",
            indicationType: "nao_se_aplica",
            indicationName: "",
            indicationPatientId: "",
        },
    });

    useEffect(() => {
        const fetchInitialData = async () => {
            if (!patientId) {
                notFound();
                return;
            }
            try {
                const [patientData, allPatientsData] = await Promise.all([
                    getPatientById(patientId),
                    getPatients()
                ]);

                if (!patientData) {
                    notFound();
                    return;
                }

                setPatient(patientData);
                setAllPatients(allPatientsData);
                
                const allIssues = patientData.healthContraindications?.split(', ').filter(Boolean) || [];
                
                const healthConditionsIds = allIssues
                    .map(label => healthConditions.find(hc => hc.label === label)?.id)
                    .filter((id): id is string => !!id);

                const contraindicationsIds = allIssues
                    .filter(label => label.startsWith('[CONTRAINDICADO]'))
                    .map(label => {
                        const originalLabel = label.replace('[CONTRAINDICADO] ', '');
                        return contraindicationsList.find(c => c.label === originalLabel)?.id;
                    })
                    .filter((id): id is string => !!id);
                
                const otherIssues = allIssues
                    .filter(label => 
                        !healthConditions.some(hc => hc.label === label) && 
                        !contraindicationsList.some(c => `[CONTRAINDICADO] ${c.label}` === label)
                    )
                    .join(', ');

                form.reset({
                    fullName: patientData.fullName,
                    age: patientData.age,
                    initialWeight: patientData.initialWeight,
                    height: patientData.height,
                    desiredWeight: patientData.desiredWeight,
                    firstDoseDate: new Date(patientData.firstDoseDate),
                    zip: patientData.address?.zip || '',
                    street: patientData.address?.street || '',
                    number: patientData.address?.number || '',
                    city: patientData.address?.city || '',
                    state: patientData.address?.state || '',
                    phone: patientData.phone,
                    healthConditions: healthConditionsIds,
                    contraindications: contraindicationsIds,
                    otherHealthIssues: otherIssues,
                    dailyMedications: patientData.dailyMedications || '',
                    oralContraceptive: patientData.oralContraceptive,
                    usedMonjauro: patientData.usedMonjauro,
                    monjauroDose: patientData.monjauroDose || '',
                    monjauroTime: patientData.monjauroTime || '',
                    avatarUrl: patientData.avatarUrl,
                    indicationType: patientData.indication?.type || 'nao_se_aplica',
                    indicationName: patientData.indication?.name || '',
                    indicationPatientId: patientData.indication?.patientId || '',
                });
                setImagePreview(patientData.avatarUrl);

            } catch (error) {
                toast({ title: "Erro ao carregar dados", description: "Não foi possível buscar as informações do paciente.", variant: "destructive" });
                router.push('/patients');
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();
    }, [patientId, form, router, toast]);

    const patientOptions = allPatients.map(p => ({ value: p.id, label: p.fullName }));

    const watchWeight = form.watch("initialWeight");
    const watchHeight = form.watch("height");
    const watchZip = form.watch("zip");
    const watchUsedMonjauro = form.watch("usedMonjauro");
    const watchIndicationType = form.watch("indicationType");

    useEffect(() => {
        if (watchWeight && watchHeight) {
            setBmi(calculateBmi(watchWeight, watchHeight / 100)); // Convert cm to meters
        } else {
            setBmi(null);
        }
    }, [watchWeight, watchHeight]);

    useEffect(() => {
        const fetchAddress = async () => {
            const zipCode = watchZip?.replace(/\D/g, '');
            if (zipCode && zipCode.length === 8) {
                try {
                    const response = await fetch(`https://viacep.com.br/ws/${zipCode}/json/`);
                    const data = await response.json();
                    if (!data.erro) {
                        form.setValue("street", data.logradouro);
                        form.setValue("city", data.localidade);
                        form.setValue("state", data.uf);
                    } else {
                        toast({
                            variant: "destructive",
                            title: "CEP não encontrado",
                            description: "Verifique o CEP e tente novamente.",
                        });
                    }
                } catch (error) {
                    console.error("Failed to fetch address", error);
                    toast({
                        variant: "destructive",
                        title: "Erro ao buscar CEP",
                        description: "Não foi possível buscar o endereço. Tente novamente.",
                    });
                }
            }
        };
        const timeoutId = setTimeout(() => {
             if (watchZip) {
                fetchAddress();
            }
        }, 500); // Debounce API call
       
        return () => clearTimeout(timeoutId);
    }, [watchZip, form, toast]);
    
    async function onSubmit(data: PatientFormValues) {
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

            const patientDataForApi = {
                ...data,
                healthContraindications: fullContraindications || 'Nenhuma observação.',
                indication: data.indicationType && data.indicationType !== 'nao_se_aplica' && data.indicationName ? {
                    type: data.indicationType,
                    name: data.indicationName,
                    patientId: data.indicationPatientId,
                } : undefined,
            };
            
            await updatePatient(patientId, patientDataForApi);
            
            toast({
                title: "Paciente Atualizado!",
                description: `${data.fullName} foi atualizado(a) com sucesso.`,
                variant: "default",
            });
            router.push(`/patients/${patientId}`);
        } catch (error) {
            console.error("Failed to update patient", error);
             toast({
                variant: "destructive",
                title: "Erro ao salvar",
                description: "Não foi possível salvar as alterações. Tente novamente.",
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const dataUrl = reader.result as string;
                setImagePreview(dataUrl);
                form.setValue("avatarUrl", dataUrl);
            };
            reader.readAsDataURL(file);
        }
    };

    if (loading) {
        return (
             <div className="space-y-6">
                <Skeleton className="h-10 w-44" />
                <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-64" />
                        <Skeleton className="h-4 w-96 mt-2" />
                    </CardHeader>
                    <CardContent className="space-y-8">
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-64 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }

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
                    <CardTitle>Editar Perfil do Paciente</CardTitle>
                    <CardDescription>Atualize os dados de {patient?.fullName}.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                                <div className="md:col-span-2 space-y-8">
                                    <h3 className="text-lg font-semibold -mb-2">Informações Pessoais</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <FormField control={form.control} name="fullName" render={({ field }) => (
                                            <FormItem><FormLabel>Nome Completo</FormLabel><FormControl><Input placeholder="Ex: João da Silva" {...field} /></FormControl><FormMessage /></FormItem>
                                        )}/>
                                        <FormField control={form.control} name="phone" render={({ field }) => (
                                            <FormItem><FormLabel>Telefone (WhatsApp)</FormLabel><FormControl><Input placeholder="(XX) XXXXX-XXXX" {...field} /></FormControl><FormMessage /></FormItem>
                                        )}/>
                                    </div>
                                </div>
                                <FormField control={form.control} name="avatarUrl" render={({ field }) => (
                                <FormItem className="flex flex-col items-center justify-center gap-2">
                                    <FormLabel htmlFor="picture" className="cursor-pointer">
                                        <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-gray-300 relative">
                                            {imagePreview ? (
                                                <Image src={imagePreview} alt="Avatar Preview" layout="fill" className="rounded-full object-cover" />
                                            ) : (
                                                <div className="flex flex-col items-center text-muted-foreground">
                                                    <UserIcon className="w-12 h-12" />
                                                    <span className="text-sm mt-1">Foto</span>
                                                </div>
                                            )}
                                        </div>
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            id="picture"
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleImageChange}
                                        />
                                    </FormControl>
                                    <Button type="button" size="sm" variant="outline" onClick={() => document.getElementById('picture')?.click()}>
                                        <Upload className="w-4 h-4 mr-2" />
                                        Trocar Foto
                                    </Button>
                                    <FormMessage />
                                </FormItem>
                                )}/>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <FormField control={form.control} name="age" render={({ field }) => (
                                    <FormItem><FormLabel>Idade</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="initialWeight" render={({ field }) => (
                                    <FormItem><FormLabel>Peso Inicial (kg)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="height" render={({ field }) => (
                                    <FormItem><FormLabel>Altura (cm)</FormLabel><FormControl><Input type="number" placeholder="Ex: 175" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="desiredWeight" render={({ field }) => (
                                    <FormItem><FormLabel>Meta de Peso (kg)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
                                <FormField control={form.control} name="firstDoseDate" render={({ field }) => (
                                    <FormItem className="flex flex-col"><FormLabel>Data da 1ª Dose</FormLabel>
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
                                <div className="p-2 border rounded-md bg-muted/30 h-10 flex items-center justify-between">
                                    <label className="text-sm font-medium text-muted-foreground">IMC</label>
                                    <p className="text-lg font-bold">{bmi ? bmi.toFixed(2) : '-'}</p>
                                </div>
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
                                <h3 className="text-lg font-semibold">Ficha de Avaliação de Saúde</h3>
                                
                                <FormField control={form.control} name="otherHealthIssues" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Quais os problemas de saúde?</FormLabel>
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
                                                Selecione as condições relevantes do paciente.
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
                                                    <FormItem
                                                        key={item.id}
                                                        className="flex flex-row items-center space-x-3 space-y-0"
                                                    >
                                                        <FormControl>
                                                        <Checkbox
                                                            checked={field.value?.includes(item.id)}
                                                            onCheckedChange={(checked) => {
                                                            return checked
                                                                ? field.onChange([...(field.value || []), item.id])
                                                                : field.onChange(
                                                                    field.value?.filter(
                                                                    (value) => value !== item.id
                                                                    )
                                                                )
                                                            }}
                                                        />
                                                        </FormControl>
                                                        <FormLabel className="font-normal">
                                                        {item.label}
                                                        </FormLabel>
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

                                <Separator />

                                <FormField
                                    control={form.control}
                                    name="contraindications"
                                    render={() => (
                                        <FormItem>
                                        <div className="mb-4">
                                            <FormLabel className="text-base">Contraindicações do Monjauro</FormLabel>
                                            <FormDescription>
                                                Marque todas as contraindicações que se aplicam ao paciente.
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
                                                    <FormItem
                                                        key={item.id}
                                                        className="flex flex-row items-start space-x-3 space-y-0"
                                                    >
                                                        <FormControl>
                                                        <Checkbox
                                                            checked={field.value?.includes(item.id)}
                                                            onCheckedChange={(checked) => {
                                                            return checked
                                                                ? field.onChange([...(field.value || []), item.id])
                                                                : field.onChange(
                                                                    field.value?.filter(
                                                                    (value) => value !== item.id
                                                                    )
                                                                )
                                                            }}
                                                        />
                                                        </FormControl>
                                                        <FormLabel className="font-normal text-sm">
                                                        {item.label}
                                                        </FormLabel>
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
                                
                                <Separator />

                                <FormField control={form.control} name="dailyMedications" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Quais medicamentos toma todos os dias?</FormLabel>
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
                                            <RadioGroup
                                            onValueChange={field.onChange}
                                            value={field.value}
                                            className="flex items-center gap-6"
                                            >
                                            <FormItem className="flex items-center space-x-3 space-y-0">
                                                <FormControl>
                                                <RadioGroupItem value="yes" />
                                                </FormControl>
                                                <FormLabel className="font-normal">Sim</FormLabel>
                                            </FormItem>
                                            <FormItem className="flex items-center space-x-3 space-y-0">
                                                <FormControl>
                                                <RadioGroupItem value="no" />
                                                </FormControl>
                                                <FormLabel className="font-normal">Não</FormLabel>
                                            </FormItem>
                                            </RadioGroup>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                
                                <FormField control={form.control} name="usedMonjauro" render={({ field }) => (
                                    <FormItem className="space-y-3">
                                        <FormLabel>Já tomou Monjauro?</FormLabel>
                                        <FormControl>
                                            <RadioGroup
                                            onValueChange={field.onChange}
                                            value={field.value}
                                            className="flex items-center gap-6"
                                            >
                                            <FormItem className="flex items-center space-x-3 space-y-0">
                                                <FormControl>
                                                <RadioGroupItem value="yes" />
                                                </FormControl>
                                                <FormLabel className="font-normal">Sim</FormLabel>
                                            </FormItem>
                                            <FormItem className="flex items-center space-x-3 space-y-0">
                                                <FormControl>
                                                <RadioGroupItem value="no" />
                                                </FormControl>
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
                                            <FormItem>
                                                <FormLabel>Qual a dose?</FormLabel>
                                                <FormControl><Input placeholder="Ex: 2.5mg" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}/>
                                        <FormField control={form.control} name="monjauroTime" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Há quanto tempo?</FormLabel>
                                                <FormControl><Input placeholder="Ex: 3 meses" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}/>
                                    </div>
                                )}
                            </div>

                             <div className="space-y-8 border-t pt-6">
                                <h3 className="text-lg font-semibold">Indicação</h3>
                                 <FormField
                                    control={form.control}
                                    name="indicationType"
                                    render={({ field }) => (
                                        <FormItem className="space-y-3">
                                            <FormLabel>Tipo de Indicação</FormLabel>
                                            <FormControl>
                                                <RadioGroup
                                                    onValueChange={(value) => {
                                                        const newValue = value as 'indicado' | 'indicador' | 'nao_se_aplica' | undefined;
                                                        field.onChange(newValue);
                                                    }}
                                                    value={field.value}
                                                    className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6"
                                                >
                                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                                        <FormControl><RadioGroupItem value="indicado" /></FormControl>
                                                        <FormLabel className="font-normal">Indicado(a) por</FormLabel>
                                                    </FormItem>
                                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                                        <FormControl><RadioGroupItem value="indicador" /></FormControl>
                                                        <FormLabel className="font-normal">Indicou</FormLabel>
                                                    </FormItem>
                                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                                        <FormControl><RadioGroupItem value="nao_se_aplica" /></FormControl>
                                                        <FormLabel className="font-normal">Não se aplica</FormLabel>
                                                    </FormItem>
                                                </RadioGroup>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {watchIndicationType && watchIndicationType !== 'nao_se_aplica' && (
                                     <FormField
                                        control={form.control}
                                        name="indicationName"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-col">
                                                <FormLabel>Nome</FormLabel>
                                                <Combobox
                                                    options={patientOptions}
                                                    value={field.value}
                                                    onChange={(value, label) => {
                                                        form.setValue("indicationPatientId", value);
                                                        form.setValue("indicationName", label);
                                                    }}
                                                    placeholder="Selecione ou digite um nome..."
                                                    noResultsText="Nenhum paciente encontrado."
                                                    allowCustom
                                                />
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}
                            </div>
                            
                            <div className="flex justify-end gap-2 pt-4">
                                <Button type="button" variant="outline" onClick={() => router.push(`/patients/${patientId}`)} disabled={isSubmitting}>Cancelar</Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Salvando...</> : 'Salvar Alterações'}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </>
    )
}

    
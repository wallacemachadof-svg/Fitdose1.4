

'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter, useSearchParams } from "next/navigation";
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
import { User as UserIcon, Upload, Loader2, ArrowRight, CalendarIcon, Info, AlertTriangle } from "lucide-react";
import { cn, calculateBmi } from "@/lib/utils";
import { useEffect, useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { addPatient, getPatients, type Patient } from "@/lib/actions";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import Image from "next/image";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Combobox } from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";


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
  birthDate: z.date().optional(),
  initialWeight: z.coerce.number().min(1, "Peso inicial é obrigatório.").positive("Peso deve ser um número positivo."),
  height: z.coerce.number().min(1, "Altura é obrigatória.").positive("Altura deve ser um número positivo."),
  age: z.coerce.number().positive("Idade deve ser um número positivo.").optional(),
  desiredWeight: z.coerce.number().positive("Peso deve ser um número positivo.").optional(),
  firstDoseDate: z.date().optional(),
  serviceModel: z.enum(['presencial', 'online', 'hibrido']).optional(),
  zip: z.string().optional(),
  street: z.string().optional(),
  number: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  phone: z.string().optional(),
  healthConditions: z.array(z.string()).optional(),
  allergyDetails: z.string().optional(),
  contraindications: z.array(z.string()).optional(),
  otherHealthIssues: z.string().optional(),
  dailyMedications: z.string().optional(),
  oralContraceptive: z.enum(['yes', 'no']).optional(),
  usedMonjauro: z.enum(['yes', 'no']).optional(),
  monjauroDose: z.string().optional(),
  monjauroTime: z.string().optional(),
  avatarUrl: z.string().optional(),
  indicationSource: z.enum(['yes', 'no']).optional(),
  indicationName: z.string().optional(),
  indicationPatientId: z.string().optional(),
  consentGiven: z.boolean().optional(),
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

type PatientFormValues = z.infer<typeof patientFormSchema>;
type PatientOptions = { value: string, label: string }[];

// This is the Client Component
export default function PatientRegistrationForm({ patients }: { patients: Patient[] }) {
    const router = useRouter();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [bmi, setBmi] = useState<number | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [similarPatient, setSimilarPatient] = useState<Patient | null>(null);
    
    const patientOptions: PatientOptions = useMemo(() => 
        patients.map(p => ({ value: p.id, label: p.fullName })), 
        [patients]
    );

    const isInternalRegistration = useMemo(() => searchParams.get('source') === 'internal', [searchParams]);

    const formSchema = useMemo(() => {
        return patientFormSchema.refine(data => {
            if (!isInternalRegistration) {
                return data.consentGiven === true;
            }
            return true;
        }, {
            message: "Você deve ler e concordar com os termos para continuar.",
            path: ["consentGiven"],
        });
    }, [isInternalRegistration]);

    const form = useForm<PatientFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            healthConditions: [],
            contraindications: [],
            otherHealthIssues: "",
            dailyMedications: "",
            monjauroDose: "",
            monjauroTime: "",
            avatarUrl: "",
            indicationSource: 'no',
            indicationName: "",
            consentGiven: isInternalRegistration ? true : false,
            allergyDetails: "",
            serviceModel: 'presencial',
        }
    });
    
    useEffect(() => {
        form.reset({
            ...form.getValues(),
            consentGiven: isInternalRegistration ? true : false,
        });
    }, [isInternalRegistration, form]);

    useEffect(() => {
        if (isInternalRegistration) {
            setShowForm(true);
        }

        const storedLogo = localStorage.getItem('customLogo');
        if (storedLogo) {
          setLogoUrl(storedLogo);
        }
        const handleStorageChange = (event: StorageEvent) => {
          if (event.key === 'customLogo') {
            setLogoUrl(event.newValue);
          }
        };
        window.addEventListener('storage', handleStorageChange);

        return () => {
          window.removeEventListener('storage', handleStorageChange);
        };
    }, [isInternalRegistration]);


    const watchWeight = form.watch("initialWeight");
    const watchHeight = form.watch("height");
    const watchZip = form.watch("zip");
    const watchUsedMonjauro = form.watch("usedMonjauro");
    const watchIndicationSource = form.watch("indicationSource");
    const watchHealthConditions = form.watch("healthConditions");
    const watchBirthDate = form.watch("birthDate");
    const watchFullName = form.watch("fullName");

    useEffect(() => {
        if (watchFullName && watchFullName.length > 3) {
            const searchName = watchFullName.toLowerCase().trim();
            const found = patients.find(p => p.fullName.toLowerCase().trim().includes(searchName));
            setSimilarPatient(found || null);
        } else {
            setSimilarPatient(null);
        }
    }, [watchFullName, patients]);

    useEffect(() => {
        if (watchBirthDate) {
            const today = new Date();
            const birthDate = new Date(watchBirthDate);
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            form.setValue("age", age);
        }
    }, [watchBirthDate, form]);

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
                ?.map(id => {
                    const condition = healthConditions.find(c => c.id === id);
                    if (condition?.id === 'allergies' && data.allergyDetails) {
                        return `${condition.label}: ${data.allergyDetails}`;
                    }
                    return condition?.label;
                })
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
                ? { type: 'indicado' as const, name: data.indicationName, patientId: data.indicationPatientId }
                : undefined;

            const patientDataForApi = {
                fullName: data.fullName,
                birthDate: data.birthDate,
                initialWeight: data.initialWeight,
                height: data.height,
                age: data.age || 0,
                desiredWeight: data.desiredWeight || 0,
                serviceModel: data.serviceModel,
                address: {
                  zip: data.zip || '',
                  street: data.street || '',
                  number: data.number || '',
                  city: data.city || '',
                  state: data.state || '',
                },
                phone: data.phone || '',
                healthContraindications: fullContraindications || 'Nenhuma observação.',
                indication,
                firstDoseDate: data.firstDoseDate,
                avatarUrl: data.avatarUrl || '',
                dailyMedications: data.dailyMedications,
                oralContraceptive: data.oralContraceptive,
                usedMonjauro: data.usedMonjauro,
                monjauroDose: data.monjauroDose,
                monjauroTime: data.monjauroTime,
                consentGiven: data.consentGiven || false,
            };
            
            await addPatient(patientDataForApi);
            if (isInternalRegistration) {
                toast({
                    title: "Paciente Cadastrado!",
                    description: `${data.fullName} foi adicionado(a) com sucesso.`
                });
                router.push('/patients');
            } else {
                 router.push("/cadastro/sucesso");
            }
        } catch (error) {
            console.error("Failed to add patient", error);
             toast({
                variant: "destructive",
                title: "Erro ao Enviar",
                description: "Não foi possível realizar seu cadastro. Por favor, tente novamente.",
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


    const consentText = `Declaro, para todos os fins legais, que fui devidamente informado(a) e esclarecido(a) sobre o uso de Tirzepatida manipulada, prescrita de forma individualizada para fins terapêuticos relacionados ao acompanhamento de sobrepeso e obesidade, visando redução ponderal, melhora metabólica e otimização da saúde de acordo com minha avaliação clínica. Tenho ciência de que o produto utilizado é uma formulação magistral produzida por farmácia autorizada e regulada pelos órgãos de vigilância sanitária, não se caracterizando como Monjauro®, Mounjaro® ou qualquer medicamento industrializado de referência, genérico ou similar. Reconheço que formulações manipuladas podem apresentar diferenças inerentes ao processo produtivo e que a resposta clínica pode variar conforme condições individuais.

Fui esclarecido(a) quanto ao mecanismo de ação da Tirzepatida, agonista dos receptores GIP e GLP-1, responsável por atuar na modulação da regulação glicêmica, no aumento da saciedade, na redução da fome e na regulação metabólica, podendo promover redução de peso quando associada a orientação nutricional, mudanças de comportamento e acompanhamento clínico. Estou ciente de que a eficácia do protocolo depende do uso correto, de acompanhamento periódico e da adesão às recomendações profissionais, não havendo garantia absoluta de resultado, uma vez que a resposta pode variar de pessoa para pessoa.

Tenho total ciência dos possíveis riscos, eventos adversos e efeitos colaterais que podem ocorrer durante o uso da Tirzepatida, incluindo, mas não se limitando a náuseas, constipação, refluxo, diarreia, dor abdominal, perda de apetite, cefaleia, hipoglicemia em pacientes diabéticos, alterações gastrointestinais mais intensas, colelitíase, alterações no funcionamento pancreático e, em situações raras, quadros de pancreatite. Fui orientado(a) sobre a necessidade de comunicar imediatamente qualquer sintoma inesperado ou reação adversa ao profissional responsável.

Confirmo que forneci informações verdadeiras e completas sobre meu histórico de saúde, uso de medicamentos e condições pré-existentes. Entendo que a omissão de informações pode acarretar riscos à minha saúde e isento o profissional e a farmácia de manipulação de qualquer responsabilidade decorrente de informações omitidas ou falsas.

Autorizo, por livre e espontânea vontade, a prescrição e o início do protocolo com Tirzepatida manipulada, estando ciente de todos os termos aqui apresentados e comprometendo-me a seguir rigorosamente todas as orientações.`;

    if (!showForm) {
      return (
        <Card className="w-full max-w-lg text-center">
          <CardHeader>
            {logoUrl && (
                <div className="mx-auto h-24 flex items-center justify-center">
                    <Image src={logoUrl} alt="Logo" width={400} height={80} className="object-contain max-h-full"/>
                </div>
            )}
            <CardTitle className="text-3xl font-bold mt-4">Bem-vindo(a) à sua virada de chave.</CardTitle>
            <CardDescription>
              Vamos começar sua jornada de transformação. Preencha o formulário para que possamos personalizar seu acompanhamento.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setShowForm(true)} size="lg">
              Iniciar Cadastro <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      );
    }
    
    return (
        <Card className="w-full max-w-4xl">
            <CardHeader>
                <CardTitle>Ficha de Cadastro do Paciente</CardTitle>
                <CardDescription>Preencha os dados abaixo com atenção. Eles são essenciais para o seu acompanhamento.</CardDescription>
            </CardHeader>
            <CardContent>
                <TooltipProvider>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                             <div className="md:col-span-2 space-y-8">
                                <h3 className="text-lg font-semibold -mb-2">Informações Pessoais</h3>
                                <FormField control={form.control} name="fullName" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nome Completo</FormLabel>
                                        <FormControl><Input placeholder="Seu nome completo" {...field} /></FormControl>
                                        {similarPatient && (
                                            <Alert variant="destructive" className="mt-2">
                                                <AlertTriangle className="h-4 w-4" />
                                                <AlertTitle>Paciente já cadastrado?</AlertTitle>
                                                <AlertDescription>
                                                    Encontramos um paciente com nome parecido: <Link href={`/patients/${similarPatient.id}`} className="font-bold underline hover:text-destructive/80">{similarPatient.fullName}</Link>.
                                                    <br/>Verifique se este é o mesmo paciente antes de prosseguir com um novo cadastro.
                                                </AlertDescription>
                                            </Alert>
                                        )}
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField control={form.control} name="phone" render={({ field }) => (
                                    <FormItem><FormLabel>Telefone (WhatsApp)</FormLabel><FormControl><Input placeholder="(XX) XXXXX-XXXX" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
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
                                                <span className="text-sm mt-1">Foto de Perfil</span>
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
                                    Alterar Foto
                                </Button>
                                <FormMessage />
                            </FormItem>
                            )}/>
                         </div>
                         
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
                             <FormField
                                control={form.control}
                                name="birthDate"
                                render={({ field }) => (
                                <FormItem className="flex flex-col"><FormLabel>Data de Nascimento</FormLabel>
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
                                            <Calendar locale={ptBR} mode="single" selected={field.value} onSelect={field.onChange} initialFocus captionLayout="dropdown-buttons" fromYear={1930} toYear={new Date().getFullYear()} />
                                        </PopoverContent>
                                    </Popover>
                                <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="age" render={({ field }) => (
                                <FormItem><FormLabel>Idade</FormLabel><FormControl><Input type="number" placeholder="Sua idade" {...field} value={field.value ?? ''} disabled={!!watchBirthDate} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="height" render={({ field }) => (
                                <FormItem><FormLabel>Altura (cm)</FormLabel><FormControl><Input type="number" placeholder="Ex: 175" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="initialWeight" render={({ field }) => (
                                <FormItem><FormLabel>Peso Inicial (kg)</FormLabel><FormControl><Input type="number" step="0.1" placeholder="Ex: 85.5" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                            )}/>
                             <FormField control={form.control} name="desiredWeight" render={({ field }) => (
                                <FormItem><FormLabel>Meta de Peso (kg)</FormLabel><FormControl><Input type="number" step="0.1" placeholder="Ex: 70" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            {bmi !== null && (
                            <div className="space-y-2">
                                <Label>IMC (Índice de Massa Corporal)</Label>
                                <div className="flex h-10 w-full items-center justify-center rounded-md border border-input bg-muted px-3 py-2 text-sm">
                                    {bmi.toFixed(2)}
                                </div>
                            </div>
                            )}
                        </div>
                        
                        <FormField control={form.control} name="serviceModel" render={({ field }) => (
                            <FormItem className="space-y-3">
                                <FormLabel>Qual modelo de atendimento prefere?</FormLabel>
                                <FormControl>
                                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex items-center gap-6">
                                        <FormItem className="flex items-center space-x-3 space-y-0">
                                            <FormControl><RadioGroupItem value="presencial" /></FormControl>
                                            <FormLabel className="font-normal flex items-center gap-1.5">
                                                Presencial
                                                <Tooltip>
                                                    <TooltipTrigger type="button"><Info className="h-3 w-3 text-muted-foreground"/></TooltipTrigger>
                                                    <TooltipContent><p>Nosso acompanhamento completo. Inclui a aplicação da dose e a pesagem<br/>semanal em nosso espaço para um cuidado próximo e personalizado.</p></TooltipContent>
                                                </Tooltip>
                                            </FormLabel>
                                        </FormItem>
                                        <FormItem className="flex items-center space-x-3 space-y-0">
                                            <FormControl><RadioGroupItem value="online" /></FormControl>
                                            <FormLabel className="font-normal flex items-center gap-1.5">
                                                Online
                                                <Tooltip>
                                                    <TooltipTrigger type="button"><Info className="h-3 w-3 text-muted-foreground"/></TooltipTrigger>
                                                    <TooltipContent><p>Receba a dose em casa e faça a aplicação no seu tempo. Ideal para quem<br/>busca flexibilidade e já tem autonomia no processo.</p></TooltipContent>
                                                </Tooltip>
                                            </FormLabel>
                                        </FormItem>
                                        <FormItem className="flex items-center space-x-3 space-y-0">
                                            <FormControl><RadioGroupItem value="hibrido" /></FormControl>
                                            <FormLabel className="font-normal flex items-center gap-1.5">
                                                Híbrido
                                                <Tooltip>
                                                    <TooltipTrigger type="button"><Info className="h-3 w-3 text-muted-foreground"/></TooltipTrigger>
                                                    <TooltipContent><p>Você vem até nós para a aplicação da dose semanal, mas faz o<br/>acompanhamento do peso por conta própria. Une a segurança da<br/>aplicação profissional com a sua flexibilidade.</p></TooltipContent>
                                                </Tooltip>
                                            </FormLabel>
                                        </FormItem>
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                        
                         <div className="space-y-4 pt-6 border-t">
                            <h3 className="text-lg font-semibold">Avaliação de Saúde</h3>
                            
                            <FormField control={form.control} name="otherHealthIssues" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Você possui algum problema de saúde não listado abaixo?</FormLabel>
                                    <FormControl>
                                        <Textarea rows={3} placeholder="Liste problemas de saúde não mencionados, se houver." {...field} value={field.value ?? ''} />
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
                                            Selecione todas as condições que se aplicam a você.
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

                            {watchHealthConditions?.includes('allergies') && (
                                <FormField
                                    control={form.control}
                                    name="allergyDetails"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Especifique suas alergias</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Ex: Dipirona, frutos do mar" {...field} value={field.value ?? ''} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}

                            <FormField
                                control={form.control}
                                name="contraindications"
                                render={() => (
                                    <FormItem>
                                    <div className="mb-4">
                                        <FormLabel className="text-base">Contraindicações do Medicamento</FormLabel>
                                        <FormDescription>
                                            Marque se você possui alguma das contraindicações abaixo.
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
                                    <FormLabel>Quais medicamentos você toma todos os dias?</FormLabel>
                                    <FormControl>
                                        <Textarea rows={3} placeholder="Liste os medicamentos de uso contínuo." {...field} value={field.value ?? ''} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>

                            <FormField control={form.control} name="oralContraceptive" render={({ field }) => (
                                <FormItem className="space-y-3">
                                    <FormLabel>Faz uso de anticoncepcional oral?</FormLabel>
                                    <FormControl>
                                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex items-center gap-6">
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
                                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex items-center gap-6">
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
                                        <FormItem><FormLabel>Qual a dose?</FormLabel><FormControl><Input placeholder="Ex: 2.5mg" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="monjauroTime" render={({ field }) => (
                                        <FormItem><FormLabel>Há quanto tempo?</FormLabel><FormControl><Input placeholder="Ex: 3 meses" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                </div>
                            )}

                             <FormField control={form.control} name="indicationSource" render={({ field }) => (
                                <FormItem className="space-y-3">
                                    <FormLabel>Você foi indicado(a) por alguém?</FormLabel>
                                    <FormControl>
                                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex items-center gap-6">
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
                                <FormField control={form.control} name="indicationPatientId" render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Quem indicou você?</FormLabel>
                                        <Combobox 
                                            options={patientOptions}
                                            value={field.value}
                                            onChange={(value, label) => {
                                                field.onChange(value)
                                                form.setValue('indicationName', label)
                                            }}
                                            placeholder="Selecione o paciente que te indicou..."
                                            noResultsText="Nenhum paciente encontrado."
                                        />
                                        <FormDescription>Se não encontrar o nome na lista, digite-o.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                            )}

                        </div>
                        
                        {!isInternalRegistration && (
                            <div className="space-y-4 pt-6 border-t">
                                <h3 className="text-lg font-semibold">Termo de Consentimento Livre e Esclarecido</h3>
                                <div className="space-y-2">
                                    <ScrollArea className="h-40 w-full rounded-md border p-4 text-sm">
                                        {consentText}
                                    </ScrollArea>
                                    <FormField
                                        control={form.control}
                                        name="consentGiven"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center space-x-3 space-y-0 pt-2">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel className="font-normal">
                                                    Li e concordo com os termos de consentimento.
                                                </FormLabel>
                                                <FormMessage />
                                            </div>
                                            </FormItem>
                                        )}
                                        />
                                </div>
                            </div>
                        )}
                        
                        <div className="flex justify-end gap-2 pt-4">
                            <Button type="submit" disabled={isSubmitting || !form.formState.isValid} size="lg">
                                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Enviando...</> : isInternalRegistration ? 'Cadastrar Paciente' : 'Finalizar e Enviar Cadastro'}
                            </Button>
                        </div>
                    </form>
                </Form>
                </TooltipProvider>
            </CardContent>
        </Card>
    )
}

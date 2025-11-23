
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
import { User as UserIcon, Upload, Loader2, ArrowRight, CalendarIcon } from "lucide-react";
import { cn, calculateBmi } from "@/lib/utils";
import { useEffect, useState, Suspense } from "react";
import { useToast } from "@/hooks/use-toast";
import { addPatient } from "@/lib/actions";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import Image from "next/image";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
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


const patientFormSchema = z.object({
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
  consentGiven: z.boolean().refine((val) => val === true, {
    message: "Você deve ler e concordar com os termos para continuar.",
  }),
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

function PatientRegistrationForm() {
    const router = useRouter();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [bmi, setBmi] = useState<number | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [logoUrl, setLogoUrl] = useState<string | null>(null);

    useEffect(() => {
        const source = searchParams.get('source');
        if (source === 'internal') {
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
    }, [searchParams]);


    const form = useForm<PatientFormValues>({
        resolver: zodResolver(patientFormSchema),
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
            consentGiven: false,
            allergyDetails: "",
        }
    });

    const watchWeight = form.watch("initialWeight");
    const watchHeight = form.watch("height");
    const watchZip = form.watch("zip");
    const watchUsedMonjauro = form.watch("usedMonjauro");
    const watchIndicationSource = form.watch("indicationSource");
    const watchHealthConditions = form.watch("healthConditions");

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
                ? { type: 'indicado' as const, name: data.indicationName }
                : undefined;

            const patientDataForApi = {
                fullName: data.fullName,
                initialWeight: data.initialWeight,
                height: data.height,
                age: data.age || 0,
                desiredWeight: data.desiredWeight || 0,
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
                consentGiven: data.consentGiven
            };
            
            await addPatient(patientDataForApi);
            router.push("/cadastro/sucesso");
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


    const consentText = `Declaro, para todos os fins legais, que fui devidamente informado(a) e esclarecido(a) sobre o uso de Tirzepatida manipulada, prescrita de forma individualizada para fins terapêuticos relacionados ao tratamento de sobrepeso e obesidade, visando redução ponderal, melhora metabólica e otimização da saúde de acordo com minha avaliação clínica. Tenho ciência de que o produto utilizado é uma formulação magistral produzida por farmácia autorizada e regulada pelos órgãos de vigilância sanitária, não se caracterizando como Monjauro®, Mounjaro® ou qualquer medicamento industrializado de referência, genérico ou similar. Reconheço que formulações manipuladas podem apresentar diferenças inerentes ao processo produtivo e que a resposta clínica pode variar conforme condições individuais.

Fui esclarecido(a) quanto ao mecanismo de ação da Tirzepatida, agonista dos receptores GIP e GLP-1, responsável por atuar na modulação da regulação glicêmica, no aumento da saciedade, na redução da fome e na regulação metabólica, podendo promover redução de peso quando associada a orientação nutricional, mudanças de comportamento e acompanhamento clínico. Estou ciente de que a eficácia do tratamento depende do uso correto, de acompanhamento periódico e da adesão às recomendações profissionais, não havendo garantia absoluta de resultado, uma vez que a resposta pode variar de pessoa para pessoa.

Tenho total ciência dos possíveis riscos, eventos adversos e efeitos colaterais que podem ocorrer durante o uso da Tirzepatida, incluindo, mas não se limitando a náuseas, constipação, refluxo, diarreia, dor abdominal, perda de apetite, cefaleia, hipoglicemia em pacientes diabéticos, alterações gastrointestinais mais intensas, colelitíase, alterações no funcionamento pancreático e, em situações raras, quadros de pancreatite. Fui orientado(a) sobre a necessidade de comunicar imediatamente qualquer sintoma inesperado ou reação adversa durante o tratamento, bem como sobre a importância de realizar acompanhamento contínuo para monitoramento clínico seguro.

Declaro ter sido igualmente informado(a) sobre as contraindicações do uso da Tirzepatida, incluindo histórico pessoal ou familiar de carcinoma medular de tireoide, Síndrome de Neoplasia Endócrina Múltipla tipo 2, gestação, lactação, histórico de pancreatite ou outras condições clínicas que possam representar risco ao tratamento. Confirmo meu compromisso em informar prontamente caso eu me enquadre em alguma dessas condições antes ou durante a terapia.

Reconheço que a aquisição da medicação é de minha livre escolha junto à farmácia magistral habilitada, não configurando venda, revenda ou fornecimento de medicamento industrializado por parte do profissional prescritor. Tenho ciência de que o tratamento medicamentoso, isoladamente, não substitui hábitos de vida saudáveis, alimentação equilibrada ou atividade física regular, sendo esses fatores determinantes para o sucesso terapêutico.

Após receber todas as informações necessárias de forma clara, ética e técnica, declaro ter tido oportunidade de esclarecer dúvidas e compreendo plenamente os objetivos, riscos, limitações, responsabilidades e características do tratamento. Assim, manifesto meu consentimento livre, consciente e informado para uso da Tirzepatida manipulada e para início ou continuidade do acompanhamento clínico conforme indicação profissional, ciente de que posso solicitar sua interrupção a qualquer momento mediante comunicação ao profissional responsável.
    `;

    if (!showForm) {
        return (
            <Card className="w-full max-w-lg text-center">
                <CardHeader className="items-center">
                    {logoUrl ? (
                        <Image src={logoUrl} alt="FitDose Logo" width={150} height={60} className="object-contain h-16 mb-4"/>
                    ) : (
                        <h1 className="text-3xl font-bold text-primary mb-4">FitDose</h1>
                    )}
                    <CardTitle className="mt-4 text-2xl">Seja Bem-vindo(a)!</CardTitle>
                    <CardDescription>
                       Aqui começa sua experiência com a saúde e bem-estar. Clique abaixo para iniciar seu cadastro.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button size="lg" onClick={() => setShowForm(true)}>
                        Realizar Cadastro
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full max-w-4xl">
            <CardHeader>
                <CardTitle>Ficha de Cadastro</CardTitle>
                <CardDescription>Preencha seus dados abaixo para iniciar o acompanhamento.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                            <div className="md:col-span-2 space-y-8">
                                <h3 className="text-lg font-semibold -mb-2">Informações Pessoais</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <FormField control={form.control} name="fullName" render={({ field }) => (
                                        <FormItem><FormLabel>Nome Completo</FormLabel><FormControl><Input placeholder="Seu nome completo" {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="phone" render={({ field }) => (
                                        <FormItem><FormLabel>Telefone (WhatsApp) <span className="text-muted-foreground text-xs">(Opcional)</span></FormLabel><FormControl><Input placeholder="(XX) XXXXX-XXXX" {...field} /></FormControl><FormMessage /></FormItem>
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
                                                <span className="text-sm mt-1">Sua Foto <span className="text-muted-foreground text-xs">(Opcional)</span></span>
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
                                    Enviar Foto
                                </Button>
                                <FormMessage />
                            </FormItem>
                            )}/>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 items-end">
                            <FormField control={form.control} name="age" render={({ field }) => (
                                <FormItem><FormLabel>Idade <span className="text-muted-foreground text-xs">(Opcional)</span></FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="initialWeight" render={({ field }) => (
                                <FormItem><FormLabel>Seu Peso Atual (kg)</FormLabel><FormControl><Input type="number" step="0.1" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="height" render={({ field }) => (
                                <FormItem><FormLabel>Sua Altura (cm)</FormLabel><FormControl><Input type="number" placeholder="Ex: 175" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="desiredWeight" render={({ field }) => (
                                <FormItem><FormLabel>Sua Meta de Peso (kg) <span className="text-muted-foreground text-xs">(Opcional)</span></FormLabel><FormControl><Input type="number" step="0.1" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField
                                control={form.control}
                                name="firstDoseDate"
                                render={({ field }) => (
                                <FormItem className="flex flex-col"><FormLabel>Início do Tratamento <span className="text-muted-foreground text-xs">(Opcional)</span></FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                            <Button variant={"outline"} className={cn("pl-3 text-left font-normal h-10", !field.value && "text-muted-foreground")}>
                                                {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Data de hoje</span>}
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
                        
                        <h3 className="text-lg font-semibold border-t pt-6 -mb-2">Seu Endereço <span className="text-muted-foreground text-sm font-normal">(Opcional)</span></h3>
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField control={form.control} name="zip" render={({ field }) => (
                                <FormItem><FormLabel>CEP</FormLabel><FormControl><Input placeholder="00000-000" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                            )}/>
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField control={form.control} name="street" render={({ field }) => (
                                <FormItem className="col-span-2"><FormLabel>Rua</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="number" render={({ field }) => (
                                <FormItem><FormLabel>Número</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                            )}/>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="city" render={({ field }) => (
                                <FormItem><FormLabel>Cidade</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="state" render={({ field }) => (
                                <FormItem><FormLabel>Estado (UF)</FormLabel><FormControl><Input placeholder="Ex: SP" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                            )}/>
                        </div>

                         <div className="space-y-8 border-t pt-6">
                            <h3 className="text-lg font-semibold">Avaliação de Saúde <span className="text-muted-foreground text-sm font-normal">(Opcional)</span></h3>
                            
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

                             {watchHealthConditions?.includes('allergies') && (
                                <FormField
                                    control={form.control}
                                    name="allergyDetails"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Especifique suas alergias</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Ex: Dipirona, frutos do mar" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}

                            <Separator />

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
                                    <FormLabel>Quais medicamentos você toma todos os dias?</FormLabel>
                                    <FormControl>
                                        <Textarea rows={3} placeholder="Liste seus medicamentos de uso contínuo." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>

                            <FormField control={form.control} name="oralContraceptive" render={({ field }) => (
                                <FormItem className="space-y-3">
                                    <FormLabel>Você faz uso de anticoncepcional oral?</FormLabel>
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
                                    <FormLabel>Você já tomou este medicamento (ou similar) antes?</FormLabel>
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

                             <FormField control={form.control} name="indicationSource" render={({ field }) => (
                                <FormItem className="space-y-3">
                                    <FormLabel>Foi indicado(a) por alguém?</FormLabel>
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

                            {watchIndicationSource === 'yes' && (
                                <FormField control={form.control} name="indicationName" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Quem indicou?</FormLabel>
                                        <FormControl><Input placeholder="Nome de quem te indicou" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                            )}

                        </div>

                        <div className="space-y-6 border-t pt-6">
                            <h3 className="text-lg font-semibold">Termo de Consentimento</h3>
                            <div className="space-y-2">
                                <FormLabel>Termo de Consentimento para Uso de Tirzepatida Manipulada</FormLabel>
                                <ScrollArea className="h-60 w-full rounded-md border p-4 text-sm">
                                    <pre className="whitespace-pre-wrap font-sans">{consentText}</pre>
                                </ScrollArea>
                            </div>
                             <FormField
                                control={form.control}
                                name="consentGiven"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow">
                                    <FormControl>
                                        <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                        <FormLabel>
                                        Li e concordo com os termos.
                                        </FormLabel>
                                        <FormDescription>
                                        Ao marcar esta caixa, você confirma que leu e concorda com o Termo de Consentimento.
                                        </FormDescription>
                                         <FormMessage />
                                    </div>
                                    </FormItem>
                                )}
                            />
                        </div>
                        
                        <div className="flex justify-end gap-2 pt-4 border-t">
                            <Button type="submit" disabled={isSubmitting} size="lg">
                                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Enviando Cadastro...</> : 'Finalizar Cadastro'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    )
}

export default function PatientRegistrationPage() {
    return (
        <Suspense fallback={<div>Carregando...</div>}>
            <PatientRegistrationForm />
        </Suspense>
    )
}

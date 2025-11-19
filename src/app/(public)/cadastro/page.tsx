
'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
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
import { CalendarIcon, User as UserIcon, Upload, Loader2 } from "lucide-react";
import { cn, calculateBmi } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { addPatient } from "@/lib/actions";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import Image from "next/image";
import { ScrollArea } from "@/components/ui/scroll-area";

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
});

type PatientFormValues = z.infer<typeof patientFormSchema>;

export default function PatientRegistrationPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [bmi, setBmi] = useState<number | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

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
            consentGiven: false,
        }
    });

    const watchFullName = form.watch("fullName");
    const watchWeight = form.watch("initialWeight");
    const watchHeight = form.watch("height");
    const watchZip = form.watch("zip");
    const watchUsedMonjauro = form.watch("usedMonjauro");

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
            };
            
            const { otherHealthIssues, ...finalPatientData } = patientDataForApi as any; // remove temp fields

            await addPatient(finalPatientData);
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


    const consentText = `
Eu, ${watchFullName || '______________________'}, declaro, para todos os fins legais, que fui devidamente informado(a) e esclarecido(a) acerca do uso de Tirzepatida manipulada, medicamento prescrito de forma individualizada para fins terapêuticos relacionados ao tratamento de sobrepeso e obesidade, com objetivo de redução ponderal, melhora metabólica e promoção de saúde de acordo com a minha necessidade clínica.

Declaro ter plena ciência de que o produto prescrito trata-se de formulação magistral produzida por farmácia regularizada perante os órgãos competentes, não se caracterizando como Monjauro®, Mounjaro® ou qualquer outro medicamento industrializado de referência, genérico ou similar. Tenho conhecimento de que a manipulação magistral segue parâmetros técnicos permitidos pela legislação sanitária vigente, porém pode apresentar variações inerentes ao processo produtivo, bem como respostas terapêuticas distintas conforme características individuais do paciente.

Fui informado(a) de maneira clara, ética e compreensível sobre o mecanismo de ação da Tirzepatida, agonista dos receptores GIP e GLP-1, o qual atua na modulação da glicemia, saciedade e resposta metabólica, podendo favorecer redução de peso quando associado a acompanhamento clínico, orientação nutricional e mudanças no estilo de vida. Declaro ciência de que a eficácia do tratamento depende não apenas do medicamento, mas também da adesão às recomendações profissionais, retorno às consultas e acompanhamento periódico.

Reconheço que fui devidamente orientado(a) sobre os possíveis riscos e efeitos adversos relacionados ao uso da Tirzepatida manipulada, incluindo náuseas, desconforto abdominal, constipação, diarreia, refluxo, redução do apetite, cefaleia, hipoglicemia (especialmente em pacientes diabéticos em uso concomitante de outras terapias), colelitíase, alteração de enzimas hepáticas e, em casos raros, pancreatite ou complicações gastrointestinais graves. Declaro ter sido orientado(a) sobre a necessidade de comunicar imediatamente ao profissional responsável qualquer alteração inesperada ou evento adverso após o início do tratamento.

Também afirmo ter sido informado(a) sobre as contraindicações formais ao uso do medicamento, incluindo histórico pessoal ou familiar de carcinoma medular de tireoide, Síndrome de Neoplasia Endócrina Múltipla tipo 2 (MEN2), gestação, lactação, pancreatite prévia ou outras condições que representem risco ao paciente. Comprometo-me a comunicar prontamente caso eu me enquadre em qualquer dessas condições agora ou no decorrer do tratamento.

Declaro estar ciente de que o uso da Tirzepatida manipulada ocorre sob prescrição individualizada, adquirida por minha iniciativa junto à farmácia magistral autorizada, não havendo comercialização, revenda ou fornecimento de medicamento industrializado pelo profissional prescritor. Reconheço que não há garantia absoluta de resultados, uma vez que a resposta terapêutica é individual e depende de fatores clínicos, metabólicos e comportamentais específicos.

Após receber todas as explicações necessárias, tive oportunidade para esclarecimento de dúvidas e, consciente dos benefícios, riscos e responsabilidades envolvidos, manifesto meu consentimento livre, claro, voluntário e informado para início e continuidade do tratamento, podendo solicitar sua interrupção a qualquer momento mediante comunicação ao profissional responsável.

Por ser expressão de minha vontade, firmo o presente Termo de Consentimento, para produzir seus efeitos legais.
    `;

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
                                                <span className="text-sm mt-1">Sua Foto</span>
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
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <FormField control={form.control} name="age" render={({ field }) => (
                                <FormItem><FormLabel>Idade</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="initialWeight" render={({ field }) => (
                                <FormItem><FormLabel>Seu Peso Atual (kg)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="height" render={({ field }) => (
                                <FormItem><FormLabel>Sua Altura (cm)</FormLabel><FormControl><Input type="number" placeholder="Ex: 175" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="desiredWeight" render={({ field }) => (
                                <FormItem><FormLabel>Sua Meta de Peso (kg)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>
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
                        
                        <h3 className="text-lg font-semibold border-t pt-6 -mb-2">Seu Endereço</h3>
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

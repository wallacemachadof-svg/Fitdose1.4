
'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useEffect, useState } from "react";

import { getPatients, addBioimpedanceEntry, type Patient } from "@/lib/actions";
import { analyzeBioimpedanceImage } from '@/ai/flows/analyze-bioimpedance-flow';
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { CalendarIcon, Loader2, Sparkles, Upload, Image as ImageIcon } from "lucide-react";

const bioimpedanceFormSchema = z.object({
  patientId: z.string({ required_error: "Selecione um paciente." }),
  date: z.date({ required_error: "A data da pesagem é obrigatória." }),
  photoDataUri: z.string({ required_error: "A foto da bioimpedância é obrigatória." }),
});

type BioimpedanceFormValues = z.infer<typeof bioimpedanceFormSchema>;

export default function BioimpedancePage() {
    const router = useRouter();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    useEffect(() => {
        const fetchPatients = async () => {
            const data = await getPatients();
            setPatients(data);
        }
        fetchPatients();
    }, []);

    const patientOptions = patients.map(p => ({ value: p.id, label: p.fullName }));

    const form = useForm<BioimpedanceFormValues>({
        resolver: zodResolver(bioimpedanceFormSchema),
        defaultValues: {
            date: new Date(),
        }
    });

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const dataUrl = reader.result as string;
                setImagePreview(dataUrl);
                form.setValue("photoDataUri", dataUrl);
            };
            reader.readAsDataURL(file);
        }
    };

    async function onSubmit(data: BioimpedanceFormValues) {
        setIsSubmitting(true);
        try {
            // 1. Analyze image with AI
            const analysisResult = await analyzeBioimpedanceImage({ photoDataUri: data.photoDataUri });

            // 2. Save the extracted data
            await addBioimpedanceEntry(data.patientId, data.date, analysisResult);

            toast({
                title: "Bioimpedância Adicionada!",
                description: "Os dados foram analisados e salvos no perfil do paciente.",
            });
            
            router.push(`/patients/${data.patientId}`);
            router.refresh();

        } catch (error) {
            console.error("Failed to add bioimpedance entry", error);
            toast({
                variant: "destructive",
                title: "Erro ao Salvar",
                description: "Não foi possível analisar a imagem ou salvar os dados. Tente novamente.",
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Card className="max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>Adicionar Bioimpedância</CardTitle>
                <CardDescription>Faça o upload da imagem da balança para a IA extrair e salvar os dados automaticamente.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <FormField
                            control={form.control}
                            name="patientId"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Paciente</FormLabel>
                                    <Combobox
                                        options={patientOptions}
                                        value={field.value}
                                        onChange={(value) => form.setValue("patientId", value)}
                                        placeholder="Selecione o paciente..."
                                        noResultsText="Nenhum paciente encontrado."
                                    />
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        
                         <FormField control={form.control} name="date" render={({ field }) => (
                            <FormItem className="flex flex-col"><FormLabel>Data da Pesagem</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                        <Button variant={"outline"} className={cn("pl-3 text-left font-normal w-full sm:w-64", !field.value && "text-muted-foreground")}>
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

                         <FormField
                            control={form.control}
                            name="photoDataUri"
                            render={({ field }) => (
                                <FormItem>
                                     <FormLabel>Foto do App da Balança</FormLabel>
                                      <FormControl>
                                        <div>
                                            <input
                                                id="bioimpedance-photo"
                                                type="file"
                                                className="hidden"
                                                accept="image/*"
                                                onChange={handleImageChange}
                                            />
                                            <label htmlFor="bioimpedance-photo" className="cursor-pointer">
                                                <div className="w-full aspect-video rounded-lg border-2 border-dashed bg-muted/50 flex flex-col items-center justify-center text-muted-foreground hover:border-primary transition-colors">
                                                     {imagePreview ? (
                                                        <Image src={imagePreview} alt="Preview da bioimpedância" width={200} height={112} className="object-contain max-h-full" />
                                                     ) : (
                                                        <>
                                                            <ImageIcon className="h-10 w-10 mb-2" />
                                                            <span>Clique para selecionar a imagem</span>
                                                        </>
                                                     )}
                                                </div>
                                            </label>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        
                        <div className="flex justify-end pt-4">
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Analisando e Salvando...</> : <><Sparkles className="mr-2 h-4 w-4"/> Analisar e Salvar</>}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    )
}

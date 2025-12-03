
'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Combobox } from "@/components/ui/combobox";
import { useToast } from "@/hooks/use-toast";
import { getPatients, getSettings, addHofProcedure, type Patient, type HofProcedure, type HofProduct } from "@/lib/actions";
import { Loader2, PlusCircle, Trash2, CalendarIcon, Upload, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Image from "next/image";

const productUsedSchema = z.object({
  productName: z.string().min(1, "Selecione um produto."),
  quantityUsed: z.coerce.number().min(0.1, "A quantidade deve ser maior que zero."),
});

const hofProcedureFormSchema = z.object({
  patientId: z.string({ required_error: 'Selecione um paciente.' }),
  date: z.date({ required_error: 'A data do procedimento é obrigatória.' }),
  procedureName: z.string().min(1, "Selecione um procedimento."),
  price: z.coerce.number().min(0, "O preço deve ser um valor positivo."),
  areas: z.string().min(3, "Descreva as áreas de aplicação."),
  productsUsed: z.array(productUsedSchema).min(1, "Adicione pelo menos um produto."),
  photos: z.object({
    before: z.string().optional(),
    after: z.string().optional(),
  }).optional(),
  notes: z.string().optional(),
  followUpDate: z.date().optional(),
});

type HofProcedureFormValues = z.infer<typeof hofProcedureFormSchema>;

export default function HofProceduresPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [patients, setPatients] = useState<{ value: string; label: string }[]>([]);
  const [procedures, setProcedures] = useState<HofProcedure[]>([]);
  const [products, setProducts] = useState<HofProduct[]>([]);
  
  const [beforeImagePreview, setBeforeImagePreview] = useState<string | null>(null);
  const [afterImagePreview, setAfterImagePreview] = useState<string | null>(null);

  const form = useForm<HofProcedureFormValues>({
    resolver: zodResolver(hofProcedureFormSchema),
    defaultValues: {
      date: new Date(),
      productsUsed: [{ productName: "", quantityUsed: 1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "productsUsed",
  });

  const watchProcedureName = form.watch("procedureName");

  useEffect(() => {
    async function fetchInitialData() {
      const [patientsData, settingsData] = await Promise.all([
        getPatients(),
        getSettings(),
      ]);
      setPatients(patientsData.map(p => ({ value: p.id, label: p.fullName })));
      setProcedures(settingsData.hofProcedures || []);
      setProducts(settingsData.hofProducts || []);
    }
    fetchInitialData();
  }, []);

  useEffect(() => {
    const procedure = procedures.find(p => p.name === watchProcedureName);
    if (procedure) {
      form.setValue("price", procedure.price);
    }
  }, [watchProcedureName, procedures, form]);
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        if (type === 'before') {
          setBeforeImagePreview(dataUrl);
          form.setValue("photos.before", dataUrl);
        } else {
          setAfterImagePreview(dataUrl);
          form.setValue("photos.after", dataUrl);
        }
      };
      reader.readAsDataURL(file);
    }
  };


  async function onSubmit(data: HofProcedureFormValues) {
    setIsSubmitting(true);
    try {
      await addHofProcedure(data.patientId, data);
      toast({
        title: "Procedimento Registrado!",
        description: "O novo procedimento HOF foi salvo no histórico do paciente.",
      });
      router.push(`/patients/${data.patientId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Não foi possível salvar. Tente novamente.";
      toast({ variant: "destructive", title: "Erro ao Salvar", description: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
       <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
                <ClipboardList className="h-6 w-6 text-primary" />
                Registrar Procedimento HOF
            </h1>
            <p className="text-muted-foreground">
              Preencha os detalhes do procedimento realizado.
            </p>
        </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader><CardTitle>Informações Gerais</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField control={form.control} name="patientId" render={({ field }) => (
                <FormItem><FormLabel>Paciente *</FormLabel><Combobox options={patients} value={field.value} onChange={(value) => field.onChange(value)} placeholder="Selecione..." noResultsText="Nenhum paciente encontrado."/><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="date" render={({ field }) => (
                <FormItem><FormLabel>Data do Procedimento *</FormLabel>
                  <Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Escolha a data</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar locale={ptBR} mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover>
                <FormMessage /></FormItem>
              )}/>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Detalhes do Procedimento</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="procedureName" render={({ field }) => (
                  <FormItem><FormLabel>Procedimento Realizado *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl><SelectContent>{procedures.map(p => <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="price" render={({ field }) => (
                  <FormItem><FormLabel>Valor Cobrado (R$) *</FormLabel><FormControl><Input type="number" step="0.01" placeholder="Ex: 800.00" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
              </div>
              <FormField control={form.control} name="areas" render={({ field }) => (
                <FormItem><FormLabel>Áreas de Aplicação *</FormLabel><FormControl><Textarea placeholder="Ex: Glabela, terço superior da testa, orbicular dos olhos (pés de galinha)" {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Produtos Utilizados</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-end gap-4 p-4 border rounded-lg">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name={`productsUsed.${index}.productName`} render={({ field }) => (
                      <FormItem><FormLabel>Produto</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl><SelectContent>{products.map(p => <SelectItem key={p.name} value={p.name}>{p.name} ({p.unit})</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                    )}/>
                     <FormField control={form.control} name={`productsUsed.${index}.quantityUsed`} render={({ field }) => (
                      <FormItem><FormLabel>Quantidade Utilizada</FormLabel><FormControl><Input type="number" step="0.1" placeholder="Ex: 50" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                  </div>
                  <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => append({ productName: "", quantityUsed: 1 })}><PlusCircle className="h-4 w-4 mr-2"/>Adicionar Produto</Button>
            </CardContent>
          </Card>
          
           <Card>
            <CardHeader><CardTitle>Registro Fotográfico</CardTitle><CardDescription>Adicione as fotos de antes e depois.</CardDescription></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label>Foto "Antes"</Label>
                     <div className="w-full aspect-square flex items-center justify-center rounded-md border-2 border-dashed bg-muted/50 p-2 relative">
                        {beforeImagePreview ? <Image src={beforeImagePreview} alt="Preview" layout="fill" className="object-contain rounded-md" /> : <Camera className="h-16 w-16 text-muted-foreground" />}
                    </div>
                    <Button asChild variant="outline" className="w-full" type="button"><label htmlFor="before-upload" className="cursor-pointer"><Upload className="mr-2 h-4 w-4" />Enviar Foto "Antes"</label></Button>
                    <Input id="before-upload" type="file" className="hidden" accept="image/*" onChange={(e) => handleImageChange(e, 'before')} />
                </div>
                 <div className="space-y-2">
                    <Label>Foto "Depois"</Label>
                     <div className="w-full aspect-square flex items-center justify-center rounded-md border-2 border-dashed bg-muted/50 p-2 relative">
                        {afterImagePreview ? <Image src={afterImagePreview} alt="Preview" layout="fill" className="object-contain rounded-md" /> : <Camera className="h-16 w-16 text-muted-foreground" />}
                    </div>
                    <Button asChild variant="outline" className="w-full" type="button"><label htmlFor="after-upload" className="cursor-pointer"><Upload className="mr-2 h-4 w-4" />Enviar Foto "Depois"</label></Button>
                    <Input id="after-upload" type="file" className="hidden" accept="image/*" onChange={(e) => handleImageChange(e, 'after')} />
                </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Observações e Próximos Passos</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Observações Clínicas</FormLabel><FormControl><Textarea placeholder="Intercorrências, recomendações pós-procedimento, etc." {...field} rows={5} /></FormControl><FormMessage /></FormItem>
              )}/>
               <FormField control={form.control} name="followUpDate" render={({ field }) => (
                <FormItem className="flex flex-col"><FormLabel>Data do Retorno</FormLabel>
                  <Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Escolha a data</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar locale={ptBR} mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover>
                <FormMessage /></FormItem>
              )}/>
            </CardContent>
          </Card>

          <div className="flex justify-end pt-4">
            <Button type="submit" size="lg" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Salvando...</> : 'Salvar Procedimento'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

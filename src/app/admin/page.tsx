
'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import * as z from "zod";
import { useState, useEffect } from "react";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Loader2, Upload, Trash2, PlusCircle, Save, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getSettings, updateSettings, type Settings } from "@/lib/actions";
import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const dosePriceSchema = z.object({
  dose: z.string().min(1, "A dose é obrigatória."),
  price: z.coerce.number().min(0, "O preço deve ser um valor positivo."),
});

const hofProcedureSchema = z.object({
    name: z.string().min(1, "O nome do procedimento é obrigatório."),
    price: z.coerce.number().min(0, "O preço deve ser um valor positivo."),
});

const hofProductSchema = z.object({
    name: z.string().min(1, "O nome do produto é obrigatório."),
    cost: z.coerce.number().min(0, "O custo deve ser um valor positivo."),
    unit: z.string().min(1, "A unidade é obrigatória (ex: frasco, seringa)."),
});

const settingsFormSchema = z.object({
  dosePrices: z.array(dosePriceSchema),
  dailyLateFee: z.coerce.number().min(0, "A multa deve ser um valor positivo.").optional(),
  hofProcedures: z.array(hofProcedureSchema).optional(),
  hofProducts: z.array(hofProductSchema).optional(),
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

export default function AdminPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Logo state
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoHeight, setLogoHeight] = useState<number>(50);

  // Letterhead state
  const [letterheadPreview, setLetterheadPreview] = useState<string | null>(null);
  const [marginTop, setMarginTop] = useState<number>(100);
  const [marginBottom, setMarginBottom] = useState<number>(100);

  const [improvements, setImprovements] = useState('');
  const [isSavingImprovements, setIsSavingImprovements] = useState(false);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      dosePrices: [],
      dailyLateFee: 0,
      hofProcedures: [],
      hofProducts: [],
    }
  });

  const { fields: doseFields, append: appendDose, remove: removeDose } = useFieldArray({
    control: form.control,
    name: "dosePrices",
  });

  const { fields: procedureFields, append: appendProcedure, remove: removeProcedure } = useFieldArray({
    control: form.control,
    name: "hofProcedures",
  });

  const { fields: productFields, append: appendProduct, remove: removeProduct } = useFieldArray({
    control: form.control,
    name: "hofProducts",
  });

  useEffect(() => {
    async function loadSettings() {
      setLoading(true);
      try {
        const settings = await getSettings();
        if (settings) {
            form.reset({
                dosePrices: settings.dosePrices || [],
                dailyLateFee: settings.dailyLateFee || 0,
                hofProcedures: settings.hofProcedures || [],
                hofProducts: settings.hofProducts || [],
            });
        }
        // Load logo
        setLogoPreview(localStorage.getItem('customLogo'));
        setLogoHeight(parseInt(localStorage.getItem('customLogoHeight') || '50', 10));

        // Load letterhead
        setLetterheadPreview(localStorage.getItem('customLetterhead'));
        setMarginTop(parseInt(localStorage.getItem('letterheadMarginTop') || '100', 10));
        setMarginBottom(parseInt(localStorage.getItem('letterheadMarginBottom') || '100', 10));

        setImprovements(localStorage.getItem('systemImprovements') || '');

      } catch (error) {
        console.error("Failed to load settings:", error);
        toast({
            variant: "destructive",
            title: "Erro ao carregar configurações",
        })
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, [form, toast]);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'letterhead') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        if (type === 'logo') {
          setLogoPreview(dataUrl);
          localStorage.setItem('customLogo', dataUrl);
          window.dispatchEvent(new Event('logo-updated'));
          toast({ title: "Logotipo Atualizado!" });
        } else {
          setLetterheadPreview(dataUrl);
          localStorage.setItem('customLetterhead', dataUrl);
          window.dispatchEvent(new Event('letterhead-updated'));
          toast({ title: "Papel Timbrado Atualizado!" });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const commitSliderValue = (value: number[], storageKey: string, eventName: string, toastTitle: string) => {
    localStorage.setItem(storageKey, value[0].toString());
    window.dispatchEvent(new Event(eventName));
    toast({ title: toastTitle });
  }

  async function onSubmit(data: SettingsFormValues) {
    setIsSubmitting(true);
    try {
      await updateSettings(data);
      toast({
        title: "Configurações Salvas!",
        description: "Suas configurações foram atualizadas com sucesso.",
      });
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast({
        variant: "destructive",
        title: "Erro ao Salvar",
        description: "Não foi possível salvar as configurações.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Administrador</h1>
                <p className="text-muted-foreground">Gerencie as configurações globais do sistema.</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Skeleton className="h-64" />
                <Skeleton className="h-80" />
            </div>
        </div>
    )
  }

  return (
    <div className="space-y-6">
        <div>
            <h1 className="text-2xl font-bold">Administrador</h1>
            <p className="text-muted-foreground">Gerencie as configurações globais do sistema.</p>
        </div>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Logotipo</CardTitle>
                            <CardDescription>Altere o logotipo que aparece no topo do menu e nas páginas públicas.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center gap-4">
                            <div className="w-full h-32 flex items-center justify-center rounded-md border border-dashed bg-muted/50 p-2">
                                {logoPreview ? <Image src={logoPreview} alt="Logo Preview" width={400} height={logoHeight} className="object-contain" style={{ height: `${logoHeight}px`}} /> : <span className="text-sm text-muted-foreground">Sem logotipo</span>}
                            </div>
                            <div className="w-full space-y-4">
                                <div className="space-y-2"><Label htmlFor="logo-size">Ajustar Altura</Label><Slider id="logo-size" min={20} max={200} step={1} value={[logoHeight]} onValueChange={(v) => setLogoHeight(v[0])} onValueCommit={(v) => commitSliderValue(v, 'customLogoHeight', 'logo-updated', "Tamanho do logotipo salvo!")} /></div>
                                <div className="flex gap-2"><Button asChild variant="outline" className="flex-1" type="button"><label htmlFor="logo-upload" className="cursor-pointer"><Upload className="mr-2 h-4 w-4" />Alterar Logotipo</label></Button><Input id="logo-upload" type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'logo')} />{logoPreview && (<Button type="button" variant="destructive" size="icon" onClick={() => { localStorage.removeItem('customLogo'); localStorage.removeItem('customLogoHeight'); setLogoPreview(null); setLogoHeight(50); window.dispatchEvent(new Event('logo-updated')); toast({ title: "Logotipo Removido" }); }}><Trash2 className="h-4 w-4"/></Button>)}</div>
                            </div>
                        </CardContent>
                    </Card>
                    
                     <Card>
                        <CardHeader>
                            <CardTitle>Papel Timbrado</CardTitle>
                            <CardDescription>Envie a imagem de fundo para prescrições e ajuste as margens.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center gap-4">
                            <div className="w-full h-32 flex items-center justify-center rounded-md border border-dashed bg-muted/50 p-2 overflow-hidden">
                                {letterheadPreview ? <Image src={letterheadPreview} alt="Papel Timbrado Preview" width={200} height={128} className="object-cover w-full h-full" /> : <span className="text-sm text-muted-foreground">Sem papel timbrado</span>}
                            </div>
                            <div className="w-full space-y-4">
                                <div className="space-y-2"><Label htmlFor="margin-top">Margem Superior (pixels): {marginTop}px</Label><Slider id="margin-top" min={0} max={400} step={10} value={[marginTop]} onValueChange={(v) => setMarginTop(v[0])} onValueCommit={(v) => commitSliderValue(v, 'letterheadMarginTop', 'letterhead-updated', "Margem superior salva!")} /></div>
                                <div className="space-y-2"><Label htmlFor="margin-bottom">Margem Inferior (pixels): {marginBottom}px</Label><Slider id="margin-bottom" min={0} max={400} step={10} value={[marginBottom]} onValueChange={(v) => setMarginBottom(v[0])} onValueCommit={(v) => commitSliderValue(v, 'letterheadMarginBottom', 'letterhead-updated', "Margem inferior salva!")} /></div>
                                <div className="flex gap-2"><Button asChild variant="outline" className="flex-1" type="button"><label htmlFor="letterhead-upload" className="cursor-pointer"><Upload className="mr-2 h-4 w-4" />Alterar Imagem</label></Button><Input id="letterhead-upload" type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'letterhead')} />{letterheadPreview && (<Button type="button" variant="destructive" size="icon" onClick={() => { localStorage.removeItem('customLetterhead'); localStorage.removeItem('letterheadMarginTop'); localStorage.removeItem('letterheadMarginBottom'); setLetterheadPreview(null); setMarginTop(100); setMarginBottom(100); window.dispatchEvent(new Event('letterhead-updated')); toast({ title: "Papel Timbrado Removido" }); }}><Trash2 className="h-4 w-4"/></Button>)}</div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="flex flex-col">
                        <CardHeader>
                            <CardTitle>Lista de Melhorias</CardTitle>
                            <CardDescription>Anote aqui os erros, bugs e ideias de melhorias para o sistema.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow">
                            <Textarea className="h-full resize-none" placeholder="Ex: Corrigir cálculo de IMC na tela de cadastro..." value={improvements} onChange={(e) => setImprovements(e.target.value)} />
                        </CardContent>
                        <CardFooter className="justify-end">
                            <Button type="button" onClick={() => { localStorage.setItem('systemImprovements', improvements); toast({ title: 'Lista de melhorias salva!' }); }} disabled={isSavingImprovements}>
                                {isSavingImprovements ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Salvando...</> : <><Save className="mr-2 h-4 w-4" /> Salvar Lista</>}
                            </Button>
                        </CardFooter>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Configurações de Emagrecimento</CardTitle>
                            <CardDescription>Defina os preços das doses de Mounjaro e multas.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="max-w-xs">
                                 <FormField control={form.control} name="dailyLateFee" render={({ field }) => (<FormItem><FormLabel>Multa por Atraso (R$ / dia)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="Ex: 1.00" {...field} /></FormControl><FormDescription>Valor a ser cobrado por cada dia de atraso no pagamento.</FormDescription><FormMessage /></FormItem>)} />
                            </div>
                             <div>
                                <h3 className="text-md font-semibold">Tabela de Preços por Dose</h3>
                                <Table>
                                    <TableHeader><TableRow><TableHead>Dose (mg)</TableHead><TableHead>Preço (R$)</TableHead><TableHead className="text-right">Ação</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {doseFields.map((field, index) => (
                                            <TableRow key={field.id}>
                                                <TableCell><FormField control={form.control} name={`dosePrices.${index}.dose`} render={({ field }) => (<FormItem><FormControl><Input placeholder="Ex: 2.5" {...field} /></FormControl><FormMessage /></FormItem>)} /></TableCell>
                                                <TableCell><FormField control={form.control} name={`dosePrices.${index}.price`} render={({ field }) => (<FormItem><FormControl><Input type="number" step="0.01" placeholder="Ex: 220.00" {...field} /></FormControl><FormMessage /></FormItem>)} /></TableCell>
                                                <TableCell className="text-right"><Button type="button" variant="ghost" size="icon" onClick={() => removeDose(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => appendDose({ dose: "", price: 0 })}><PlusCircle className="h-4 w-4 mr-2" />Adicionar Dose</Button>
                             </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Configurações de Estética (HOF)</CardTitle>
                            <CardDescription>Cadastre os procedimentos e produtos utilizados nos tratamentos de HOF.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                           <div>
                                <h3 className="text-md font-semibold">Procedimentos de HOF</h3>
                                <Table>
                                    <TableHeader><TableRow><TableHead>Nome do Procedimento</TableHead><TableHead>Preço (R$)</TableHead><TableHead className="text-right">Ação</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {procedureFields.map((field, index) => (
                                            <TableRow key={field.id}>
                                                <TableCell><FormField control={form.control} name={`hofProcedures.${index}.name`} render={({ field }) => (<FormItem><FormControl><Input placeholder="Ex: Botox - 1 Área" {...field} /></FormControl><FormMessage /></FormItem>)} /></TableCell>
                                                <TableCell><FormField control={form.control} name={`hofProcedures.${index}.price`} render={({ field }) => (<FormItem><FormControl><Input type="number" step="0.01" placeholder="Ex: 800.00" {...field} /></FormControl><FormMessage /></FormItem>)} /></TableCell>
                                                <TableCell className="text-right"><Button type="button" variant="ghost" size="icon" onClick={() => removeProcedure(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => appendProcedure({ name: "", price: 0 })}><PlusCircle className="h-4 w-4 mr-2" />Adicionar Procedimento</Button>
                           </div>
                           <div className="pt-4">
                                <h3 className="text-md font-semibold">Produtos de HOF</h3>
                                <Table>
                                    <TableHeader><TableRow><TableHead>Nome do Produto</TableHead><TableHead>Custo (R$)</TableHead><TableHead>Unidade</TableHead><TableHead className="text-right">Ação</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {productFields.map((field, index) => (
                                            <TableRow key={field.id}>
                                                <TableCell><FormField control={form.control} name={`hofProducts.${index}.name`} render={({ field }) => (<FormItem><FormControl><Input placeholder="Ex: Toxina Dysport" {...field} /></FormControl><FormMessage /></FormItem>)} /></TableCell>
                                                <TableCell><FormField control={form.control} name={`hofProducts.${index}.cost`} render={({ field }) => (<FormItem><FormControl><Input type="number" step="0.01" placeholder="Ex: 600.00" {...field} /></FormControl><FormMessage /></FormItem>)} /></TableCell>
                                                <TableCell><FormField control={form.control} name={`hofProducts.${index}.unit`} render={({ field }) => (<FormItem><FormControl><Input placeholder="frasco" {...field} /></FormControl><FormMessage /></FormItem>)} /></TableCell>
                                                <TableCell className="text-right"><Button type="button" variant="ghost" size="icon" onClick={() => removeProduct(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => appendProduct({ name: "", cost: 0, unit: "frasco" })}><PlusCircle className="h-4 w-4 mr-2" />Adicionar Produto</Button>
                           </div>
                        </CardContent>
                    </Card>
                </div>
                 <div className="flex justify-end pt-4 lg:col-span-3">
                    <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
                        {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : 'Salvar Todas as Configurações'}
                    </Button>
                </div>
            </form>
        </Form>
    </div>
  )
}

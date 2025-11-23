
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

const settingsFormSchema = z.object({
  dosePrices: z.array(dosePriceSchema),
  dailyLateFee: z.coerce.number().min(0, "A multa deve ser um valor positivo.").optional(),
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

export default function AdminPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoHeight, setLogoHeight] = useState<number>(50);
  const [improvements, setImprovements] = useState('');
  const [isSavingImprovements, setIsSavingImprovements] = useState(false);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      dosePrices: [],
      dailyLateFee: 0,
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "dosePrices",
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
            });
        }
        const storedLogo = localStorage.getItem('customLogo');
        if (storedLogo) {
            setLogoPreview(storedLogo);
        }
        const storedHeight = localStorage.getItem('customLogoHeight');
        if (storedHeight) {
            setLogoHeight(parseInt(storedHeight, 10));
        }
        const savedImprovements = localStorage.getItem('systemImprovements');
        if (savedImprovements) {
            setImprovements(savedImprovements);
        }
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setLogoPreview(dataUrl);
        localStorage.setItem('customLogo', dataUrl);
        toast({
          title: "Logotipo Atualizado!",
          description: "O novo logotipo foi salvo localmente e será exibido na aplicação.",
        });
        window.dispatchEvent(new Event('logo-updated'));
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleSizeChange = (value: number[]) => {
    setLogoHeight(value[0]);
  }

  const handleSizeCommit = (value: number[]) => {
    localStorage.setItem('customLogoHeight', value[0].toString());
    window.dispatchEvent(new Event('logo-updated'));
    toast({
        title: "Tamanho do logotipo salvo!",
    })
  }
  
  const removeLogo = () => {
      localStorage.removeItem('customLogo');
      localStorage.removeItem('customLogoHeight');
      setLogoPreview(null);
      setLogoHeight(50); // Reset to default
      toast({
        title: "Logotipo Removido",
      });
      window.dispatchEvent(new Event('logo-updated'));
  }

  async function onSubmit(data: SettingsFormValues) {
    setIsSubmitting(true);
    try {
      const settingsToSave: Settings = {
        dosePrices: data.dosePrices,
        dailyLateFee: data.dailyLateFee,
      };
      await updateSettings(settingsToSave);
      toast({
        title: "Configurações Salvas!",
        description: "As configurações globais foram atualizadas com sucesso.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao Salvar",
        description: "Não foi possível salvar as configurações. Tente novamente.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }
  
  const handleSaveImprovements = () => {
    setIsSavingImprovements(true);
    localStorage.setItem('systemImprovements', improvements);
    setTimeout(() => {
        toast({ title: 'Lista de melhorias salva!' });
        setIsSavingImprovements(false);
    }, 500)
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
                    <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <Card>
                            <CardHeader>
                                <CardTitle>Logotipo</CardTitle>
                                <CardDescription>Altere o logotipo que aparece no topo do menu e nas páginas públicas.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col items-center gap-4">
                                <div className="w-full h-32 flex items-center justify-center rounded-md border border-dashed bg-muted/50 p-2">
                                    {logoPreview ? (
                                        <Image 
                                            src={logoPreview} 
                                            alt="Logo Preview" 
                                            width={400}
                                            height={logoHeight}
                                            className="object-contain" 
                                            style={{ height: `${logoHeight}px`}}
                                        />
                                    ) : (
                                        <span className="text-sm text-muted-foreground">Sem logotipo</span>
                                    )}
                                </div>
                                <div className="w-full space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="logo-size">Ajustar Tamanho (Altura)</Label>
                                        <Slider
                                            id="logo-size"
                                            min={20}
                                            max={200}
                                            step={1}
                                            value={[logoHeight]}
                                            onValueChange={handleSizeChange}
                                            onValueCommit={handleSizeCommit}
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <Button asChild variant="outline" className="flex-1" type="button">
                                            <label htmlFor="logo-upload" className="cursor-pointer">
                                                <Upload className="mr-2 h-4 w-4" />
                                                Alterar Logotipo
                                            </label>
                                        </Button>
                                        <Input id="logo-upload" type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                                        {logoPreview && (
                                            <Button type="button" variant="destructive" size="icon" onClick={removeLogo}>
                                                <Trash2 className="h-4 w-4"/>
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="flex flex-col">
                            <CardHeader>
                                <CardTitle>Lista de Melhorias</CardTitle>
                                <CardDescription>Anote aqui os erros, bugs e ideias de melhorias para o sistema.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <Textarea 
                                    className="h-full resize-none"
                                    placeholder="Ex: Corrigir cálculo de IMC na tela de cadastro..."
                                    value={improvements}
                                    onChange={(e) => setImprovements(e.target.value)}
                                />
                            </CardContent>
                            <CardFooter className="justify-end">
                                <Button type="button" onClick={handleSaveImprovements} disabled={isSavingImprovements}>
                                    {isSavingImprovements ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Salvando...</>
                                    ) : (
                                        <><Save className="mr-2 h-4 w-4" /> Salvar Lista</>
                                    )}
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>

                    <Card className="lg:col-span-3">
                        <CardHeader>
                            <CardTitle>Configurações Financeiras</CardTitle>
                            <CardDescription>Defina os preços, multas e outras configurações do sistema.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="max-w-xs">
                                 <FormField
                                    control={form.control}
                                    name="dailyLateFee"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Multa por Atraso (R$ / dia)</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" placeholder="Ex: 1.00" {...field} />
                                        </FormControl>
                                        <FormDescription>Valor a ser cobrado por cada dia de atraso no pagamento.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                            </div>

                             <div>
                                <h3 className="text-md font-semibold">Tabela de Preços por Dose</h3>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Dose (mg)</TableHead>
                                            <TableHead>Preço (R$)</TableHead>
                                            <TableHead className="text-right">Ação</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {fields.map((field, index) => (
                                            <TableRow key={field.id}>
                                                <TableCell>
                                                    <FormField
                                                        control={form.control}
                                                        name={`dosePrices.${index}.dose`}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormControl><Input placeholder="Ex: 2.5" {...field} /></FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <FormField
                                                        control={form.control}
                                                        name={`dosePrices.${index}.price`}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormControl><Input type="number" step="0.01" placeholder="Ex: 220.00" {...field} /></FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="mt-4"
                                    onClick={() => append({ dose: "", price: 0 })}
                                >
                                    <PlusCircle className="h-4 w-4 mr-2" />
                                    Adicionar Dose
                                </Button>
                             </div>
                        </CardContent>
                    </Card>
                </div>
                 <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
                        {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : 'Salvar Todas as Configurações'}
                    </Button>
                </div>
            </form>
        </Form>
    </div>
  )
}

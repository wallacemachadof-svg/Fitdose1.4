
'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Upload, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getSettings, updateSettings, type Settings } from "@/lib/actions";
import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";

const settingsFormSchema = z.object({
  defaultPrice: z.coerce.number().min(0, "O preço deve ser um valor positivo."),
  defaultDoses: z.string().min(1, "É necessário pelo menos uma dose padrão."),
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

export default function AdminPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
  });

  useEffect(() => {
    async function loadSettings() {
      setLoading(true);
      const settings = await getSettings();
      form.reset({
        defaultPrice: settings.defaultPrice,
        defaultDoses: settings.defaultDoses.join(", "),
      });
      const storedLogo = localStorage.getItem('customLogo');
      if (storedLogo) {
        setLogoPreview(storedLogo);
      }
      setLoading(false);
    }
    loadSettings();
  }, [form]);

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
         // Force reload to update sidebar logo instantly
        window.dispatchEvent(new Event('storage'));
      };
      reader.readAsDataURL(file);
    }
  };
  
  const removeLogo = () => {
      localStorage.removeItem('customLogo');
      setLogoPreview(null);
      toast({
        title: "Logotipo Removido",
      });
      window.dispatchEvent(new Event('storage'));
  }

  async function onSubmit(data: SettingsFormValues) {
    setIsSubmitting(true);
    try {
      const dosesArray = data.defaultDoses.split(',').map(d => d.trim()).filter(Boolean);
      const settingsToSave: Settings = {
        defaultPrice: data.defaultPrice,
        defaultDoses: dosesArray,
      };
      await updateSettings(settingsToSave);
      toast({
        title: "Configurações Salvas!",
        description: "As configurações gerais foram atualizadas com sucesso.",
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

  if (loading) {
    return (
        <div className="space-y-6">
            <Skeleton className="h-8 w-1/3" />
            <div className="grid md:grid-cols-2 gap-8">
                <Skeleton className="h-64" />
                <Skeleton className="h-64" />
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
                <CardHeader>
                    <CardTitle>Logotipo</CardTitle>
                    <CardDescription>Altere o logotipo que aparece no topo do menu e nas páginas públicas.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4">
                    <div className="w-48 h-24 flex items-center justify-center rounded-md border border-dashed bg-muted/50">
                        {logoPreview ? (
                            <Image src={logoPreview} alt="Logo Preview" width={160} height={80} className="object-contain h-20" />
                        ) : (
                            <span className="text-sm text-muted-foreground">Sem logotipo</span>
                        )}
                    </div>
                     <div className="flex gap-2">
                        <Button asChild variant="outline">
                            <label htmlFor="logo-upload" className="cursor-pointer">
                                <Upload className="mr-2 h-4 w-4" />
                                Alterar Logotipo
                            </label>
                        </Button>
                        <Input id="logo-upload" type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                        {logoPreview && (
                            <Button variant="destructive" size="icon" onClick={removeLogo}>
                                <Trash2 className="h-4 w-4"/>
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Configurações Gerais</CardTitle>
                    <CardDescription>Defina valores padrão para doses e preços no sistema.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="defaultDoses"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Doses Padrão (mg)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="2.5, 5.0, 7.5, 10.0" {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            Separe os valores por vírgula. Ex: 2.5, 5.0, 7.5
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="defaultPrice"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Preço Padrão por Dose (R$)</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" {...field} />
                                        </FormControl>
                                        <FormDescription>
                                           Este valor será usado como padrão em novos lançamentos.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : 'Salvar Configurações'}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    </div>
  )
}

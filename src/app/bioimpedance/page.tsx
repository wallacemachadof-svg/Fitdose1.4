
'use client';

import React, { useState, useEffect } from 'react';
import { analyzeBioimpedanceImage, type AnalyzeBioimpedanceOutput } from '@/ai/flows/analyze-bioimpedance-flow';
import { getPatients, addBioimpedanceEntry, type Patient } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/ui/combobox';
import { Skeleton } from '@/components/ui/skeleton';
import { Upload, Loader2, Bot, Wand2, X } from 'lucide-react';
import Image from 'next/image';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format as formatDateFns } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export default function BioimpedancePage() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<AnalyzeBioimpedanceOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [patients, setPatients] = useState<{ value: string, label: string }[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    async function fetchPatients() {
      const patientData = await getPatients();
      setPatients(patientData.map(p => ({ value: p.id, label: p.fullName })));
    }
    fetchPatients();
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setImagePreview(dataUrl);
        setImageData(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const clearImage = () => {
      setImagePreview(null);
      setImageData(null);
      setExtractedData(null);
  }

  const handleAnalyzeClick = async () => {
    if (!imageData) {
      toast({
        variant: "destructive",
        title: "Nenhuma imagem selecionada",
        description: "Por favor, envie uma imagem para análise.",
      });
      return;
    }

    setIsLoading(true);
    setExtractedData(null);
    try {
      const result = await analyzeBioimpedanceImage({ photoDataUri: imageData });
      setExtractedData(result);
      toast({
        title: "Análise Concluída!",
        description: "Os dados da bioimpedância foram extraídos com sucesso.",
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Erro na Análise",
        description: "Não foi possível extrair os dados da imagem. Tente novamente.",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSaveEntry = async () => {
      if (!selectedPatientId || !extractedData || !date) {
          toast({
              variant: "destructive",
              title: "Dados incompletos",
              description: "Selecione um paciente, data e analise uma imagem antes de salvar."
          });
          return;
      }
      setIsSubmitting(true);
      try {
        await addBioimpedanceEntry(selectedPatientId, date, extractedData);
        toast({
            title: "Registro Salvo!",
            description: "A nova entrada de bioimpedância foi salva no perfil do paciente."
        });
        router.push(`/patients/${selectedPatientId}`);

      } catch(error) {
          console.error(error);
           toast({
              variant: "destructive",
              title: "Erro ao Salvar",
              description: "Não foi possível salvar o registro. Tente novamente.",
          });
      } finally {
          setIsSubmitting(false);
      }
  }

  const dataFields = [
    { key: 'weight', label: 'Peso (Kg)' },
    { key: 'bmi', label: 'IMC' },
    { key: 'fatPercentage', label: 'Gordura (%)' },
    { key: 'muscleMassPercentage', label: 'Massa Muscular (%)' },
    { key: 'visceralFat', label: 'Gordura Visceral' },
    { key: 'hydration', label: 'Água (%)' },
    { key: 'metabolism', label: 'Metabolismo (kcal)' },
    { key: 'boneMass', label: 'Ossos (Kg)' },
    { key: 'protein', label: 'Proteína (%)' },
    { key: 'lbm', label: 'LBM (Kg)' },
    { key: 'metabolicAge', label: 'Idade Metabólica' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Análise de Bioimpedância com IA</h1>
        <p className="text-muted-foreground">
          Envie a imagem do aplicativo de bioimpedância para extrair os dados automaticamente.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
           <Card>
                <CardHeader>
                    <CardTitle>1. Envio da Imagem</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="space-y-2">
                        <Label htmlFor="picture">Imagem da Bioimpedância</Label>
                        <div className="w-full h-64 rounded-md bg-muted flex items-center justify-center border-2 border-dashed border-gray-300 relative">
                            {imagePreview ? (
                                <>
                                <Image src={imagePreview} alt="Preview" layout="fill" className="rounded-md object-contain" />
                                 <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={clearImage}>
                                    <X className="h-4 w-4" />
                                </Button>
                                </>
                            ) : (
                                <div className="flex flex-col items-center text-muted-foreground text-center p-4">
                                <Upload className="w-12 h-12 mb-2" />
                                <span className="text-sm">Clique ou arraste a imagem aqui</span>
                                </div>
                            )}
                        </div>
                        <Input id="picture" type="file" className="sr-only" accept="image/*" onChange={handleImageChange} />
                         <Button type="button" className="w-full" onClick={() => document.getElementById('picture')?.click()}>
                            <Upload className="w-4 h-4 mr-2" />
                            Escolher Arquivo
                        </Button>
                    </div>
                     <Button type="button" className="w-full" onClick={handleAnalyzeClick} disabled={isLoading || !imageData}>
                        {isLoading ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analisando...</>
                        ) : (
                            <><Bot className="w-4 h-4 mr-2" /> Analisar com IA</>
                        )}
                    </Button>
                </CardContent>
            </Card>

            
        </div>
        <div className="lg:col-span-2">
            <Card>
                <CardHeader>
                    <CardTitle>2. Dados Extraídos e Validação</CardTitle>
                    <CardDescription>Verifique os dados extraídos pela IA e selecione o paciente e a data para salvar o registro.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <Label>Paciente</Label>
                             <Combobox 
                                options={patients}
                                value={selectedPatientId}
                                onChange={(value) => setSelectedPatientId(value)}
                                placeholder="Selecione um paciente..."
                                noResultsText="Nenhum paciente encontrado."
                            />
                        </div>
                         <div className="space-y-2">
                            <Label>Data do Registro</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date ? formatDateFns(date, "PPP", {locale: ptBR}) : <span>Escolha uma data</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar mode="single" selected={date} onSelect={setDate} initialFocus locale={ptBR}/>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                   
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {dataFields.map(field => (
                        <div key={field.key} className="space-y-2">
                            <Label htmlFor={field.key}>{field.label}</Label>
                            {isLoading ? (
                                <Skeleton className="h-10 w-full" />
                            ) : (
                                <Input
                                    id={field.key}
                                    type="text"
                                    value={extractedData?.[field.key as keyof AnalyzeBioimpedanceOutput] ?? ''}
                                    onChange={(e) => setExtractedData(prev => ({...prev, [field.key]: e.target.value }))}
                                    placeholder="-"
                                />
                            )}
                        </div>
                    ))}
                    </div>
                     <Button type="button" className="w-full" size="lg" onClick={handleSaveEntry} disabled={isSubmitting || !extractedData || !selectedPatientId}>
                        {isSubmitting ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando Registro...</>
                        ) : (
                            'Salvar Registro no Perfil do Paciente'
                        )}
                    </Button>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}


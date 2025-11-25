
'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/ui/combobox';
import { getPatients, type Patient } from '@/lib/actions';
import { Loader2, Download, Image as ImageIcon, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { toPng } from 'html-to-image';

const motivationalQuotes = [
  "A jornada de mil milhas começa com um único passo.",
  "Acredite em você e tudo será possível.",
  "O segredo do progresso é começar.",
  "Sua dedicação hoje é o seu resultado amanhã.",
  "Não é sobre perfeição, é sobre esforço.",
  "Cada pequena mudança é um grande avanço.",
  "Você é mais forte do que imagina.",
  "Transforme a dor em poder e o poder em progresso.",
  "A disciplina é a ponte entre metas e realizações.",
  "O corpo alcança o que a mente acredita."
];

export default function MarketingPage() {
  const { toast } = useToast();
  const [patients, setPatients] = useState<{ value: string; label: string }[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [patientName, setPatientName] = useState('');
  const [weightLoss, setWeightLoss] = useState('');
  const [timeFrame, setTimeFrame] = useState('');
  const [beforeImage, setBeforeImage] = useState<string | null>(null);
  const [afterImage, setAfterImage] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [quote, setQuote] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const montageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchPatients() {
      const patientData = await getPatients();
      setPatients(patientData.map(p => ({ value: p.id, label: p.fullName })));
    }
    fetchPatients();
    setQuote(motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);
    
    // Fetch logo from local storage
    const storedLogo = localStorage.getItem('customLogo');
    if (storedLogo) {
      setLogoUrl(storedLogo);
    }
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'before') setBeforeImage(reader.result as string);
        if (type === 'after') setAfterImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDownload = async () => {
    if (!montageRef.current) return;
    setIsDownloading(true);
    try {
      const dataUrl = await toPng(montageRef.current, { 
        quality: 1, 
        pixelRatio: 2, // For higher resolution
        style: {
           // Temporarily set a specific width for capture if needed
           width: '1080px',
           height: '1080px',
           margin: '0',
        }
      });
      const link = document.createElement('a');
      link.download = `${patientName.replace(/\s+/g, '-')}-antes-depois.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('oops, something went wrong!', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao baixar imagem',
        description: 'Não foi possível gerar a imagem para download. Tente novamente.',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePatientSelect = (value: string, label: string) => {
    setSelectedPatientId(value);
    setPatientName(label);
  };
  
  const isReadyForDownload = beforeImage && afterImage && patientName && weightLoss && timeFrame;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Marketing: Antes e Depois</h1>
        <p className="text-muted-foreground">Crie imagens comparativas do progresso dos seus pacientes para suas redes sociais.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>1. Preencha os dados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Paciente</Label>
              <Combobox
                options={patients}
                value={selectedPatientId}
                onChange={handlePatientSelect}
                placeholder="Selecione ou digite o nome..."
                noResultsText="Nenhum paciente encontrado."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight-loss">Perda de peso (Ex: 10kg OFF)</Label>
              <Input id="weight-loss" value={weightLoss} onChange={(e) => setWeightLoss(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time-frame">Tempo (Ex: em 8 semanas)</Label>
              <Input id="time-frame" value={timeFrame} onChange={(e) => setTimeFrame(e.target.value)} />
            </div>
             <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="space-y-2">
                    <Label htmlFor="before-upload">Foto "Antes"</Label>
                    <Button asChild variant="outline" className="w-full">
                        <label htmlFor="before-upload" className="cursor-pointer">
                            <ImageIcon className="mr-2 h-4 w-4" /> Enviar Antes
                        </label>
                    </Button>
                    <Input id="before-upload" type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'before')} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="after-upload">Foto "Depois"</Label>
                    <Button asChild variant="outline" className="w-full">
                        <label htmlFor="after-upload" className="cursor-pointer">
                            <ImageIcon className="mr-2 h-4 w-4" /> Enviar Depois
                        </label>
                    </Button>
                    <Input id="after-upload" type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'after')} />
                </div>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>2. Prévia da Imagem</CardTitle>
                    <CardDescription>Esta é a imagem que será gerada para download.</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center bg-muted/20 p-4">
                    <div
                        ref={montageRef}
                        className="aspect-square w-full max-w-xl bg-background"
                    >
                        <div className="flex h-full w-full flex-col items-center justify-center p-8 bg-gradient-to-br from-primary/10 via-transparent to-transparent">
                            <header className="flex w-full items-center justify-between pb-4">
                               {logoUrl ? <Image src={logoUrl} alt="Logo" width={120} height={40} className="object-contain" /> : <div className="h-10 w-32" />}
                                <div className="text-right">
                                    <h2 className="font-bold text-lg leading-tight">{patientName || "Nome do Paciente"}</h2>
                                    <p className="text-sm text-primary font-semibold">{timeFrame || "em X semanas"}</p>
                                </div>
                            </header>

                            <main className="flex-grow w-full grid grid-cols-2 gap-4 relative">
                                <div className="absolute inset-x-0 -top-2 text-center text-xs font-medium text-muted-foreground z-10">
                                    <span className="bg-background px-2">ANTES</span>
                                </div>
                                <div className="absolute inset-x-0 -top-2 text-center text-xs font-medium text-muted-foreground z-10">
                                     <span className="bg-background px-2" style={{marginLeft: "50%"}}>DEPOIS</span>
                                </div>

                                <div className="relative h-full w-full overflow-hidden rounded-lg border-2 border-dashed">
                                    {beforeImage ? <Image src={beforeImage} layout="fill" objectFit="cover" alt="Antes" /> : <div className="flex items-center justify-center h-full bg-muted/50"><ImageIcon className="text-muted-foreground" /></div>}
                                </div>
                                <div className="relative h-full w-full overflow-hidden rounded-lg border-2 border-dashed">
                                    {afterImage ? <Image src={afterImage} layout="fill" objectFit="cover" alt="Depois" /> : <div className="flex items-center justify-center h-full bg-muted/50"><ImageIcon className="text-muted-foreground" /></div>}
                                </div>
                                
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-primary/90 text-primary-foreground rounded-full px-8 py-3 text-center shadow-lg transform -rotate-6">
                                    <p className="font-bold text-2xl">{weightLoss || "X kg OFF"}</p>
                                </div>
                            </main>

                            <footer className="w-full text-center pt-6">
                                <p className="text-sm italic text-muted-foreground flex items-center justify-center gap-2">
                                  <Sparkles className="h-4 w-4 text-yellow-500" />
                                  {quote}
                                </p>
                            </footer>
                        </div>
                    </div>
                </CardContent>
            </Card>
            <Button onClick={handleDownload} disabled={!isReadyForDownload || isDownloading} className="w-full lg:w-auto lg:float-right">
                {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Baixar Imagem
            </Button>
        </div>
      </div>
    </div>
  );
}



'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/ui/combobox';
import { getPatients, type Patient } from '@/lib/actions';
import { Loader2, Copy, Bot, Edit, Hash, ThumbsUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

// A mock function to simulate AI content generation
async function generateMarketingContent(progressSummary: string): Promise<{ testimonial: string; socialPost: string; hashtags: string; }> {
    // In a real scenario, this would be a Genkit flow.
    // For now, we simulate the output based on a template.
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    const testimonial = `Eu nem acredito quando olho no espelho. Graças ao acompanhamento incrível, eu ${progressSummary}. Não foi só sobre perder peso, foi sobre ganhar minha autoestima de volta. Eu me sinto mais disposta, mais confiante e, o mais importante, mais saudável. Para quem está pensando em começar, meu conselho é: não espere mais. Vale cada segundo!`;
    
    const socialPost = `🎉 RESULTADO INCRÍVEL! 🎉

Mais um paciente alcançando seus objetivos e transformando a saúde! Com nosso acompanhamento personalizado, ele(a) ${progressSummary}.

Resultados assim nos enchem de orgulho e provam que com dedicação e o método certo, a mudança é real.

Quer ser o próximo caso de sucesso? Mande uma mensagem e vamos conversar sobre como podemos te ajudar a alcançar sua melhor versão! ✨`;

    const hashtags = "#emagrecimento #saude #bemestar #transformação #vidasaudavel #qualidadedevida #emagrecercomsaude #antesedepois #foco #resultado";

    return { testimonial, socialPost, hashtags };
}

type MarketingContent = {
    testimonial: string;
    socialPost: string;
    hashtags: string;
};

export default function MarketingPage() {
  const { toast } = useToast();
  const [patients, setPatients] = useState<{ value: string; label: string }[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<MarketingContent | null>(null);
  const [progressSummary, setProgressSummary] = useState('');

  useEffect(() => {
    async function fetchPatients() {
        setIsLoading(true);
        const patientData = await getPatients();
        setPatients(patientData.map(p => ({ value: p.id, label: p.fullName })));
        setIsLoading(false);
    }
    fetchPatients();
  }, []);

  useEffect(() => {
    async function fetchPatientDetails() {
        if (!selectedPatientId) {
            setSelectedPatient(null);
            setProgressSummary('');
            return;
        }
        setIsLoading(true);
        const patientData = await getPatientById(selectedPatientId);
        setSelectedPatient(patientData);
        if (patientData) {
            const lastEvolution = patientData.evolutions.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
            const weightLoss = patientData.initialWeight - (lastEvolution?.bioimpedance?.weight || patientData.initialWeight);
            
            let summary = `perdeu ${weightLoss.toFixed(1)}kg`;
            if (patientData.firstDoseDate) {
                const today = new Date();
                const startDate = new Date(patientData.firstDoseDate);
                const diffWeeks = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7));
                if(diffWeeks > 0) {
                    summary += ` em apenas ${diffWeeks} semanas`;
                }
            }
            setProgressSummary(summary);
        }
        setIsLoading(false);
    }
    fetchPatientDetails();
  }, [selectedPatientId]);

  const handleGenerateContent = async () => {
    if (!progressSummary) return;
    setIsGenerating(true);
    setGeneratedContent(null);
    try {
        const content = await generateMarketingContent(progressSummary);
        setGeneratedContent(content);
    } catch (e) {
        toast({ variant: 'destructive', title: 'Erro ao gerar conteúdo' });
    } finally {
        setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string, title: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: `${title} Copiado!`,
      description: "O conteúdo está pronto para ser colado.",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Marketing: Gerador de Conteúdo com IA</h1>
        <p className="text-muted-foreground">Crie depoimentos e posts para redes sociais baseados em resultados reais dos seus pacientes.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>1. Selecione o Caso de Sucesso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
            {isLoading && !selectedPatient && <Skeleton className="h-10 w-full" />}
            {selectedPatient && (
                 <div className="p-4 bg-muted/50 border rounded-lg">
                    <h4 className="font-semibold text-sm">Resumo do Progresso</h4>
                    <p className="text-muted-foreground text-sm">{progressSummary}</p>
                </div>
            )}
            <Button className="w-full" onClick={handleGenerateContent} disabled={!selectedPatient || isGenerating}>
                {isGenerating ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando...</>
                ) : (
                    <><Bot className="mr-2 h-4 w-4" /> Gerar Conteúdo com IA</>
                )}
            </Button>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="flex items-center gap-2"><ThumbsUp className="h-5 w-5 text-primary"/>Depoimento (1ª Pessoa)</CardTitle>
                        {generatedContent && <Button variant="ghost" size="sm" onClick={() => copyToClipboard(generatedContent.testimonial, 'Depoimento')}><Copy className="mr-2 h-4 w-4" />Copiar</Button>}
                    </div>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground min-h-[120px]">
                    {isGenerating && <Skeleton className="h-24 w-full" />}
                    {!isGenerating && generatedContent ? <p>{generatedContent.testimonial}</p> : !isGenerating && <p>O depoimento gerado pela IA aparecerá aqui...</p>}
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="flex items-center gap-2"><Edit className="h-5 w-5 text-primary"/>Post para Rede Social</CardTitle>
                        {generatedContent && <Button variant="ghost" size="sm" onClick={() => copyToClipboard(generatedContent.socialPost, 'Post')}><Copy className="mr-2 h-4 w-4" />Copiar</Button>}
                    </div>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground min-h-[180px] whitespace-pre-wrap">
                    {isGenerating && <Skeleton className="h-36 w-full" />}
                    {!isGenerating && generatedContent ? <p>{generatedContent.socialPost}</p> : !isGenerating && <p>O post para redes sociais gerado pela IA aparecerá aqui...</p>}
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                     <div className="flex justify-between items-center">
                        <CardTitle className="flex items-center gap-2"><Hash className="h-5 w-5 text-primary"/>Hashtags Sugeridas</CardTitle>
                        {generatedContent && <Button variant="ghost" size="sm" onClick={() => copyToClipboard(generatedContent.hashtags, 'Hashtags')}><Copy className="mr-2 h-4 w-4" />Copiar</Button>}
                    </div>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground min-h-[40px]">
                    {isGenerating && <Skeleton className="h-10 w-full" />}
                    {!isGenerating && generatedContent ? <p className="text-blue-600">{generatedContent.hashtags}</p> : !isGenerating && <p>As hashtags sugeridas pela IA aparecerão aqui...</p>}
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}


'use client';

import { useState, useEffect } from 'react';
import {
  personalizedDosageRecommendations,
  type PersonalizedDosageRecommendationsInput,
} from '@/ai/flows/personalized-dosage-recommendations';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Wand2, Loader2, FlaskConical, Stethoscope, BookOpen } from 'lucide-react';
import { getPatientById } from '@/lib/actions';
import { Combobox } from '@/components/ui/combobox';
import { getPatients, type Patient } from '@/lib/actions';

export default function AiPersonalizationPage() {
  const [patientDetails, setPatientDetails] = useState('');
  const [latestResearch, setLatestResearch] = useState(
    'Ajustar a dose com base na resposta glicêmica e tolerabilidade gastrointestinal. Iniciar com 2.5mg e aumentar para 5mg após 4 semanas. Aumentos subsequentes podem ocorrer a cada 4 semanas, se necessário.'
  );
  const [recommendation, setRecommendation] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [patients, setPatients] = useState<{ value: string, label: string }[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');

   useEffect(() => {
    async function fetchPatients() {
      const patientData = await getPatients();
      setPatients(patientData.map(p => ({ value: p.id, label: p.fullName })));
    }
    fetchPatients();
  }, []);
  
  useEffect(() => {
      async function fetchPatientDetails() {
          if (!selectedPatientId) {
              setPatientDetails('');
              return;
          }
          const patient = await getPatientById(selectedPatientId);
          if (patient) {
              const details = `
Nome: ${patient.fullName}
Idade: ${patient.age || 'Não informado'}
Peso Inicial: ${patient.initialWeight} kg
Altura: ${patient.height} cm
Meta de Peso: ${patient.desiredWeight || 'Não informado'} kg
Histórico de Saúde: ${patient.healthContraindications || 'Nenhum'}
Medicamentos em uso: ${patient.dailyMedications || 'Nenhum'}
Já usou Monjauro/similar: ${patient.usedMonjauro === 'yes' ? `Sim (Dose: ${patient.monjauroDose}, Tempo: ${patient.monjauroTime})` : 'Não'}
Evoluções Recentes: ${patient.evolutions.slice(-3).map(e => `Data: ${e.date.toLocaleDateString()}, Peso: ${e.bioimpedance?.weight}kg`).join('; ') || 'Nenhuma'}
              `;
              setPatientDetails(details);
          }
      }
      fetchPatientDetails();
  }, [selectedPatientId]);


  const handleGetRecommendation = async () => {
    if (!patientDetails.trim()) {
      toast({
        variant: 'destructive',
        title: 'Dados do Paciente Vazios',
        description: 'Por favor, insira os detalhes do paciente para obter uma recomendação.',
      });
      return;
    }

    setIsLoading(true);
    setRecommendation(null);
    try {
      const input: PersonalizedDosageRecommendationsInput = {
        patientDetails,
        latestResearch,
      };
      const result = await personalizedDosageRecommendations(input);
      setRecommendation(result);
      toast({
        title: 'Recomendação Gerada!',
        description: 'A IA analisou os dados e gerou uma nova recomendação.',
      });
    } catch (error) {
      console.error('Error getting recommendation:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao Gerar Recomendação',
        description: 'Ocorreu um erro ao se comunicar com a IA. Tente novamente.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Personalização de Tratamento com IA</h1>
        <p className="text-muted-foreground">
          Utilize a IA para gerar recomendações de dosagem personalizadas com base nos dados do paciente e nas pesquisas mais recentes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>1. Inserir Dados</CardTitle>
            <CardDescription>
              Selecione o paciente para preencher os dados ou insira manualmente as informações para análise da IA.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
                <Label>Selecionar Paciente (Opcional)</Label>
                <Combobox 
                    options={patients}
                    value={selectedPatientId}
                    onChange={(value) => setSelectedPatientId(value)}
                    placeholder="Buscar paciente..."
                    noResultsText="Nenhum paciente encontrado."
                />
            </div>
            <div className="space-y-2">
              <Label htmlFor="patient-details">Detalhes do Paciente</Label>
              <Textarea
                id="patient-details"
                placeholder="Insira o histórico de saúde, condição atual, metas, etc."
                value={patientDetails}
                onChange={(e) => setPatientDetails(e.target.value)}
                rows={10}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="latest-research">Contexto (Pesquisas Recentes)</Label>
              <Textarea
                id="latest-research"
                placeholder="Insira artigos, diretrizes ou pesquisas relevantes."
                value={latestResearch}
                onChange={(e) => setLatestResearch(e.target.value)}
                rows={5}
              />
            </div>
             <Button onClick={handleGetRecommendation} disabled={isLoading || !patientDetails} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando Recomendação...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Gerar Recomendação com IA
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Recomendação da IA</CardTitle>
            <CardDescription>
              Abaixo está a sugestão da IA baseada nos dados fornecidos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="space-y-4">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-8 w-1/4" />
                <Skeleton className="h-20 w-full" />
              </div>
            )}
            {recommendation ? (
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold flex items-center gap-2 mb-2"><FlaskConical className="h-5 w-5 text-primary"/>Recomendação de Dosagem</h3>
                  <p className="text-sm text-muted-foreground p-4 bg-muted/50 rounded-md border">
                    {recommendation.dosageRecommendation}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold flex items-center gap-2 mb-2"><Stethoscope className="h-5 w-5 text-primary"/>Justificativa</h3>
                  <p className="text-sm text-muted-foreground p-4 bg-muted/50 rounded-md border">
                    {recommendation.rationale}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold flex items-center gap-2 mb-2"><BookOpen className="h-5 w-5 text-primary"/>Considerações Adicionais</h3>
                  <p className="text-sm text-muted-foreground p-4 bg-muted/50 rounded-md border">
                    {recommendation.additionalConsiderations}
                  </p>
                </div>
              </div>
            ) : (
                !isLoading && (
                    <div className="text-center text-muted-foreground py-16">
                        <p>A recomendação da IA aparecerá aqui.</p>
                    </div>
                )
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


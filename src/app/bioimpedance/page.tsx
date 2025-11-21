
'use client';

import React, { useState, useEffect } from 'react';
import { getPatients, addBioimpedanceEntry, type Bioimpedance } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/ui/combobox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format as formatDateFns } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

const initialBioimpedanceState: Bioimpedance = {
    weight: undefined,
    bmi: undefined,
    fatPercentage: undefined,
    skeletalMusclePercentage: undefined,
    visceralFat: undefined,
    hydration: undefined,
    metabolism: undefined,
    obesityPercentage: undefined,
    boneMass: undefined,
    protein: undefined,
};

export default function BioimpedancePage() {
  const [bioimpedanceData, setBioimpedanceData] = useState<Bioimpedance>(initialBioimpedanceState);
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setBioimpedanceData(prev => ({
        ...prev,
        [id]: value === '' ? undefined : Number(value)
    }));
  };

  const handleSaveEntry = async () => {
      if (!selectedPatientId || !date) {
          toast({
              variant: "destructive",
              title: "Dados incompletos",
              description: "Selecione um paciente e uma data antes de salvar."
          });
          return;
      }
      setIsSubmitting(true);
      try {
        await addBioimpedanceEntry(selectedPatientId, date, bioimpedanceData);
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
    { key: 'weight', label: 'Peso(Kg)' },
    { key: 'bmi', label: 'IMC' },
    { key: 'fatPercentage', label: 'Gordura(%)' },
    { key: 'skeletalMusclePercentage', label: 'Percentual da massa muscular esquelética(%)' },
    { key: 'visceralFat', label: 'Gordura visceral' },
    { key: 'hydration', label: 'Água(%)' },
    { key: 'metabolism', label: 'Metabolismo(kcal / dia)' },
    { key: 'obesityPercentage', label: 'Obesidade(%)' },
    { key: 'boneMass', label: 'Ossos(Kg)' },
    { key: 'protein', label: 'Proteina(%)' },
  ];

  const isFormFilled = Object.values(bioimpedanceData).some(value => value !== undefined && value !== '');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Lançamento Manual de Bioimpedância</h1>
        <p className="text-muted-foreground">
          Insira os dados da avaliação de bioimpedância do paciente.
        </p>
      </div>

      <Card>
          <CardHeader>
              <CardTitle>Dados da Avaliação</CardTitle>
              <CardDescription>Preencha os campos abaixo com as informações da bioimpedância.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <Label>Paciente *</Label>
                       <Combobox 
                          options={patients}
                          value={selectedPatientId}
                          onChange={(value) => setSelectedPatientId(value)}
                          placeholder="Selecione um paciente..."
                          noResultsText="Nenhum paciente encontrado."
                      />
                  </div>
                   <div className="space-y-2">
                      <Label>Data do Registro *</Label>
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
                      <Label htmlFor={field.key} className="text-xs">{field.label}</Label>
                      <Input
                          id={field.key}
                          type="number"
                          step="0.1"
                          value={(bioimpedanceData?.[field.key as keyof Bioimpedance] as any) ?? ''}
                          onChange={handleInputChange}
                          placeholder="-"
                      />
                  </div>
              ))}
              </div>
               <Button type="button" className="w-full" size="lg" onClick={handleSaveEntry} disabled={isSubmitting || !selectedPatientId || !isFormFilled}>
                  {isSubmitting ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando Registro...</>
                  ) : (
                      'Salvar Registro no Perfil do Paciente'
                  )}
              </Button>
          </CardContent>
      </Card>
    </div>
  );
}

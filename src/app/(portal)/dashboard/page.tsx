
'use client';

import { usePatient } from '@/hooks/use-patient';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Activity, Weight, Ruler, Target, TrendingDown, Minus, ArrowUp, ArrowDown, UserCheck, HeartPulse, Droplets, Flame, Bone, Beef, BarChart3, LineChart as LineChartIcon } from 'lucide-react';
import { ResponsiveContainer, LineChart, Tooltip, XAxis, YAxis, Line } from 'recharts';
import { useMemo } from 'react';
import { calculateBmi, formatDate } from '@/lib/utils';
import type { Bioimpedance, Evolution } from '@/lib/actions';

export default function PortalDashboardPage() {
  const { patient, loading } = usePatient();

  const evolutionChartData = useMemo(() => {
    if (!patient || !patient.evolutions) return [];
    
    const dataPoints = patient.evolutions
        .filter(e => e.date && e.bioimpedance)
        .map(e => ({
            date: new Date(e.date),
            ...e.bioimpedance
        }));

    if (patient.initialWeight && patient.firstDoseDate) {
        const initialDate = new Date(patient.firstDoseDate);
        if (!dataPoints.some(dp => isSameDay(dp.date, initialDate))) {
            dataPoints.push({
                date: initialDate,
                weight: patient.initialWeight,
                bmi: calculateBmi(patient.initialWeight, patient.height / 100),
            });
        }
    }
    
    return dataPoints.sort((a,b) => a.date.getTime() - b.date.getTime());

  }, [patient]);


  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!patient) {
    return (
      <div className="text-center">
        <h2 className="text-xl">Paciente não encontrado</h2>
        <p className="text-muted-foreground">Não foi possível carregar os dados do paciente.</p>
      </div>
    );
  }

  const lastEvolutionWeight = patient.evolutions?.slice().reverse().find(e => e.bioimpedance?.weight)?.bioimpedance?.weight;
  const currentWeight = lastEvolutionWeight ?? patient.initialWeight;

  const lastEvolutionBmi = patient.evolutions?.slice().reverse().find(e => e.bioimpedance?.bmi)?.bioimpedance?.bmi;
  const currentBmi = lastEvolutionBmi ?? calculateBmi(currentWeight, patient.height / 100);
  const weightToLose = patient.desiredWeight ? currentWeight - patient.desiredWeight : 0;

  const chartMetrics: { key: keyof Bioimpedance, label: string, icon: React.ElementType, unit?: string }[] = [
      { key: 'weight', label: 'Peso', icon: Weight, unit: 'kg' },
      { key: 'bmi', label: 'IMC', icon: Activity },
      { key: 'fatPercentage', label: 'Gordura', icon: Activity, unit: '%' },
      { key: 'muscleMassPercentage', label: 'Massa Muscular', icon: UserCheck, unit: '%' },
      { key: 'visceralFat', label: 'Gordura Visceral', icon: HeartPulse },
      { key: 'hydration', label: 'Água', icon: Droplets, unit: '%' },
      { key: 'metabolism', label: 'Metabolismo', icon: Flame, unit: 'kcal' },
      { key: 'boneMass', label: 'Massa Óssea', icon: Bone, unit: 'kg' },
      { key: 'protein', label: 'Proteína', icon: Beef, unit: '%' },
  ];

  return (
    <div className="space-y-6">
       <h1 className="text-2xl font-bold">Minha Evolução</h1>
       <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <InfoCard icon={Weight} label="Peso Atual" value={`${currentWeight.toFixed(1)} kg`} />
            <InfoCard icon={Activity} label="IMC Atual" value={currentBmi ? currentBmi.toFixed(2) : '-'} />
            <InfoCard icon={Ruler} label="Altura" value={`${patient.height} cm`} />
            {patient.desiredWeight && <InfoCard icon={Target} label="Meta de Peso" value={`${patient.desiredWeight} kg`} /> }
            {patient.desiredWeight && <InfoCard icon={TrendingDown} label="Faltam Perder" value={`${weightToLose > 0 ? weightToLose.toFixed(1) : 0} kg`} /> }
       </div>

        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Gráficos de Evolução</CardTitle>
                <CardDescription>Acompanhe seu progresso em cada métrica ao longo do tempo.</CardDescription>
            </CardHeader>
            <CardContent>
            {evolutionChartData.length > 1 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {chartMetrics.map(metric => {
                    const data = evolutionChartData
                    .map(e => ({
                        date: formatDate(e.date),
                        value: e[metric.key] as number
                    }))
                    .filter(item => item.value !== undefined && item.value !== null);

                    if (data.length < 2) return null;

                    const firstValue = data[0].value;
                    const lastValue = data[data.length - 1].value;
                    const change = lastValue - firstValue;

                    return (
                    <EvolutionChartCard
                        key={metric.key}
                        title={metric.label}
                        icon={metric.icon}
                        data={data}
                        change={change}
                        unit={metric.unit}
                    />
                    );
                })}
                </div>
            ) : (
                <p className="text-sm text-center text-muted-foreground py-8">
                Seu histórico de evolução aparecerá aqui assim que a primeira medição for registrada.
                </p>
            )}
            </CardContent>
        </Card>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string | number | null }) {
    if (value === null || value === undefined) return null;
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
            </CardContent>
        </Card>
    )
}

function EvolutionChartCard({ title, icon: Icon, data, change, unit='' }: { title: string, icon: React.ElementType, data: {date: string, value: number}[], change: number, unit?: string}) {
    const TrendIcon = change === 0 ? Minus : change > 0 ? ArrowUp : ArrowDown;
    const trendColor = change === 0 ? "text-muted-foreground" : "text-primary";
    
    return (
        <Card className="flex flex-col">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        {title}
                    </CardTitle>
                    <div className={`flex items-center font-bold text-sm ${trendColor}`}>
                        <span>{change.toFixed(1)}{unit}</span>
                        <TrendIcon className="h-4 w-4" />
                    </div>
                </div>
                 <p className="text-2xl font-bold pt-2">{data[data.length - 1].value.toFixed(1)}{unit}</p>
            </CardHeader>
            <CardContent className="flex-1 -mb-4">
                <ResponsiveContainer width="100%" height={80}>
                    <LineChart data={data}>
                        <Tooltip
                            content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                return (
                                    <div className="bg-background/80 backdrop-blur-sm p-2 border rounded-md shadow-lg">
                                    <p className="label text-sm">{`${label}`}</p>
                                    <p className="intro font-bold text-primary">{`${payload[0].value?.toFixed(1)} ${unit}`}</p>
                                    </div>
                                );
                                }
                                return null;
                            }}
                        />
                        <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                        <XAxis dataKey="date" hide/>
                        <YAxis domain={['dataMin - 1', 'dataMax + 1']} hide/>
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}

const isSameDay = (date1: Date, date2: Date) =>
  date1.getFullYear() === date2.getFullYear() &&
  date1.getMonth() === date2.getMonth() &&
  date1.getDate() === date2.getDate();

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
       <Card>
            <CardHeader>
                <Skeleton className="h-6 w-56" />
                <Skeleton className="h-4 w-72 mt-2" />
            </CardHeader>
            <CardContent>
               <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    <Skeleton className="h-48" />
                    <Skeleton className="h-48" />
                    <Skeleton className="h-48" />
               </div>
            </CardContent>
        </Card>
    </div>
  );
}

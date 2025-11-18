'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getPatients, type Patient, type Dose } from '@/lib/actions';
import { formatDate, generateGoogleCalendarLink } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, CalendarPlus, User } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type ScheduledDose = Dose & {
  patientId: string;
  patientName: string;
};

export default function SchedulePage() {
  const [allDoses, setAllDoses] = useState<ScheduledDose[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 })); // Monday

  useEffect(() => {
    const fetchSchedule = async () => {
      setLoading(true);
      const patients = await getPatients();
      const scheduledDoses = patients.flatMap(p =>
        p.doses
          .filter(d => d.status === 'pending')
          .map(d => ({
            ...d,
            patientId: p.id,
            patientName: p.fullName,
          }))
      );
      setAllDoses(scheduledDoses.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
      setLoading(false);
    };

    fetchSchedule();
  }, []);

  const handleNextWeek = () => {
    setWeekStart(addDays(weekStart, 7));
  };

  const handlePrevWeek = () => {
    setWeekStart(addDays(weekStart, -7));
  };

  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  const dosesByDay = weekDays.map(day => ({
    date: day,
    doses: allDoses.filter(dose => isSameDay(new Date(dose.date), day)),
  }));

  if (loading) {
    return <ScheduleSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="h-6 w-6" />
            Minha Agenda
          </h1>
          <p className="text-muted-foreground">Visualize seus próximos agendamentos de doses.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handlePrevWeek}>Anterior</Button>
          <Button variant="outline" onClick={handleNextWeek}>Próxima</Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
        {dosesByDay.map(({ date, doses }) => (
          <Card key={date.toISOString()} className="flex flex-col">
            <CardHeader className="p-4">
              <CardTitle className="text-base text-center">
                {format(date, 'EEE', { locale: ptBR })}
              </CardTitle>
              <CardDescription className="text-center">{format(date, 'dd/MM')}</CardDescription>
            </CardHeader>
            <CardContent className="p-2 pt-0 flex-1 space-y-2">
              {doses.length > 0 ? (
                doses.map(dose => (
                  <div key={`${dose.patientId}-${dose.id}`} className="p-2 rounded-md bg-muted/50 border border-muted-foreground/20 text-xs">
                    <p className="font-semibold text-foreground truncate flex items-center gap-1.5"><User className="h-3 w-3" /> 
                      <Link href={`/patients/${dose.patientId}`} className="hover:underline">{dose.patientName}</Link>
                    </p>
                    <p className="text-muted-foreground">Dose {dose.doseNumber} às {dose.time || 'N/A'}</p>
                     {dose.time && (
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="w-full h-auto text-xs mt-1 p-1 justify-start"
                        asChild
                      >
                        <a href={generateGoogleCalendarLink(dose.patientName, dose)} target="_blank" rel="noopener noreferrer">
                          <CalendarPlus className="h-3 w-3 mr-1.5" />
                          Adicionar ao Google
                        </a>
                      </Button>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center text-xs text-muted-foreground h-full flex items-center justify-center p-4">
                    Nenhum agendamento.
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ScheduleSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </div>
        <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
        {[...Array(7)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="p-4 items-center">
              <Skeleton className="h-5 w-10" />
              <Skeleton className="h-4 w-8 mt-1" />
            </CardHeader>
            <CardContent className="p-2 space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

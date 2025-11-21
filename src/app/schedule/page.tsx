
'use client';

import { useState, useEffect, useMemo } from 'react';
import { getPatients, type Patient, type Dose } from '@/lib/actions';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getDoseStatus, generateGoogleCalendarLink, formatDate } from '@/lib/utils';
import { ptBR } from 'date-fns/locale';
import { format as formatDateFns } from 'date-fns';
import { Button } from '@/components/ui/button';
import { FaWhatsapp } from 'react-icons/fa';
import { generateWhatsAppLink } from '@/lib/utils';
import Link from 'next/link';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

type CalendarEvent = {
  date: Date;
  patientName: string;
  patientId: string;
  dose: Dose;
};

export default function SchedulePage() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPatients = async () => {
      setLoading(true);
      const data = await getPatients();
      setPatients(data);
      setLoading(false);
    };
    fetchPatients();
  }, []);

  const events = useMemo(() => {
    return patients.flatMap(p =>
      p.doses.map(d => ({
        date: new Date(d.date),
        patientName: p.fullName,
        patientId: p.id,
        dose: d,
      }))
    );
  }, [patients]);

  const selectedDayEvents = useMemo(() => {
    if (!date) return [];
    return events
      .filter(event => formatDateFns(event.date, 'yyyy-MM-dd') === formatDateFns(date, 'yyyy-MM-dd'))
      .sort((a, b) => {
        const timeA = a.dose.time || '00:00';
        const timeB = b.dose.time || '00:00';
        return timeA.localeCompare(timeB);
      });
  }, [date, events]);

  const DayCell = ({ date }: { date: Date }) => {
    const dayEvents = events.filter(event => formatDateFns(event.date, 'yyyy-MM-dd') === formatDateFns(date, 'yyyy-MM-dd'));
    if (dayEvents.length > 0) {
      return (
        <div className="relative">
          {formatDateFns(date, 'd')}
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex space-x-1">
            {dayEvents.slice(0, 3).map(event => {
                const status = getDoseStatus(event.dose);
                let colorClass = 'bg-gray-400';
                if (status.color.includes('red')) colorClass = 'bg-red-500';
                else if (status.color.includes('orange')) colorClass = 'bg-orange-500';
                else if (status.color.includes('yellow')) colorClass = 'bg-yellow-500';
                else if (status.color.includes('green')) colorClass = 'bg-green-500';

                return <div key={`${event.patientId}-${event.dose.id}`} className={`h-1.5 w-1.5 rounded-full ${colorClass}`} />;
            })}
          </div>
        </div>
      );
    }
    return formatDateFns(date, 'd');
  };
  
  if (loading) {
      return (
        <div className="space-y-6">
            <Skeleton className="h-10 w-1/4 mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                    <Skeleton className="h-[400px] w-full" />
                </div>
                <div>
                     <Skeleton className="h-10 w-1/2 mb-4" />
                     <Skeleton className="h-64 w-full" />
                </div>
            </div>
        </div>
      )
  }

  return (
    <div className="space-y-6">
       <div>
            <h1 className="text-2xl font-bold">Agenda</h1>
            <p className="text-muted-foreground">Visualize os agendamentos de doses dos seus pacientes.</p>
        </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardContent className="p-2">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="w-full"
              locale={ptBR}
              components={{
                Day: ({ date }) => <DayCell date={date} />,
              }}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Doses para {date ? formatDate(date) : '...'}</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDayEvents.length > 0 ? (
              <ul className="space-y-4">
                {selectedDayEvents.map(event => {
                  const status = getDoseStatus(event.dose);
                  const patient = patients.find(p => p.id === event.patientId);

                  return (
                    <li key={`${event.patientId}-${event.dose.id}`} className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <p className="font-semibold text-lg">{event.dose.time || 'N/A'}</p>
                      </div>
                      <div className="flex-grow border-l-2 pl-4 border-primary">
                        <Link href={`/patients/${event.patientId}`} className="font-semibold hover:underline">{event.patientName}</Link>
                        <p className="text-sm text-muted-foreground">Dose {event.dose.doseNumber}</p>
                        <Badge variant={status.color.startsWith('bg-') ? 'default' : 'outline'} className={`${status.color} ${status.textColor} border-none`}>{status.label}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                          {patient && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-green-500 hover:text-green-600" onClick={() => window.open(generateWhatsAppLink(patient, event.dose), '_blank')}>
                                <FaWhatsapp className="h-5 w-5" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(generateGoogleCalendarLink(event.patientName, event.dose), '_blank')}>
                                <CalendarIcon className="h-5 w-5" />
                           </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-center text-muted-foreground py-8">Nenhuma dose agendada para este dia.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}



'use client';

import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { DayPicker, type DayProps } from 'react-day-picker';
import { getPatients, updateDose, type Patient, type Dose } from '@/lib/actions';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getDoseStatus, generateGoogleCalendarLink, formatDate, generateWhatsAppLink } from '@/lib/utils';
import { ptBR } from 'date-fns/locale';
import { format as formatDateFns, isSameDay, parse } from 'date-fns';
import { Button } from '@/components/ui/button';
import { FaWhatsapp } from 'react-icons/fa';
import Link from 'next/link';
import { Calendar as CalendarIcon, Loader2, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

type CalendarEvent = {
  date: Date;
  patientName: string;
  patientId: string;
  patientAvatar?: string;
  dose: Dose;
  allDoses: Dose[];
};

function ReschedulePopover({ event, onReschedule }: { event: CalendarEvent; onReschedule: (patientId: string, doseId: number, newDate: Date, newTime: string) => void }) {
    const [open, setOpen] = useState(false);
    const [newDate, setNewDate] = useState('');
    const [newTime, setNewTime] = useState('');

    useEffect(() => {
        if (open) {
            setNewDate(formatDateFns(new Date(event.dose.date), 'yyyy-MM-dd'));
            setNewTime(event.dose.time || '10:00');
        }
    }, [open, event.dose.date, event.dose.time]);

    const handleSave = () => {
        if (newDate && newTime) {
            const dateWithTimezone = `${newDate}T00:00:00`;
            const parsedDate = parse(dateWithTimezone, "yyyy-MM-dd'T'HH:mm:ss", new Date());

            if (!isNaN(parsedDate.getTime())) {
                onReschedule(event.patientId, event.dose.id, parsedDate, newTime);
                setOpen(false);
            }
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                    Reagendar
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-4 space-y-4">
                <div>
                    <h4 className="font-medium leading-none">Reagendar Dose</h4>
                    <p className="text-sm text-muted-foreground">Selecione a nova data e hora.</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="date">Nova Data</Label>
                        <Input id="date" type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="time">Novo Horário</Label>
                        <Input id="time" type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} />
                    </div>
                </div>
                <Button onClick={handleSave} className="w-full">Salvar</Button>
            </PopoverContent>
        </Popover>
    );
}

const ScheduleContext = React.createContext<{ events: CalendarEvent[] }>({ events: [] });

const DayCell = (dayProps: DayProps) => {
  const { events } = React.useContext(ScheduleContext);
  const dayEvents = events.filter(event => isSameDay(event.date, dayProps.date));
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  React.useImperativeHandle(dayProps.buttonRef, () => buttonRef.current!);

  if(dayProps.date < new Date('2000-01-01')) return <></>;

  const getUrgentStatusColor = () => {
      if (dayEvents.some(event => getDoseStatus(event.dose, event.allDoses).label.includes('Vencida'))) return 'bg-red-500';
      if (dayEvents.some(event => getDoseStatus(event.dose, event.allDoses).label === 'Vence Hoje')) return 'bg-orange-500';
      return 'bg-primary';
  };

  return (
    <div className="relative">
      <DayPicker.Day {...dayProps} ref={buttonRef} />
      {dayEvents.length > 0 && (
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex space-x-1">
           <div className={`h-1.5 w-1.5 rounded-full ${getUrgentStatusColor()}`} />
        </div>
      )}
    </div>
  );
};


export default function SchedulePage() {
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const fetchPatients = async () => {
        setLoading(true);
        const data = await getPatients();
        setPatients(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchPatients();
    }, []);

    const handleRescheduleDose = async (patientId: string, doseId: number, newDate: Date, newTime: string) => {
        try {
            await updateDose(patientId, doseId, { date: newDate, time: newTime });
            toast({
                title: "Dose Reagendada!",
                description: `A dose e as subsequentes foram reagendadas.`,
            });
            fetchPatients(); // Re-fetch all data to ensure calendar is up-to-date
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Erro ao reagendar",
                description: error instanceof Error ? error.message : "Não foi possível reagendar a dose.",
            });
        }
    };

    const events = useMemo((): CalendarEvent[] => {
        return patients.flatMap(p =>
            p.doses.map(d => ({
                date: new Date(d.date),
                patientName: p.fullName,
                patientId: p.id,
                patientAvatar: p.avatarUrl,
                dose: d,
                allDoses: p.doses,
            }))
        );
    }, [patients]);

    const selectedDayEvents = useMemo(() => {
        if (!date) return [];
        return events
            .filter(event => isSameDay(event.date, date))
            .sort((a, b) => (a.dose.time || '00:00').localeCompare(b.dose.time || '00:00'));
    }, [date, events]);
    
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
        <ScheduleContext.Provider value={{ events }}>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold">Agenda de Aplicações</h1>
                    <p className="text-muted-foreground">Visualize e gerencie os agendamentos de doses dos seus pacientes.</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    <Card className="lg:col-span-2">
                        <CardContent className="p-2">
                            <CalendarComponent
                                mode="single"
                                selected={date}
                                onSelect={setDate}
                                className="w-full"
                                locale={ptBR}
                                captionLayout="dropdown-buttons"
                                fromYear={2020}
                                toYear={new Date().getFullYear() + 5}
                                components={{ Day: DayCell }}
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
                                        const status = getDoseStatus(event.dose, event.allDoses);
                                        const patient = patients.find(p => p.id === event.patientId);

                                        return (
                                            <li key={`${event.patientId}-${event.dose.id}`}>
                                                <Card className="overflow-hidden">
                                                    <CardHeader className="flex flex-row items-center gap-4 p-4 bg-muted/50">
                                                        <Avatar>
                                                            <AvatarImage src={event.patientAvatar} />
                                                            <AvatarFallback>{event.patientName.charAt(0)}</AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <Link href={`/patients/${event.patientId}`} className="font-semibold hover:underline">{event.patientName}</Link>
                                                            <p className="text-sm text-muted-foreground">Dose {event.dose.doseNumber}</p>
                                                        </div>
                                                    </CardHeader>
                                                    <CardContent className="p-4 space-y-3">
                                                        <div className="flex items-center justify-between text-sm">
                                                            <span className="flex items-center gap-2 font-semibold">
                                                                <Clock className="h-4 w-4 text-muted-foreground" />
                                                                Horário: {event.dose.time || 'N/A'}
                                                            </span>
                                                            <Badge variant={status.color.startsWith('bg-') ? 'default' : 'outline'} className={`${status.color} ${status.textColor} border-none`}>{status.label}</Badge>
                                                        </div>
                                                    </CardContent>
                                                    <CardFooter className="bg-muted/50 p-2 flex justify-end gap-1">
                                                        {patient && (
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-green-500 hover:text-green-600" onClick={() => window.open(generateWhatsAppLink(patient, event.dose), '_blank')}>
                                                                <FaWhatsapp className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                        <ReschedulePopover event={event} onReschedule={handleRescheduleDose} />
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(generateGoogleCalendarLink(event.patientName, event.dose), '_blank')}>
                                                            <CalendarIcon className="h-4 w-4" />
                                                        </Button>
                                                    </CardFooter>
                                                </Card>
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : (
                                <p className="text-center text-muted-foreground py-16">Nenhuma dose agendada para este dia.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </ScheduleContext.Provider>
    );
}

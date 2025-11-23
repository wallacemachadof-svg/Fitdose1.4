
'use client';

import { useState, useEffect } from 'react';
import { getPatients, type Patient } from '@/lib/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Cake, Gift } from 'lucide-react';
import { format, getMonth, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';
import { FaWhatsapp } from 'react-icons/fa';
import { Button } from '@/components/ui/button';

export default function BirthdaysPage() {
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

    const currentMonth = getMonth(new Date());

    const birthdayPatients = patients
        .filter(p => p.birthDate && getMonth(new Date(p.birthDate)) === currentMonth)
        .sort((a, b) => new Date(a.birthDate!).getDate() - new Date(b.birthDate!).getDate());
        
    const monthName = format(new Date(), 'MMMM', { locale: ptBR });

    const generateBirthdayWhatsAppLink = (patient: Patient) => {
        const patientFirstName = patient.fullName.split(' ')[0];
        const message = `Olá ${patientFirstName}, parabéns pelo seu aniversário! 🎉 Desejamos a você um dia incrível e um novo ciclo cheio de saúde e realizações. Conte conosco para continuar cuidando do seu bem-estar!`;
        const encodedMessage = encodeURIComponent(message);
        const cleanPhoneNumber = patient.phone?.replace(/\D/g, '') || '';
        return `https://wa.me/55${cleanPhoneNumber}?text=${encodedMessage}`;
    }


    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-1/3" />
                <Skeleton className="h-6 w-1/4" />
                <Card>
                    <CardContent className="pt-6">
                        <div className="space-y-4">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="flex items-center space-x-4">
                                    <Skeleton className="h-12 w-12 rounded-full" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-[250px]" />
                                        <Skeleton className="h-4 w-[200px]" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Gift className="h-6 w-6 text-primary" />
                    Aniversariantes do Mês
                </h1>
                <p className="text-muted-foreground">
                    Pacientes que fazem aniversário em {monthName}.
                </p>
            </div>

            <Card>
                <CardContent className="pt-6">
                    {birthdayPatients.length > 0 ? (
                        <ul className="space-y-4">
                            {birthdayPatients.map(patient => {
                                const isToday = isSameDay(new Date(patient.birthDate!), new Date());
                                return (
                                <li key={patient.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <Avatar className="h-12 w-12">
                                            <AvatarImage src={patient.avatarUrl} alt={patient.fullName} />
                                            <AvatarFallback>{patient.fullName.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <Link href={`/patients/${patient.id}`} className="font-semibold hover:underline">
                                                {patient.fullName}
                                            </Link>
                                            <p className="text-sm text-muted-foreground flex items-center gap-2">
                                                <Cake className="h-4 w-4" />
                                                {format(new Date(patient.birthDate!), 'dd/MM')}
                                                 {isToday && <span className="text-xs font-bold text-primary animate-pulse">(HOJE!)</span>}
                                            </p>
                                        </div>
                                    </div>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="text-green-600 border-green-600/50 hover:bg-green-50 hover:text-green-700"
                                        onClick={() => window.open(generateBirthdayWhatsAppLink(patient), '_blank')}
                                    >
                                        <FaWhatsapp className="h-4 w-4 mr-2" />
                                        Parabenizar
                                    </Button>
                                </li>
                            )})}
                        </ul>
                    ) : (
                        <div className="text-center py-16 text-muted-foreground">
                            <p>Nenhum aniversariante encontrado para este mês.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}


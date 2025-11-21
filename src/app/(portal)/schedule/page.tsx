
'use client';

import { useState } from 'react';
import { usePatient } from '@/hooks/use-patient';
import { formatDate, generateGoogleCalendarLink, getDoseStatus } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, CalendarPlus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"


export default function PortalSchedulePage() {
  const { patient, loading } = usePatient();

  if (loading) {
    return <ScheduleSkeleton />;
  }

  if (!patient) {
     return (
      <div className="text-center">
        <h2 className="text-xl">Paciente não encontrado</h2>
        <p className="text-muted-foreground">Não foi possível carregar seus agendamentos.</p>
      </div>
    );
  }

  const upcomingDoses = patient.doses
    .filter(d => d.status === 'pending')
    .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="space-y-6">
       <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="h-6 w-6" />
            Meus Agendamentos
          </h1>
          <p className="text-muted-foreground">Confira as datas das suas próximas aplicações.</p>
        </div>
      
      <Card>
        <CardContent className='pt-6'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dose N°</TableHead>
                <TableHead>Data Agendada</TableHead>
                <TableHead>Horário</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {upcomingDoses.length > 0 ? (
                upcomingDoses.map(dose => {
                   const status = getDoseStatus(dose);
                  return (
                    <TableRow key={dose.id}>
                      <TableCell className="font-semibold">{dose.doseNumber}</TableCell>
                      <TableCell>{formatDate(dose.date)}</TableCell>
                      <TableCell>{dose.time || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant={status.color.includes('bg-') ? 'default' : 'outline'} className={`${status.color} ${status.textColor} border-none`}>
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className='text-right'>
                        {dose.time && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            asChild
                          >
                            <a href={generateGoogleCalendarLink(patient.fullName, dose)} target="_blank" rel="noopener noreferrer">
                              <CalendarPlus className="h-4 w-4 mr-2" />
                              Adicionar ao Google
                            </a>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Nenhum agendamento futuro encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function ScheduleSkeleton() {
  return (
    <div className="space-y-6">
      <div>
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-80 mt-2" />
      </div>
      <Card>
        <CardContent className='pt-6'>
          <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

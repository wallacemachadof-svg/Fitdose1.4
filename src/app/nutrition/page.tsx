
'use client';

import { useState, useEffect } from 'react';
import { getPatients, updatePatient, type Patient } from '@/lib/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Apple, Copy, Utensils, FileText } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { generateNutritionalAssessmentLink, generateNutritionalAssessmentWhatsAppLink, generateFoodPlanWhatsAppLink } from '@/lib/utils';
import { FaWhatsapp } from 'react-icons/fa';
import { cn } from '@/lib/utils';

export default function NutritionPage() {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const fetchPatients = async () => {
            setLoading(true);
            const data = await getPatients();
            setPatients(data);
            setLoading(false);
        };
        fetchPatients();
    }, []);

    const getStatusVariant = (status: 'pending' | 'completed' | 'available' | 'sent' | undefined) => {
        switch (status) {
            case 'completed':
                return { label: 'Preenchido', variant: 'default' as const, className: 'bg-yellow-500 text-white' };
            case 'available':
                 return { label: 'Disponível p/ Envio', variant: 'default' as const, className: 'bg-green-500 text-primary-foreground' };
            case 'sent':
                return { label: 'Enviado', variant: 'default' as const, className: 'bg-blue-500 text-white' };
            case 'pending':
            default:
                return { label: 'Pendente', variant: 'secondary' as const };
        }
    };
    
    const handleCopyLink = (patientId: string) => {
        const link = generateNutritionalAssessmentLink(patientId);
        navigator.clipboard.writeText(link);
        toast({
          title: "Link Copiado!",
          description: "O link para a avaliação nutricional foi copiado.",
        });
    };

    const handleSendAssessmentViaWhatsApp = (patient: Patient) => {
        const whatsappUrl = generateNutritionalAssessmentWhatsAppLink(patient);
        window.open(whatsappUrl, '_blank');
    }
    
    const handleSendPlanViaWhatsApp = async (patient: Patient) => {
        if (patient.foodPlanStatus === 'pending') {
            toast({
                variant: 'destructive',
                title: 'Ação Bloqueada',
                description: 'O paciente ainda não preencheu o formulário de avaliação.'
            });
            return;
        }

        const whatsappUrl = generateFoodPlanWhatsAppLink(patient);
        window.open(whatsappUrl, '_blank');
        
        // Optimistic UI update
        const originalPatients = [...patients];
        setPatients(patients.map(p => p.id === patient.id ? {...p, foodPlanStatus: 'sent'} : p));

        try {
            await updatePatient(patient.id, { foodPlanStatus: 'sent' });
            toast({
                title: "Plano Alimentar Enviado!",
                description: `O status para ${patient.fullName} foi atualizado.`,
            });
        } catch(error) {
            // Revert UI on error
            setPatients(originalPatients);
            toast({
                variant: 'destructive',
                title: 'Erro ao atualizar status',
                description: 'Não foi possível atualizar o status do paciente.',
            });
        }
    }

    if (loading) {
        return (
             <div className="space-y-6">
                <Skeleton className="h-10 w-1/3" />
                <Skeleton className="h-6 w-1/2" />
                <Card>
                    <CardContent className="pt-6">
                        <Skeleton className="h-64 w-full" />
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Apple className="h-6 w-6 text-primary" />
                    Acompanhamento Nutricional
                </h1>
                <p className="text-muted-foreground">
                    Gerencie o status das avaliações e planos alimentares de cada paciente.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Status dos Pacientes</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Paciente</TableHead>
                                <TableHead>Status do Formulário</TableHead>
                                <TableHead>Plano Alimentar</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {patients.map(patient => {
                                const formStatus = getStatusVariant(patient.nutritionalAssessmentStatus);
                                const planStatus = getStatusVariant(patient.foodPlanStatus);
                                const isPlanPending = patient.foodPlanStatus === 'pending';

                                return (
                                    <TableRow key={patient.id}>
                                        <TableCell>
                                            <Link href={`/patients/${patient.id}`} className="font-medium hover:underline">
                                                {patient.fullName}
                                            </Link>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={formStatus.variant} className={formStatus.className}>{formStatus.label}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={planStatus.variant} className={planStatus.className}>{planStatus.label}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    onClick={() => handleCopyLink(patient.id)}
                                                >
                                                    <Copy className="h-4 w-4 mr-2" />
                                                    Copiar Link
                                                </Button>
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    className="text-green-600 border-green-600/50 hover:bg-green-50 hover:text-green-700"
                                                    onClick={() => handleSendAssessmentViaWhatsApp(patient)}
                                                >
                                                    <FaWhatsapp className="h-4 w-4 mr-2" />
                                                    Formulário
                                                </Button>
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    className={cn(
                                                        !isPlanPending && "text-primary border-primary/50 hover:bg-primary/10 hover:text-primary"
                                                    )}
                                                    onClick={() => handleSendPlanViaWhatsApp(patient)}
                                                    disabled={isPlanPending}
                                                >
                                                    <Utensils className="h-4 w-4 mr-2" />
                                                    Plano
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

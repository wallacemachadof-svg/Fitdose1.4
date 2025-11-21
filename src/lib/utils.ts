

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, differenceInDays, parseISO, addDays } from "date-fns";
import type { Dose, Sale, CashFlowEntry, Patient } from "@/lib/actions";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calculateBmi(weight: number, height: number): number | null {
  if (height <= 0 || weight <= 0) {
    return null;
  }
  const bmi = weight / (height * height);
  return parseFloat(bmi.toFixed(2));
}

export function formatDate(date: Date | string | undefined) {
  if (!date) return '-';
  return format(new Date(date), "dd/MM/yyyy");
}

export function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}


export function getDoseStatus(dose: Dose, allDoses: Dose[] = []) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const doseDate = new Date(dose.date);
  doseDate.setHours(0, 0, 0, 0);

  if (dose.status === 'administered') {
    return { label: "Administrada", color: "bg-gray-500", textColor: "text-white", days: null, messageType: "info" };
  }
  
  const lastAdministeredDose = allDoses
      .filter(d => d.status === 'administered')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

  const overdueThreshold = lastAdministeredDose ? addDays(new Date(lastAdministeredDose.date), 7) : addDays(doseDate, 7);
  overdueThreshold.setHours(0,0,0,0);
  
  if (today > overdueThreshold) {
      const daysOverdue = differenceInDays(today, overdueThreshold);
      return { label: "Vencida", color: "bg-red-500", textColor: "text-white", days: -daysOverdue, messageType: "overdue" };
  }

  const daysUntilDose = differenceInDays(doseDate, today);

  if (daysUntilDose <= 2 && daysUntilDose >= 0) {
    return { label: "Vencendo", color: "bg-orange-500", textColor: "text-white", days: daysUntilDose, messageType: "urgent" };
  }
  if (daysUntilDose <= 5 && daysUntilDose > 2) {
    return { label: "Próxima", color: "bg-yellow-500", textColor: "text-white", days: daysUntilDose, messageType: "upcoming" };
  }
  
  return { label: "Agendada", color: "bg-green-500", textColor: "text-white", days: daysUntilDose, messageType: "scheduled" };
}


export function getPaymentStatusVariant(status: Sale['paymentStatus'] | CashFlowEntry['status'] | CashFlowEntry['type']) {
  switch (status) {
    case 'pago':
      return { label: "Pago", color: "bg-green-500", textColor: "text-white" };
    case 'pendente':
      return { label: "Pendente", color: "bg-yellow-500", textColor: "text-white" };
    case 'vencido':
        return { label: "Vencido", color: "bg-red-500", textColor: "text-white" };
    case 'entrada':
        return { label: "Entrada", color: "text-green-600", textColor: "" };
    case 'saida':
        return { label: "Saída", color: "text-red-600", textColor: "" };
    default:
      return { label: "Pendente", color: "bg-yellow-500", textColor: "text-white" };
  }
}

export function getDeliveryStatusVariant(status: Sale['deliveryStatus']) {
    switch (status) {
        case 'entregue':
            return { label: "Entregue", color: "bg-accent/80", textColor: "text-accent-foreground" };
        case 'em processamento':
            return { label: "Em Processamento", color: "bg-blue-500", textColor: "text-white" };
        case 'em agendamento':
            return { label: "Em Agendamento", color: "bg-orange-400", textColor: "text-white" };
        default:
            return { label: "Pendente", color: "bg-gray-400", textColor: "text-white" };
    }
}

export function getStockStatusVariant(quantity: number) {
    if (quantity <= 0) {
        return { label: "Esgotado", color: "bg-red-500", textColor: "text-white" };
    }
    if (quantity <= 5) {
        return { label: "Estoque Baixo", color: "bg-yellow-500", textColor: "text-white" };
    }
    return { label: "Em Estoque", color: "bg-green-500", textColor: "text-white" };
}

export function generateWhatsAppLink(patient: Patient, dose: Dose): string {
    const status = getDoseStatus(dose, patient.doses);
    const patientFirstName = patient.fullName.split(' ')[0];
    const doseDate = formatDate(dose.date);
    let message = '';

    switch (status.messageType) {
        case 'overdue':
            message = `Olá, ${patientFirstName}! Passando para lembrar que sua dose de número ${dose.doseNumber} está vencida. Vamos reagendar?`;
            break;
        case 'urgent':
            message = `Olá, ${patientFirstName}! Sua dose de número ${dose.doseNumber} vence em ${status.days === 0 ? 'hoje' : `${status.days} dia(s)`} (${doseDate}). Não se esqueça!`;
            break;
        case 'upcoming':
            message = `Olá, ${patientFirstName}! Um lembrete amigável de que sua próxima dose (Nº ${dose.doseNumber}) está agendada para ${doseDate}.`;
            break;
        case 'scheduled':
             message = `Olá, ${patientFirstName}! Tudo bem? Passando para confirmar que sua dose Nº ${dose.doseNumber} está agendada para ${doseDate}.`;
            break;
        default:
            message = `Olá, ${patientFirstName}! Como você está?`;
            break;
    }

    const encodedMessage = encodeURIComponent(message);
    const cleanPhoneNumber = patient.phone?.replace(/\D/g, '') || '';

    return `https://wa.me/55${cleanPhoneNumber}?text=${encodedMessage}`;
}

export function generateGoogleCalendarLink(patientName: string, dose: Dose): string {
    const title = `Aplicação de dose - ${patientName}`;
    
    const doseDate = new Date(dose.date);
    const [hours, minutes] = dose.time ? dose.time.split(':').map(Number) : [12, 0];
    
    doseDate.setHours(hours, minutes, 0, 0);
    const startTime = doseDate.toISOString().replace(/-|:|\.\d\d\d/g, '');
    
    doseDate.setHours(hours + 1); // Assume 1 hour duration
    const endTime = doseDate.toISOString().replace(/-|:|\.\d\d\d/g, '');

    const details = `Aplicação da dose de número ${dose.doseNumber} para o(a) paciente ${patientName}.`;
    
    const url = new URL('https://www.google.com/calendar/render');
    url.searchParams.append('action', 'TEMPLATE');
    url.searchParams.append('text', title);
    url.searchParams.append('dates', `${startTime}/${endTime}`);
    url.searchParams.append('details', details);
    
    return url.toString();
}

export function getHighestReward(points: number) {
    if (points < 10) {
        return null;
    }
    const discountValue = Math.floor(points / 10);
    return {
        label: `Até ${formatCurrency(discountValue)} de desconto`,
        discountValue,
    };
}

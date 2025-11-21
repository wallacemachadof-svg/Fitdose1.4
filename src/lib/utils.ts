

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, differenceInDays, parseISO, addDays, startOfToday } from "date-fns";
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

export function getDaysUntilDose(dose: Dose): number {
    const today = startOfToday();
    const doseDate = new Date(dose.date);
    doseDate.setHours(0, 0, 0, 0);
    return differenceInDays(doseDate, today);
}

export function getOverdueDays(dose: Dose, allDoses: Dose[]): number {
    const today = startOfToday();
    const doseDate = new Date(dose.date);
    doseDate.setHours(0, 0, 0, 0);

    const daysDifference = differenceInDays(today, doseDate);
    
    return daysDifference > 0 ? daysDifference : 0;
}


export function getDoseStatus(dose: Dose, allDoses: Dose[] = []) {
  const today = startOfToday();
  const doseDate = new Date(dose.date);
  doseDate.setHours(0, 0, 0, 0);

  if (dose.status === 'administered') {
    return { label: "Administrada", color: "bg-gray-500", textColor: "text-white" };
  }
  
  const daysUntilDose = differenceInDays(doseDate, today);

  if (daysUntilDose < 0) {
      const overdueDays = Math.abs(daysUntilDose);
      return { label: `Vencida há ${overdueDays}d`, color: "bg-red-500", textColor: "text-white" };
  }
  if (daysUntilDose === 0) {
    return { label: "Vence Hoje", color: "bg-amber-500", textColor: "text-white" };
  }
  if (daysUntilDose <= 3) {
    return { label: `Vence em ${daysUntilDose}d`, color: "bg-yellow-500", textColor: "text-white" };
  }
  
  return { label: "Agendada", color: "bg-green-500", textColor: "text-white" };
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
    const patientFirstName = patient.fullName.split(' ')[0];
    const doseDate = formatDate(dose.date);
    const doseTime = dose.time || '[Insira o Horário Aqui]';

    const message = `✨ Oi, ${patientFirstName}.

Passando para deixar um lembrete super importante e garantir que você continue no caminho certo para os seus resultados de Emagrecimento & Estética!

Sua Próxima Dose (Nº ${dose.doseNumber}) está chegando:

🗓️ Data: ${doseDate}
⏰ Horário: ${doseTime}

Seu próximo passo é simples:

👉 Tudo certo para essa data e horário? Se sim, é só aguardar!
⚠️ Precisa mudar? Por favor, nos chame o quanto antes para que possamos ajustar seu agendamento sem perder seu progresso!

Estamos aqui para cuidar de você! Qualquer dúvida, é só nos chamar. 💖`;

    const encodedMessage = encodeURIComponent(message);
    const cleanPhoneNumber = patient.phone?.replace(/\D/g, '') || '';

    return `https://wa.me/55${cleanPhoneNumber}?text=${encodedMessage}`;
}

export function generateOverdueWhatsAppLink(patient: Patient): string {
    const patientFirstName = patient.fullName.split(' ')[0];

    const message = `Olá ${patientFirstName}, passando para lembrar de agendar seu horario para proceguimor com seu protocolo de emagrecimento. para que dia podemos agendar sua dose semanal?`;

    const encodedMessage = encodeURIComponent(message);
    const cleanPhoneNumber = patient.phone?.replace(/\D/g, '') || '';

    return `https://wa.me/55${cleanPhoneNumber}?text=${encodedMessage}`;
}

export function generateDueTodayWhatsAppLink(patient: Patient, dose: Dose): string {
    const patientFirstName = patient.fullName.split(' ')[0];
    const doseDate = formatDate(dose.date);
    const doseTime = dose.time || '[Insira o Horário Agendado Aqui]';

    const message = `🚨 ATENÇÃO, ${patientFirstName}! Sua Dose Vence HOJE!

Olá! Verificamos em nosso sistema que a sua Dose (Nº ${dose.doseNumber}) agendada para hoje, ${doseDate}, precisa ser aplicada.

⏰ Horário: ${doseTime}

Se você já fez a aplicação, desconsidere esta mensagem!

Se ainda não fez: É fundamental seguir o cronograma para manter a eficácia total do seu tratamento de Emagrecimento & Estética.

👉 AÇÃO IMEDIATA: Por favor, responda a esta mensagem ou ligue para [Seu Telefone/Contato] imediatamente se você tiver qualquer dificuldade ou se precisar de auxílio.

Conte conosco para te ajudar a não perder o timing dos seus resultados! ✨`;

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

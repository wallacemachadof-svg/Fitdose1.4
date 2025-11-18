import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, differenceInDays } from "date-fns";
import type { Dose, Sale } from "@/lib/data";

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


export function getDoseStatus(dose: Dose) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const doseDate = new Date(dose.date);
  doseDate.setHours(0, 0, 0, 0);

  if (dose.status === 'administered') {
    return { label: "Administrada", color: "bg-accent/80", textColor: "text-accent-foreground" };
  }
  
  const daysUntilDose = differenceInDays(doseDate, today);

  if (daysUntilDose < 0) {
    return { label: "Vencida", color: "bg-destructive/80", textColor: "text-destructive-foreground" };
  }
  if (daysUntilDose <= 2) {
    return { label: "Vencendo", color: "bg-orange-500", textColor: "text-white" };
  }
  if (daysUntilDose <= 5) {
    return { label: "Próxima", color: "bg-yellow-400", textColor: "text-yellow-900" };
  }
  return { label: "Agendada", color: "bg-primary/50", textColor: "text-primary-foreground" };
}


export function getPaymentStatusVariant(status: Sale['paymentStatus']) {
  switch (status) {
    case 'pago':
      return { label: "Pago", color: "bg-green-500", textColor: "text-white" };
    case 'pendente':
      return { label: "Pendente", color: "bg-yellow-500", textColor: "text-white" };
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

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, differenceInDays } from "date-fns";
import type { Dose } from "@/lib/data";

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

export function formatDate(date: Date | string) {
  return format(new Date(date), "dd/MM/yyyy");
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

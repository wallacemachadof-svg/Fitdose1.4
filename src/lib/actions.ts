
'use server';

import { calculateBmi } from "./utils";
import fs from 'fs';
import path from 'path';
import { addDays, isWeekend } from 'date-fns';

// --- Data Persistence Setup ---
const dataDir = path.join(process.cwd(), 'db');

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

const patientsFilePath = path.join(dataDir, 'patients.json');
const salesFilePath = path.join(dataDir, 'sales.json');
const cashFlowFilePath = path.join(dataDir, 'cashflow.json');
const vialsFilePath = path.join(dataDir, 'vials.json');
const settingsFilePath = path.join(dataDir, 'settings.json');
const migrationFilePath = path.join(dataDir, '.migration-check');

// --- Type Definitions ---
export type NutritionalAssessmentData = {
    wakeupTime: string;
    sleepTime: string;
    breakfastTime?: string;
    breakfastDescription?: string;
    morningSnackTime?: string;
    morningSnackDescription?: string;
    lunchTime?: string;
    lunchDescription?: string;
    afternoonSnackTime?: string;
    afternoonSnackDescription?: string;
    dinnerTime?: string;
    dinnerDescription?: string;
    eveningSnackTime?: string;
    eveningSnackDescription?: string;
    waterIntake: string;
    otherLiquids?: string;
    foodPreferences?: string;
    foodAversions?: string;
    weekendHabits?: string;
    dietExperience?: string;
    mainGoal: string;
    mainDifficulty: string;
    hasAllergies: 'yes' | 'no';
    allergiesDescription?: string;
    favoriteFoods?: string[];
    bowelFunction: string;
};

type MockData = {
    patients: Patient[];
    sales: Sale[];
    cashFlowEntries: CashFlowEntry[];
    vials: Vial[];
    settings: Settings;
};

const readData = (): MockData => {
    try {
        const patients = fs.existsSync(patientsFilePath) ? JSON.parse(fs.readFileSync(patientsFilePath, 'utf-8')) : [];
        const sales = fs.existsSync(salesFilePath) ? JSON.parse(fs.readFileSync(salesFilePath, 'utf-8')) : [];
        const cashFlowEntries = fs.existsSync(cashFlowFilePath) ? JSON.parse(fs.readFileSync(cashFlowFilePath, 'utf-8')) : [];
        const vials = fs.existsSync(vialsFilePath) ? JSON.parse(fs.readFileSync(vialsFilePath, 'utf-8')) : [];
        const settings = fs.existsSync(settingsFilePath) ? JSON.parse(fs.readFileSync(settingsFilePath, 'utf-8')) : { dosePrices: [], dailyLateFee: 0, rewards: { pointsPerDose: [], pointsToBrl: 10 } };

        
        // Dates are stored as strings in JSON, so we need to convert them back to Date objects
        patients.forEach((p: Patient) => {
            if (p.firstDoseDate) p.firstDoseDate = new Date(p.firstDoseDate);
            if (p.birthDate) p.birthDate = new Date(p.birthDate);
            if (p.consentDate) p.consentDate = new Date(p.consentDate);
            p.doses.forEach(d => {
                d.date = new Date(d.date);
                if (d.payment?.date) d.payment.date = new Date(d.payment.date);
                if (d.payment?.dueDate) d.payment.dueDate = new Date(d.payment.dueDate);
            });
            if (p.evolutions) {
              p.evolutions.forEach(e => e.date = new Date(e.date));
            } else {
              p.evolutions = [];
            }
             if (p.pointHistory) {
                p.pointHistory.forEach(ph => ph.date = new Date(ph.date));
            } else {
                p.pointHistory = [];
            }
        });
        sales.forEach((s: Sale) => {
            s.saleDate = new Date(s.saleDate);
            if (s.paymentDate) s.paymentDate = new Date(s.paymentDate);
            if (s.paymentDueDate) s.paymentDueDate = new Date(s.paymentDueDate);
            if (s.deliveries) {
                s.deliveries.forEach(d => {
                    if (d.deliveryDate) d.deliveryDate = new Date(d.deliveryDate);
                });
            }
        });
        cashFlowEntries.forEach((c: CashFlowEntry) => {
            c.purchaseDate = new Date(c.purchaseDate);
            if (c.dueDate) c.dueDate = new Date(c.dueDate);
        });
        vials.forEach((v: Vial) => {
            v.purchaseDate = new Date(v.purchaseDate);
        });

        return { patients, sales, cashFlowEntries, vials, settings };
    } catch (error) {
        // If files don't exist, return empty arrays
        return { patients: [], sales: [], cashFlowEntries: [], vials: [], settings: { dosePrices: [
            { dose: "2.5", price: 220 },
            { dose: "3.75", price: 330 },
            { dose: "5.0", price: 430 },
            { dose: "6.25", price: 540 },
            { dose: "7.05", price: 620 }
        ], dailyLateFee: 0, rewards: { pointsPerDose: [], pointsToBrl: 10 } } };
    }
};

const writeData = (data: Partial<MockData>) => {
    const currentData = readData();
    const newData = { ...currentData, ...data };
    
    if (data.patients) fs.writeFileSync(patientsFilePath, JSON.stringify(newData.patients, null, 2));
    if (data.sales) fs.writeFileSync(salesFilePath, JSON.stringify(newData.sales, null, 2));
    if (data.cashFlowEntries) fs.writeFileSync(cashFlowFilePath, JSON.stringify(newData.cashFlowEntries, null, 2));
    if (data.vials) fs.writeFileSync(vialsFilePath, JSON.stringify(newData.vials, null, 2));
    if (data.settings) fs.writeFileSync(settingsFilePath, JSON.stringify(newData.settings, null, 2));
};

const runMigration = () => {
    if (fs.existsSync(migrationFilePath)) {
        return; // Migration already ran
    }
    console.log("Running one-time data migration...");

    const allData = readData();
    const { patients, sales } = allData;
    let hasChanges = false;

    patients.forEach(patient => {
        const patientSales = sales
            .filter(s => s.patientId === patient.id && s.deliveryStatus === 'entregue')
            .sort((a, b) => new Date(a.saleDate).getTime() - new Date(b.saleDate).getTime());

        if (patientSales.length === 0) return;

        hasChanges = true;

        // Reset all doses to pending before reprocessing sales
        patient.doses.forEach(dose => {
            dose.status = 'pending';
        });
        const initialSchedule = generateDoseSchedule(patient.firstDoseDate || new Date());
        patient.doses = initialSchedule;
        

        let dosesAdministeredCount = 0;

        patientSales.forEach(sale => {
            let dosesToUpdateForThisSale = sale.quantity;
            
            for(let i = 0; i < patient.doses.length && dosesToUpdateForThisSale > 0; i++) {
                if (patient.doses[i].status === 'pending') {
                    const dose = patient.doses[i];
                    dose.status = 'administered';
                    dose.date = sale.deliveryDate || sale.saleDate;
                    
                    if (sale.bioimpedance?.weight) {
                        dose.weight = sale.bioimpedance.weight;
                        dose.bmi = sale.bioimpedance.bmi;
                    }
                    
                    if (!dose.payment) dose.payment = { status: 'pendente' };
                    dose.payment.status = sale.paymentStatus;
                    dose.payment.amount = sale.total / sale.quantity;
                    dose.payment.date = sale.paymentDate || (sale.paymentStatus === 'pago' ? sale.saleDate : undefined);
                    dose.payment.method = sale.paymentMethod;

                    dosesToUpdateForThisSale--;
                }
            }
        });

        // Final rescheduling pass
        patient.doses.sort((a,b) => a.doseNumber - b.doseNumber);
        for(let i = 1; i < patient.doses.length; i++) {
            if(patient.doses[i].status === 'pending') {
                const prevDoseDate = patient.doses[i-1].date;
                const newDate = new Date(prevDoseDate);
                newDate.setDate(newDate.getDate() + 7);
                patient.doses[i].date = newDate;
            }
        }
    });

    if (hasChanges) {
        writeData({ patients });
        console.log("Data migration completed successfully.");
    } else {
        console.log("No data migration needed.");
    }
    
    fs.writeFileSync(migrationFilePath, 'completed');
}


// --- Type Definitions ---

const generateDoseSchedule = (startDate: Date, totalDoses = 12, startDoseNumber = 1, administeredDoses: Dose[] = []): Dose[] => {
  const newDoses: Dose[] = [];
  
  const lastAdministeredDose = administeredDoses.length > 0 
      ? administeredDoses.sort((a,b) => b.doseNumber - a.doseNumber)[0]
      : null;

  let currentDate = lastAdministeredDose ? new Date(lastAdministeredDose.date) : new Date(startDate);
  if (lastAdministeredDose) {
      currentDate.setDate(currentDate.getDate() + 7);
  }

  const startingDoseNumber = lastAdministeredDose ? lastAdministeredDose.doseNumber + 1 : startDoseNumber;

  for (let i = startingDoseNumber; i <= totalDoses; i++) {
    newDoses.push({
      id: i,
      doseNumber: i,
      date: new Date(currentDate),
      status: 'pending',
      time: '10:00', // Default time
      payment: {
        status: 'pendente'
      }
    });
    currentDate.setDate(currentDate.getDate() + 7);
  }
  
  return [...administeredDoses, ...newDoses].sort((a,b) => a.doseNumber - b.doseNumber);
};

export type PointTransaction = {
    date: Date;
    description: string;
    points: number;
}

export type Patient = {
  id: string;
  fullName: string;
  age?: number;
  birthDate?: Date;
  initialWeight: number;
  height: number;
  desiredWeight?: number;
  firstDoseDate?: Date;
  serviceModel?: 'presencial' | 'online' | 'hibrido';
  address: {
    zip?: string;
    street?: string;
    number?: string;
    complement?: string;
    city?: string;
    state?: string;
  };
  phone?: string;
  healthContraindications?: string;
  avatarUrl?: string;
  doses: Dose[];
  evolutions: Evolution[];
  dailyMedications?: string;
  oralContraceptive?: 'yes' | 'no';
  usedMonjauro?: 'yes' | 'no';
  monjauroDose?: string;
  monjauroTime?: string;
  indication?: {
    type: 'indicado' | 'indicador';
    name: string;
    patientId?: string;
  };
  points: number;
  pointHistory: PointTransaction[];
  consentGiven: boolean;
  consentDate?: Date;
  defaultPrice?: number;
  defaultDose?: string;
  nutritionalAssessmentData?: NutritionalAssessmentData;
  nutritionalAssessmentStatus?: 'pending' | 'completed' | 'available';
  foodPlanStatus?: 'pending' | 'available' | 'sent';
};

export type NewPatientData = Partial<Omit<Patient, 'id' | 'doses' | 'evolutions' | 'points' | 'pointHistory' | 'consentDate'>> & {
    fullName: string;
    initialWeight: number;
    height: number;
};
export type UpdatePatientData = Partial<Omit<Patient, 'id' | 'doses' | 'evolutions' | 'points' | 'pointHistory' | 'consentDate'>>;


export type Dose = {
  id: number;
  doseNumber: number;
  date: Date;
  time?: string;
  weight?: number;
  bmi?: number;
  administeredDose?: number;
  payment: {
    status: 'pago' | 'pendente';
    date?: Date;
    dueDate?: Date;
    method?: "dinheiro" | "pix" | "debito" | "credito" | "credito_parcelado" | "payment_link";
    installments?: number;
    amount?: number;
  };
  status: 'administered' | 'pending';
};

export type Bioimpedance = {
    weight?: number;
    bmi?: number;
    fatPercentage?: number;
    skeletalMusclePercentage?: number;
    visceralFat?: number;
    hydration?: number;
    metabolism?: number;
    obesityPercentage?: number;
    boneMass?: number;
    protein?: number;
};

export type Evolution = {
    id: string;
    date: Date;
    notes?: string;
    photoUrl?: string;
    bioimpedance?: Bioimpedance;
};
export type NewEvolutionData = Omit<Evolution, 'id' | 'date'>;

export type VialUsage = {
    vialId: string;
    mgUsed: number;
};

export type Delivery = {
  doseNumber: number;
  status: 'em agendamento' | 'entregue' | 'em processamento';
  deliveryDate?: Date;
}

export type Sale = {
  id: string;
  saleDate: Date;
  soldDose: string;
  quantity: number;
  price: number;
  discountPerDose?: number;
  total: number;
  patientId: string;
  patientName: string;
  serviceModel?: 'presencial' | 'online' | 'hibrido';
  paymentDate?: Date;
  paymentDueDate?: Date;
  paymentStatus: 'pago' | 'pendente';
  cashFlowMethod: 'unique' | 'installments';
  deliveries: Delivery[];
  observations?: string;
  pointsUsed?: number;
  paymentMethod?: "dinheiro" | "pix" | "debito" | "credito" | 'credito_parcelado' | "payment_link";
  installments?: number;
  operatorFee?: number;
  bioimpedance?: Bioimpedance;
  vialUsage?: VialUsage[];
  deliveryStatus?: 'em agendamento' | 'entregue' | 'em processamento'; // Legacy
  deliveryDate?: Date; // Legacy
};

export type NewSaleData = Omit<Sale, 'id' | 'patientName' | 'deliveries'> & {
  bioimpedance?: Bioimpedance;
  deliveries: Delivery[];
};


export type CashFlowEntry = {
  id: string;
  type: 'entrada' | 'saida';
  purchaseDate: Date;
  description: string;
  installments?: string; // e.g., "1/3"
  dueDate?: Date;
  paymentMethod?: 'pix' | 'dinheiro' | 'debito' | 'credito' | 'credito_parcelado' | 'payment_link';
  status: 'pago' | 'pendente' | 'vencido';
  amount: number;
}

export type NewCashFlowData = {
    type: 'entrada' | 'saida';
    purchaseDate: Date;
    description: string;
    amount: number;
    paymentMethod: 'pix' | 'dinheiro' | 'debito' | 'credito' | 'credito_parcelado' | 'payment_link';
    status: 'pago' | 'pendente' | 'vencido';
    dueDate?: Date;
    installments?: number;
};

export type UpdateCashFlowData = Partial<Omit<NewCashFlowData, 'installments'>>;


export type Vial = {
  id: string;
  purchaseDate: Date;
  totalMg: 40 | 60 | 90;
  cost: number;
  remainingMg: number;
  soldMg: number;
  cashFlowEntryId?: string;
};

export type NewVialData = Omit<Vial, 'id' | 'remainingMg' | 'soldMg' | 'cashFlowEntryId'> & {
    quantity: number;
};

export type DosePrice = {
    dose: string;
    price: number;
};

export type DosePoints = {
  dose: string;
  points: number;
};

export type RewardsSettings = {
  pointsPerDose: DosePoints[];
  pointsToBrl: number;
};

export type Settings = {
    dosePrices: DosePrice[];
    dailyLateFee?: number;
    rewards: RewardsSettings;
};

export type StockForecast = {
  ruptureDate: Date | null;
  purchaseDeadline: Date | null;
  totalPendingMg: number;
};

// --- Data Access Functions ---

export const getPatients = async (): Promise<Patient[]> => {
    // runMigration(); // Migration no longer needed for delivery status
    await new Promise(resolve => setTimeout(resolve, 100)); // simulate async
    const { patients } = readData();
    return [...patients].sort((a,b) => a.fullName.localeCompare(b.fullName));
}

export const getPatientById = async (id: string): Promise<Patient | null> => {
    await new Promise(resolve => setTimeout(resolve, 100));
    const { patients } = readData();
    return patients.find(p => p.id === id) ?? null;
}

export const addPatient = async (patientData: NewPatientData): Promise<Patient> => {
    const data = readData();
    const newId = (data.patients.length > 0 ? Math.max(...data.patients.map(p => parseInt(p.id, 10))) : 0) + 1;
    
    const firstDoseDate = patientData.firstDoseDate || new Date();

    const doses = generateDoseSchedule(firstDoseDate);

    const newPatient: Patient = {
        id: String(newId),
        fullName: patientData.fullName,
        age: patientData.age,
        birthDate: patientData.birthDate,
        initialWeight: patientData.initialWeight,
        height: patientData.height,
        desiredWeight: patientData.desiredWeight,
        firstDoseDate: firstDoseDate,
        serviceModel: patientData.serviceModel,
        address: {
            zip: patientData.address?.zip,
            street: patientData.address?.street,
            number: patientData.address?.number,
            city: patientData.address?.city,
            state: patientData.address?.state,
        },
        phone: patientData.phone,
        healthContraindications: patientData.healthContraindications ?? "Nenhuma observação.",
        avatarUrl: patientData.avatarUrl || `https://i.pravatar.cc/150?u=${newId}`,
        doses: doses,
        evolutions: [],
        dailyMedications: patientData.dailyMedications,
        oralContraceptive: patientData.oralContraceptive,
        usedMonjauro: patientData.usedMonjauro,
        monjauroDose: patientData.monjauroDose,
        monjauroTime: patientData.monjauroTime,
        indication: patientData.indication,
        points: 0,
        pointHistory: [],
        consentGiven: patientData.consentGiven || false,
        consentDate: patientData.consentGiven ? new Date() : undefined,
        nutritionalAssessmentStatus: 'pending',
        foodPlanStatus: 'pending',
    };

    data.patients.push(newPatient);
    
    // --- Handle Indication Points ---
    if (newPatient.indication?.type === 'indicado' && newPatient.indication.patientId) {
        const referrerIndex = data.patients.findIndex(p => p.id === newPatient.indication!.patientId);
        if (referrerIndex !== -1) {
            const referrer = data.patients[referrerIndex];
            const settings = data.settings;
            // Assuming 120 points for a successful referral, this can be made configurable
            const referralPoints = 120; 
            
            if (!referrer.points) referrer.points = 0;
            if (!referrer.pointHistory) referrer.pointHistory = [];

            referrer.points += referralPoints;
            referrer.pointHistory.push({
                date: new Date(),
                description: `Indicação de ${newPatient.fullName}`,
                points: referralPoints,
            });
            data.patients[referrerIndex] = referrer;
        }
    }
    
    writeData({ patients: data.patients });
    
    await new Promise(resolve => setTimeout(resolve, 100));
    return newPatient;
};

export const updatePatient = async (id: string, patientData: UpdatePatientData): Promise<Patient> => {
    const data = readData();
    const patientIndex = data.patients.findIndex(p => p.id === id);

    if (patientIndex === -1) {
        throw new Error("Patient not found");
    }

    const originalPatient = data.patients[patientIndex];

    const updatedPatient: Patient = {
        ...originalPatient,
        ...patientData,
        avatarUrl: patientData.avatarUrl ?? originalPatient.avatarUrl,
        address: {
            ...originalPatient.address,
            ...patientData.address,
        }
    };
    
    const oldFirstDoseDate = originalPatient.firstDoseDate ? new Date(originalPatient.firstDoseDate).getTime() : 0;
    const newFirstDoseDate = updatedPatient.firstDoseDate ? new Date(updatedPatient.firstDoseDate).getTime() : 0;

    if (newFirstDoseDate !== oldFirstDoseDate) {
        const administeredDoses = originalPatient.doses.filter(d => d.status === 'administered');
        updatedPatient.doses = generateDoseSchedule(new Date(newFirstDoseDate), 12, 1, administeredDoses);
    }


    data.patients[patientIndex] = updatedPatient;
    writeData({ patients: data.patients });

    await new Promise(resolve => setTimeout(resolve, 100));
    return updatedPatient;
};

export const saveNutritionalAssessment = async (patientId: string, assessmentData: NutritionalAssessmentData): Promise<Patient> => {
    const data = readData();
    const patientIndex = data.patients.findIndex(p => p.id === patientId);
    if (patientIndex === -1) {
        throw new Error("Paciente não encontrado.");
    }
    
    const patient = data.patients[patientIndex];
    patient.nutritionalAssessmentData = assessmentData;
    patient.nutritionalAssessmentStatus = 'completed';
    // When form is submitted, the plan is now available to be created.
    patient.foodPlanStatus = 'available';

    data.patients[patientIndex] = patient;
    writeData({ patients: data.patients });

    await new Promise(resolve => setTimeout(resolve, 100));
    return patient;
};


export const deletePatient = async (id: string): Promise<void> => {
    const data = readData();
    const index = data.patients.findIndex(p => p.id === id);
    if (index !== -1) {
        data.patients.splice(index, 1);
        writeData({ patients: data.patients });
    } else {
        throw new Error("Patient not found");
    }
    await new Promise(resolve => setTimeout(resolve, 100));
};

export type DoseUpdateData = Partial<Omit<Dose, 'id' | 'doseNumber' | 'payment'>> & { payment?: Partial<Dose['payment']>};

export const updateDose = async (patientId: string, doseId: number, doseData: DoseUpdateData): Promise<Patient | null> => {
    const data = readData();
    const patientIndex = data.patients.findIndex(p => p.id === patientId);

    if (patientIndex === -1) return null;

    const patient = data.patients[patientIndex];
    let doseIndex = patient.doses.findIndex(d => d.id === doseId);

    if (doseIndex === -1) return null;
    
    patient.doses[doseIndex] = {
        ...patient.doses[doseIndex],
        ...doseData,
        date: doseData.date ? new Date(doseData.date) : patient.doses[doseIndex].date,
        payment: {
            ...patient.doses[doseIndex].payment,
            ...doseData.payment,
        }
    };
    
    // Sort doses by number to ensure correct order
    patient.doses.sort((a,b) => a.doseNumber - b.doseNumber);

    // Reschedule subsequent pending doses
    for (let i = doseIndex + 1; i < patient.doses.length; i++) {
        const prevDose = patient.doses[i - 1];
        const currentDose = patient.doses[i];
        
        if (currentDose.status === 'pending') {
            const newDate = new Date(prevDose.date);
            newDate.setDate(newDate.getDate() + 7);
            currentDose.date = newDate;
        }
    }

    data.patients[patientIndex] = patient;
    writeData({ patients: data.patients });

    await new Promise(resolve => setTimeout(resolve, 100));
    return patient;
};

export const updateDosePayment = async (patientId: string, doseId: number, paymentData: Partial<Dose['payment']>): Promise<Patient | null> => {
    const data = readData();
    const patientIndex = data.patients.findIndex(p => p.id === patientId);
    if (patientIndex === -1) throw new Error("Paciente não encontrado.");

    const patient = data.patients[patientIndex];
    const doseIndex = patient.doses.findIndex(d => d.id === doseId);
    if (doseIndex === -1) throw new Error("Dose não encontrada.");

    const originalStatus = patient.doses[doseIndex].payment.status;

    patient.doses[doseIndex].payment = {
        ...patient.doses[doseIndex].payment,
        ...paymentData,
    };
    
    // If payment status changed to 'pago', find the related cash flow entry and update it.
    if(originalStatus !== 'pago' && paymentData.status === 'pago') {
        const dose = patient.doses[doseIndex];
        const saleId = data.sales.find(s => s.patientId === patientId && s.saleDate.getTime() === dose.date.getTime())?.id;
        
        let cashFlowEntryId: string | undefined;
        if (saleId) {
            cashFlowEntryId = data.cashFlowEntries.find(cf => cf.id.startsWith(`sale-${saleId}`))?.id;
        } else {
            // Find manually created cash flow based on description and patient
            cashFlowEntryId = data.cashFlowEntries.find(cf => 
                cf.description.toLowerCase().includes(patient.fullName.toLowerCase()) && 
                cf.amount === dose.payment.amount
            )?.id;
        }

        if(cashFlowEntryId) {
            const cashFlowIndex = data.cashFlowEntries.findIndex(cf => cf.id === cashFlowEntryId);
            if(cashFlowIndex !== -1) {
                data.cashFlowEntries[cashFlowIndex].status = 'pago';
                data.cashFlowEntries[cashFlowIndex].purchaseDate = paymentData.date || new Date(); // Using payment date as purchase date for paid entries
                data.cashFlowEntries[cashFlowIndex].paymentMethod = paymentData.method;
            }
        }
    }


    data.patients[patientIndex] = patient;
    writeData({ patients: data.patients, cashFlowEntries: data.cashFlowEntries });
    return patient;
};


export const addPatientEvolution = async (patientId: string, evolutionData: NewEvolutionData): Promise<Patient> => {
    const data = readData();
    const patientIndex = data.patients.findIndex(p => p.id === patientId);
    if (patientIndex === -1) {
        throw new Error("Patient not found");
    }

    const patient = data.patients[patientIndex];
    const newEvolution: Evolution = {
        id: `evo-${Date.now()}`,
        date: new Date(),
        notes: evolutionData.notes,
        photoUrl: evolutionData.photoUrl,
        bioimpedance: evolutionData.bioimpedance,
    };

    if (!patient.evolutions) {
        patient.evolutions = [];
    }
    patient.evolutions.push(newEvolution);
    data.patients[patientIndex] = patient;
    writeData({ patients: data.patients });

    await new Promise(resolve => setTimeout(resolve, 100));
    return patient;
};

export const addBioimpedanceEntry = async (patientId: string, date: Date, bioimpedance: Bioimpedance): Promise<Patient> => {
    const data = readData();
    const patientIndex = data.patients.findIndex(p => p.id === patientId);
    if (patientIndex === -1) {
        throw new Error("Patient not found");
    }

    const patient = data.patients[patientIndex];
    
    if (!bioimpedance.bmi && bioimpedance.weight && patient.height) {
        bioimpedance.bmi = calculateBmi(bioimpedance.weight, patient.height / 100);
    }
    
    const newEvolution: Evolution = {
        id: `evo-manual-${Date.now()}`,
        date: date,
        notes: "Registro de bioimpedância manual.",
        bioimpedance: bioimpedance,
    };

    if (!patient.evolutions) {
        patient.evolutions = [];
    }
    patient.evolutions.push(newEvolution);

    // Also mark next pending dose as administered
    const nextPendingDoseIndex = patient.doses.findIndex(d => d.status === 'pending');
    if (nextPendingDoseIndex !== -1) {
        const doseToUpdate = patient.doses[nextPendingDoseIndex];
        doseToUpdate.status = 'administered';
        doseToUpdate.date = date; // Update dose date to the bioimpedance date
        doseToUpdate.weight = bioimpedance.weight;
        doseToUpdate.bmi = bioimpedance.bmi;

        // Reschedule subsequent doses
         for (let i = nextPendingDoseIndex + 1; i < patient.doses.length; i++) {
            const prevDose = patient.doses[i - 1];
            const newDate = new Date(prevDose.date);
            newDate.setDate(newDate.getDate() + 7);
            patient.doses[i].date = newDate;
        }
    }
    
    data.patients[patientIndex] = patient;
    writeData({ patients: data.patients });

    await new Promise(resolve => setTimeout(resolve, 100));
    return patient;
}

export const deleteBioimpedanceEntry = async (patientId: string, evolutionId: string): Promise<Patient> => {
    const data = readData();
    const patientIndex = data.patients.findIndex(p => p.id === patientId);
    if (patientIndex === -1) {
        throw new Error("Patient not found");
    }

    const patient = data.patients[patientIndex];
    const initialLength = patient.evolutions.length;
    
    patient.evolutions = patient.evolutions.filter(e => e.id !== evolutionId);

    if(patient.evolutions.length === initialLength && evolutionId !== 'initial-record'){
        throw new Error("Evolution entry not found");
    }

    data.patients[patientIndex] = patient;
    writeData({ patients: data.patients });
    await new Promise(resolve => setTimeout(resolve, 100));
    return patient;
}


export const getSales = async (): Promise<Sale[]> => {
  const { sales } = readData();
  await new Promise(resolve => setTimeout(resolve, 100));
  return [...sales].sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());
};

export const addSale = async (saleData: NewSaleData): Promise<Sale> => {
    const data = readData();
    const patientIndex = data.patients.findIndex(p => p.id === saleData.patientId);
    if (patientIndex === -1) {
        throw new Error("Paciente não encontrado");
    }
    const patient = data.patients[patientIndex];
    
    // --- Create Sale ---
    const newId = (data.sales.length > 0 ? Math.max(...data.sales.map(s => parseInt(s.id, 10))) : 0) + 1;
    const total = saleData.total;
    
    const newSale: Sale = {
        id: String(newId),
        ...saleData,
        patientName: patient.fullName,
        total: total,
        vialUsage: [], // Initially empty, populated on delivery
    };

    // --- Handle Bioimpedance ---
    const hasBioimpedance = saleData.bioimpedance && Object.values(saleData.bioimpedance).some(v => v !== undefined && v !== null);
    if (hasBioimpedance) {
        const bioimpedance = { ...saleData.bioimpedance };
        if (!bioimpedance.bmi && bioimpedance.weight && patient.height) {
            bioimpedance.bmi = calculateBmi(bioimpedance.weight, patient.height / 100);
        }
        
        const newEvolution: Evolution = {
            id: `evo-sale-${newSale.id}`,
            date: newSale.saleDate,
            notes: "Registro de bioimpedância no momento da venda.",
            bioimpedance: bioimpedance,
        };
        patient.evolutions.push(newEvolution);
    }
    
    // --- Handle Dose Updates (Payment & Administration) ---
    patient.doses.sort((a, b) => a.doseNumber - b.doseNumber);
    const pendingDoses = patient.doses.filter(d => d.status === 'pending');
    
    for (let i = 0; i < saleData.quantity; i++) {
        if (i < pendingDoses.length) {
            const doseToUpdate = pendingDoses[i];
            const deliveryInfo = saleData.deliveries.find(d => d.doseNumber === doseToUpdate.doseNumber);

            // Update payment status for all doses in the package
            if (!doseToUpdate.payment) doseToUpdate.payment = { status: 'pendente' };
            doseToUpdate.payment.status = newSale.paymentStatus;
            doseToUpdate.payment.date = newSale.paymentDate || (newSale.paymentStatus === 'pago' ? newSale.saleDate : undefined);
            doseToUpdate.payment.amount = newSale.total / saleData.quantity;
            doseToUpdate.payment.method = newSale.paymentMethod;
            doseToUpdate.payment.dueDate = newSale.paymentDueDate;
            doseToUpdate.payment.installments = newSale.installments;

            if (deliveryInfo && deliveryInfo.status === 'entregue' && deliveryInfo.deliveryDate) {
                 updateSaleDelivery(newSale.id, doseToUpdate.doseNumber, 'entregue', deliveryInfo.deliveryDate);
            }
        }
    }

    // --- Handle Points ---
    const settings = data.settings;
    const pointsConfig = settings.rewards?.pointsPerDose?.find(p => p.dose === saleData.soldDose);
    const pointsGained = (pointsConfig?.points ?? 0) * saleData.quantity;
    
    if (pointsGained > 0) {
        if(!patient.points) patient.points = 0;
        if(!patient.pointHistory) patient.pointHistory = [];

        patient.points += pointsGained;
        patient.pointHistory.push({
            date: new Date(),
            description: `Compra de ${saleData.quantity}x dose(s) de ${saleData.soldDose}mg`,
            points: pointsGained,
        });
    }
    
    if (saleData.pointsUsed && saleData.pointsUsed > 0) {
        if (patient.points < saleData.pointsUsed) {
            throw new Error('Pontos insuficientes para o resgate.');
        }
        patient.points -= saleData.pointsUsed;
        const brlValue = saleData.pointsUsed / (settings.rewards?.pointsToBrl || 10);
        patient.pointHistory.push({
            date: new Date(),
            description: `Resgate de R$${brlValue.toFixed(2)}`,
            points: -saleData.pointsUsed,
        });
    }
    
    // --- Create Cash Flow Entry ---
    if (newSale.paymentStatus === 'pago') {
        const netAmount = newSale.total - (newSale.operatorFee || 0);
        
        if (newSale.cashFlowMethod === 'installments' && newSale.installments && newSale.installments > 1 && newSale.paymentDate) {
            const installmentAmount = netAmount / newSale.installments;
            const firstDueDate = newSale.paymentDate;
            for (let i = 0; i < newSale.installments; i++) {
                const newDueDate = new Date(firstDueDate);
                newDueDate.setMonth(firstDueDate.getMonth() + i);
                data.cashFlowEntries.push({
                    id: `sale-${newSale.id}-${i}`,
                    type: 'entrada',
                    purchaseDate: newSale.saleDate,
                    description: `Venda p/ ${patient.fullName} (Parc. ${i + 1}/${newSale.installments})`,
                    amount: installmentAmount,
                    status: 'pendente', // Installments are pending until their due date
                    dueDate: newDueDate,
                    paymentMethod: newSale.paymentMethod,
                    installments: `${i + 1}/${newSale.installments}`,
                });
            }
        } else {
             let entryDate = newSale.paymentDate || newSale.saleDate;
             if (newSale.paymentMethod === 'credito_parcelado' || newSale.paymentMethod === 'credito') {
                 let nextBusinessDay = addDays(newSale.saleDate, 1);
                 while (isWeekend(nextBusinessDay)) {
                     nextBusinessDay = addDays(nextBusinessDay, 1);
                 }
                 entryDate = nextBusinessDay;
             }
             data.cashFlowEntries.push({
                id: `sale-${newSale.id}`,
                type: 'entrada',
                purchaseDate: entryDate,
                description: `Venda p/ ${patient.fullName}`,
                amount: netAmount,
                status: 'pago',
                paymentMethod: newSale.paymentMethod,
            });
        }
    } else if (newSale.paymentStatus === 'pendente') {
         data.cashFlowEntries.push({
            id: `sale-${newSale.id}`,
            type: 'entrada',
            purchaseDate: newSale.saleDate,
            description: `Venda p/ ${patient.fullName}`,
            amount: newSale.total,
            status: 'pendente',
            paymentMethod: newSale.paymentMethod,
            dueDate: newSale.paymentDueDate,
        });
    }
    
    data.sales.push(newSale);
    data.patients[patientIndex] = patient;

    writeData({ sales: data.sales, patients: data.patients, cashFlowEntries: data.cashFlowEntries, vials: data.vials });
    await new Promise(resolve => setTimeout(resolve, 100));
    return newSale;
};

export const deleteSale = async (id: string): Promise<void> => {
    const data = readData();
    const saleIndex = data.sales.findIndex(s => s.id === id);
    if (saleIndex !== -1) {
        data.sales.splice(saleIndex, 1);
    } else {
        throw new Error("Venda não encontrada");
    }

    // Remove all related cash flow entries (unique and installments)
    const saleIdPrefix = `sale-${id}`;
    data.cashFlowEntries = data.cashFlowEntries.filter(cf => !cf.id.startsWith(saleIdPrefix));

    writeData({ sales: data.sales, cashFlowEntries: data.cashFlowEntries });
    await new Promise(resolve => setTimeout(resolve, 100));
};

export const updateSaleDelivery = async (saleId: string, doseNumber: number, newStatus: Delivery['status'], deliveryDate?: Date): Promise<Sale> => {
    const data = readData();
    const saleIndex = data.sales.findIndex(s => s.id === saleId);
    if (saleIndex === -1) throw new Error("Venda não encontrada.");
    
    const sale = data.sales[saleIndex];
    const delivery = sale.deliveries.find(d => d.doseNumber === doseNumber);
    if (!delivery) throw new Error("Entrega da dose não encontrada na venda.");

    const originalStatus = delivery.status;
    delivery.status = newStatus;
    delivery.deliveryDate = newStatus === 'entregue' ? (deliveryDate || new Date()) : undefined;

    // --- STOCK & PATIENT DOSE LOGIC ---
    if (newStatus === 'entregue' && originalStatus !== 'entregue') {
        const patientIndex = data.patients.findIndex(p => p.id === sale.patientId);
        if (patientIndex === -1) throw new Error("Paciente da venda não encontrado.");
        
        const patient = data.patients[patientIndex];
        const dose = patient.doses.find(d => d.doseNumber === doseNumber);
        if (!dose) throw new Error("Dose correspondente na agenda do paciente não encontrada.");

        const mgUsed = parseFloat(sale.soldDose);
        if (isNaN(mgUsed)) throw new Error("Dose vendida inválida.");

        // Deduct from physical stock
        const sortedVials = data.vials.sort((a, b) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime());
        let remainingToDeduct = mgUsed;

        for (const vial of sortedVials) {
            if (remainingToDeduct > 0 && vial.remainingMg > 0) {
                const amountToDeduct = Math.min(vial.remainingMg, remainingToDeduct);
                
                vial.remainingMg -= amountToDeduct;
                vial.soldMg += amountToDeduct;
                remainingToDeduct -= amountToDeduct;

                if (!sale.vialUsage) sale.vialUsage = [];
                const existingUsageIndex = sale.vialUsage.findIndex(vu => vu.vialId === vial.id);
                if (existingUsageIndex !== -1) {
                    sale.vialUsage[existingUsageIndex].mgUsed += amountToDeduct;
                } else {
                    sale.vialUsage.push({ vialId: vial.id, mgUsed: amountToDeduct });
                }
            }
        }

        if (remainingToDeduct > 0) {
            // This should not happen if stock is sufficient, but we throw error to alert the user.
             throw new Error(`Estoque insuficiente para a dose de ${mgUsed}mg. Faltam ${remainingToDeduct}mg.`);
        }

        // Update patient's dose
        dose.status = 'administered';
        dose.date = delivery.deliveryDate!;
        dose.administeredDose = mgUsed;
        
        // Reschedule subsequent doses
        patient.doses.sort((a,b) => a.doseNumber - b.doseNumber);
        const doseIndex = patient.doses.findIndex(d => d.doseNumber === doseNumber);
        for (let i = doseIndex + 1; i < patient.doses.length; i++) {
            if (patient.doses[i].status === 'pending') {
                const prevDoseDate = patient.doses[i-1].date;
                const newDate = new Date(prevDoseDate);
                newDate.setDate(newDate.getDate() + 7);
                patient.doses[i].date = newDate;
            }
        }

        data.patients[patientIndex] = patient;
    }
    
    data.sales[saleIndex] = sale;
    writeData({ sales: data.sales, patients: data.patients, vials: data.vials });

    await new Promise(resolve => setTimeout(resolve, 100));
    return sale;
}
    
export const getCashFlowEntries = async (): Promise<CashFlowEntry[]> => {
  const { cashFlowEntries } = readData();
  await new Promise(resolve => setTimeout(resolve, 100));
  return [...cashFlowEntries].sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
}

export const getCashFlowEntryById = async (id: string): Promise<CashFlowEntry | null> => {
    const { cashFlowEntries } = readData();
    await new Promise(resolve => setTimeout(resolve, 100));
    return cashFlowEntries.find(entry => entry.id === id) || null;
}


export const addCashFlowEntry = async (entryData: NewCashFlowData): Promise<CashFlowEntry[]> => {
    const data = readData();
    const newEntries: CashFlowEntry[] = [];

    if (entryData.paymentMethod === 'credito_parcelado' && entryData.installments && entryData.installments > 1 && entryData.dueDate) {
        const installmentAmount = entryData.amount / entryData.installments;
        const firstDueDate = new Date(entryData.dueDate);

        for (let i = 0; i < entryData.installments; i++) {
            const newDueDate = new Date(firstDueDate);
            newDueDate.setMonth(firstDueDate.getMonth() + i);

            const newId = `manual-${Date.now()}-${i}`;
            const newEntry: CashFlowEntry = {
                id: newId,
                type: entryData.type,
                purchaseDate: entryData.purchaseDate,
                description: `${entryData.description} (Parcela ${i + 1}/${entryData.installments})`,
                amount: installmentAmount,
                status: 'pendente',
                paymentMethod: entryData.paymentMethod,
                dueDate: newDueDate,
                installments: `${i + 1}/${entryData.installments}`,
            };
            newEntries.push(newEntry);
            data.cashFlowEntries.push(newEntry);
        }

    } else {
        const newId = `manual-${Date.now()}`;
        const newEntry: CashFlowEntry = {
            id: newId,
            type: entryData.type,
            purchaseDate: entryData.purchaseDate,
            description: entryData.description,
            amount: entryData.amount,
            status: entryData.status,
            paymentMethod: entryData.paymentMethod,
            dueDate: entryData.dueDate,
        };
        newEntries.push(newEntry);
        data.cashFlowEntries.push(newEntry);
    }
    
    writeData({ cashFlowEntries: data.cashFlowEntries });
    await new Promise(resolve => setTimeout(resolve, 100));
    return newEntries;
}

export const updateCashFlowEntry = async (id: string, updateData: UpdateCashFlowData): Promise<CashFlowEntry> => {
    const data = readData();
    const entryIndex = data.cashFlowEntries.findIndex(e => e.id === id);

    if (entryIndex === -1) {
        throw new Error("Lançamento não encontrado.");
    }
    
    const updatedEntry: CashFlowEntry = {
        ...data.cashFlowEntries[entryIndex],
        ...updateData,
    };

    data.cashFlowEntries[entryIndex] = updatedEntry;
    writeData({ cashFlowEntries: data.cashFlowEntries });

    await new Promise(resolve => setTimeout(resolve, 100));
    return updatedEntry;
}


export const deleteCashFlowEntry = async (id: string): Promise<void> => {
    const data = readData();
    const index = data.cashFlowEntries.findIndex(e => e.id === id);
    if (index !== -1) {
        data.cashFlowEntries.splice(index, 1);
    } else {
        throw new Error("Lançamento não encontrado no fluxo de caixa");
    }
    writeData({ cashFlowEntries: data.cashFlowEntries });
    await new Promise(resolve => setTimeout(resolve, 100));
};

export const getVials = async (): Promise<Vial[]> => {
    const { vials } = readData();
    await new Promise(resolve => setTimeout(resolve, 100));
    return [...vials].sort((a,b) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime());
}

export const addVial = async (vialData: NewVialData): Promise<Vial[]> => {
    const data = readData();
    const newVials: Vial[] = [];
    const cashFlowEntryId = `vial-purchase-${Date.now()}`;
    
    for (let i = 0; i < vialData.quantity; i++) {
        const newId = `vial-${Date.now()}-${i}`;
        const newVial: Vial = {
            id: newId,
            purchaseDate: vialData.purchaseDate,
            totalMg: vialData.totalMg,
            cost: vialData.cost,
            remainingMg: vialData.totalMg,
            soldMg: 0,
            cashFlowEntryId: cashFlowEntryId,
        };
        newVials.push(newVial);
        data.vials.push(newVial);
    }
    
    const cashFlowEntry: CashFlowEntry = {
        id: cashFlowEntryId,
        type: 'saida',
        purchaseDate: vialData.purchaseDate,
        description: `Compra ${vialData.quantity}x frasco ${vialData.totalMg}mg`,
        amount: vialData.cost * vialData.quantity,
        status: 'pago',
        paymentMethod: 'pix'
    };
    
    data.cashFlowEntries.push(cashFlowEntry);
    
    writeData({ vials: data.vials, cashFlowEntries: data.cashFlowEntries });
    await new Promise(resolve => setTimeout(resolve, 100));
    return newVials;
}

export const updateVialDetails = async (vialId: string, newDetails: { purchaseDate: Date, totalMg: 40 | 60 | 90, cost: number }): Promise<Vial> => {
    const data = readData();
    const vialIndex = data.vials.findIndex(v => v.id === vialId);
    if (vialIndex === -1) {
        throw new Error("Frasco não encontrado.");
    }
    
    const vial = data.vials[vialIndex];

    // Check if totalMg change is valid
    if (newDetails.totalMg < vial.soldMg) {
        throw new Error(`A nova dosagem total (${newDetails.totalMg}mg) não pode ser menor que a quantidade já vendida (${vial.soldMg}mg).`);
    }

    // Update vial details
    vial.purchaseDate = newDetails.purchaseDate;
    vial.totalMg = newDetails.totalMg;
    vial.cost = newDetails.cost;
    vial.remainingMg = newDetails.totalMg - vial.soldMg;

    // Update corresponding cash flow entry
    if (vial.cashFlowEntryId) {
        const cashFlowIndex = data.cashFlowEntries.findIndex(cf => cf.id === vial.cashFlowEntryId);
        if (cashFlowIndex !== -1) {
            data.cashFlowEntries[cashFlowIndex].purchaseDate = newDetails.purchaseDate;
            data.cashFlowEntries[cashFlowIndex].description = `Compra 1x frasco ${newDetails.totalMg}mg`; // Assuming quantity is 1 for editing
            data.cashFlowEntries[cashFlowIndex].amount = newDetails.cost;
        }
    }

    data.vials[vialIndex] = vial;
    writeData({ vials: data.vials, cashFlowEntries: data.cashFlowEntries });

    await new Promise(resolve => setTimeout(resolve, 100));
    return vial;
};


export const adjustVialStock = async (vialId: string, newRemainingMg: number, reason: string): Promise<Vial> => {
    const data = readData();
    const vialIndex = data.vials.findIndex(v => v.id === vialId);
    if (vialIndex === -1) {
        throw new Error("Frasco não encontrado.");
    }
    const vial = data.vials[vialIndex];
    if (newRemainingMg > vial.totalMg || newRemainingMg < 0) {
        throw new Error("A nova quantidade é inválida.");
    }

    const difference = vial.remainingMg - newRemainingMg;
    
    vial.remainingMg = newRemainingMg;
    vial.soldMg = vial.totalMg - newRemainingMg;

    if (difference !== 0) {
        const costPerMg = vial.cost / vial.totalMg;
        const lossAmount = difference * costPerMg;

        const adjustmentEntry: NewCashFlowData = {
            type: 'saida',
            purchaseDate: new Date(),
            description: `Ajuste de estoque (${vial.id}): ${reason}`,
            amount: Math.abs(lossAmount),
            status: 'pago',
            paymentMethod: 'pix', // Defaulting to pix for simplicity
        };
         const newId = `manual-${Date.now()}`;
         const newEntry: CashFlowEntry = { id: newId, ...adjustmentEntry, installments: undefined };
         data.cashFlowEntries.push(newEntry);
    }
    
    data.vials[vialIndex] = vial;
    writeData({ vials: data.vials, cashFlowEntries: data.cashFlowEntries });

    await new Promise(resolve => setTimeout(resolve, 100));
    return vial;
}


export const getSettings = async (): Promise<Settings> => {
    const { settings } = readData();
    await new Promise(resolve => setTimeout(resolve, 100));
    return settings;
}

export const updateSettings = async (newSettings: Partial<Settings>): Promise<Settings> => {
    const data = readData();
    const updatedSettings = { ...data.settings, ...newSettings };
    writeData({ settings: updatedSettings });
    await new Promise(resolve => setTimeout(resolve, 100));
    return updatedSettings;
};


export const resetAllData = async (): Promise<void> => {
    const emptyData: Partial<MockData> = {
        patients: [],
        sales: [],
        cashFlowEntries: [],
        vials: [],
        settings: {
            dosePrices: [
                { dose: "2.5", price: 220 },
                { dose: "3.75", price: 330 },
                { dose: "5.0", price: 430 },
                { dose: "6.25", price: 540 },
                { dose: "7.05", price: 620 }
            ],
            dailyLateFee: 0,
            rewards: {
                pointsPerDose: [],
                pointsToBrl: 10,
            }
        }
    };
    writeData(emptyData);
    if (fs.existsSync(migrationFilePath)) {
        fs.unlinkSync(migrationFilePath);
    }
    await new Promise(resolve => setTimeout(resolve, 100));
}

export const getStockForecast = async (deliveryLeadTimeDays: number): Promise<StockForecast> => {
    const { patients, vials } = readData();
    let currentStockMg = vials.reduce((acc, v) => acc + v.remainingMg, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate demand from ALL future pending doses across all patients
    const futureDoses = patients.flatMap(patient => 
        patient.doses
            .filter(d => d.status === 'pending' && new Date(d.date) >= today)
            .map(dose => ({
                date: new Date(dose.date),
                mg: dose.administeredDose || parseFloat(patient.defaultDose || '2.5')
            }))
    ).filter(d => !isNaN(d.mg)).sort((a, b) => a.date.getTime() - b.date.getTime());

    const totalPendingMg = futureDoses.reduce((acc, dose) => acc + dose.mg, 0);

    if (currentStockMg <= 0 && totalPendingMg > 0) {
        const firstDemandDate = futureDoses[0].date;
        const purchaseDeadline = new Date(firstDemandDate);
        purchaseDeadline.setDate(purchaseDeadline.getDate() - deliveryLeadTimeDays);
        return { ruptureDate: firstDemandDate, purchaseDeadline, totalPendingMg };
    }
     if (totalPendingMg === 0) {
        return { ruptureDate: null, purchaseDeadline: null, totalPendingMg };
    }
    
    let ruptureDate: Date | null = null;
    let tempStock = currentStockMg;
    for (const dose of futureDoses) {
        tempStock -= dose.mg;
        if (tempStock <= 0) {
            ruptureDate = dose.date;
            break;
        }
    }
    
    if (ruptureDate) {
        const purchaseDeadline = new Date(ruptureDate);
        purchaseDeadline.setDate(purchaseDeadline.getDate() - deliveryLeadTimeDays);
        return { ruptureDate, purchaseDeadline, totalPendingMg };
    }

    return { ruptureDate: null, purchaseDeadline: null, totalPendingMg };
}

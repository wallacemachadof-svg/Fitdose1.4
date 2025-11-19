
'use server';

import { calculateBmi } from "./utils";
import fs from 'fs';
import path from 'path';

// --- Data Persistence Setup ---
const dataDir = path.join(process.cwd(), 'db');

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

const patientsFilePath = path.join(dataDir, 'patients.json');
const salesFilePath = path.join(dataDir, 'sales.json');
const cashFlowFilePath = path.join(dataDir, 'cashflow.json');
const vialsFilePath = path.join(dataDir, 'vials.json');

type MockData = {
    patients: Patient[];
    sales: Sale[];
    cashFlowEntries: CashFlowEntry[];
    vials: Vial[];
};

const readData = (): MockData => {
    try {
        const patients = fs.existsSync(patientsFilePath) ? JSON.parse(fs.readFileSync(patientsFilePath, 'utf-8')) : [];
        const sales = fs.existsSync(salesFilePath) ? JSON.parse(fs.readFileSync(salesFilePath, 'utf-8')) : [];
        const cashFlowEntries = fs.existsSync(cashFlowFilePath) ? JSON.parse(fs.readFileSync(cashFlowFilePath, 'utf-8')) : [];
        const vials = fs.existsSync(vialsFilePath) ? JSON.parse(fs.readFileSync(vialsFilePath, 'utf-8')) : [];
        
        // Dates are stored as strings in JSON, so we need to convert them back to Date objects
        patients.forEach((p: Patient) => {
            p.firstDoseDate = new Date(p.firstDoseDate);
            p.doses.forEach(d => d.date = new Date(d.date));
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
            if (s.deliveryDate) s.deliveryDate = new Date(s.deliveryDate);
        });
        cashFlowEntries.forEach((c: CashFlowEntry) => {
            c.purchaseDate = new Date(c.purchaseDate);
            if (c.dueDate) c.dueDate = new Date(c.dueDate);
        });
        vials.forEach((v: Vial) => {
            v.purchaseDate = new Date(v.purchaseDate);
        });

        return { patients, sales, cashFlowEntries, vials };
    } catch (error) {
        // If files don't exist, return empty arrays
        return { patients: [], sales: [], cashFlowEntries: [], vials: [] };
    }
};

const writeData = (data: MockData) => {
    fs.writeFileSync(patientsFilePath, JSON.stringify(data.patients, null, 2));
    fs.writeFileSync(salesFilePath, JSON.stringify(data.sales, null, 2));
    fs.writeFileSync(cashFlowFilePath, JSON.stringify(data.cashFlowEntries, null, 2));
    fs.writeFileSync(vialsFilePath, JSON.stringify(data.vials, null, 2));
};

// --- Type Definitions ---

const generateDoseSchedule = (startDate: Date): Dose[] => {
  const doses: Dose[] = [];
  let currentDate = new Date(startDate);
  for (let i = 1; i <= 12; i++) {
    doses.push({
      id: i,
      doseNumber: i,
      date: new Date(currentDate),
      status: 'pending',
      time: '10:00', // Default time
    });
    currentDate.setDate(currentDate.getDate() + 7);
  }
  return doses;
};

export type PointTransaction = {
    date: Date;
    description: string;
    points: number;
}

export type Patient = {
  id: string;
  fullName: string;
  age: number;
  initialWeight: number;
  height: number;
  desiredWeight: number;
  firstDoseDate: Date;
  address: {
    zip: string;
    street: string;
    number: string;
    complement?: string;
    city: string;
    state: string;
  };
  phone: string;
  healthContraindications: string;
  avatarUrl: string;
  doses: Dose[];
  evolutions: Evolution[];
  dailyMedications: string;
  oralContraceptive?: 'yes' | 'no';
  usedMonjauro?: 'yes' | 'no';
  monjauroDose: string;
  monjauroTime: string;
  indication?: {
    type: 'indicado' | 'indicador' | 'nao_se_aplica';
    name: string;
    patientId?: string;
  };
  points: number;
  pointHistory: PointTransaction[];
};

export type NewPatientData = Omit<Patient, 'id' | 'doses' | 'evolutions' | 'points' | 'pointHistory'>;
export type UpdatePatientData = Omit<Patient, 'id' | 'doses' | 'evolutions' | 'points' | 'pointHistory'>;


export type Dose = {
  id: number;
  doseNumber: number;
  date: Date;
  time?: string;
  weight?: number;
  bmi?: number;
  administeredDose?: number;
  payment?: {
    method: "cash" | "pix" | "debit" | "credit" | "payment_link";
    installments?: number;
    amount?: number;
  };
  status: 'administered' | 'pending';
};

export type Bioimpedance = {
    fatPercentage?: number;
    muscleMass?: number;
    visceralFat?: number;
    metabolicAge?: number;
    hydration?: number;
}

export type Evolution = {
    id: string;
    date: Date;
    notes: string;
    photoUrl?: string;
    bioimpedance?: Bioimpedance;
};
export type NewEvolutionData = Omit<Evolution, 'id' | 'date'>;


export type Sale = {
  id: string;
  saleDate: Date;
  soldDose: string;
  price: number;
  discount?: number;
  total: number;
  patientId: string;
  patientName: string;
  paymentDate?: Date;
  paymentStatus: 'pago' | 'pendente';
  deliveryStatus: 'em agendamento' | 'entregue' | 'em processamento';
  observations?: string;
  deliveryDate?: Date;
  pointsUsed?: number;
};

export type NewSaleData = Omit<Sale, 'id' | 'patientName'>;

export type CashFlowEntry = {
  id: string;
  type: 'entrada' | 'saida';
  purchaseDate: Date;
  description: string;
  installments?: string; // e.g., "1/3"
  dueDate?: Date;
  paymentMethod?: 'pix' | 'dinheiro' | 'debito' | 'credito' | 'payment_link';
  status: 'pago' | 'pendente' | 'vencido';
  amount: number;
}
export type NewCashFlowData = Omit<CashFlowEntry, 'id'>;

export type Vial = {
  id: string;
  purchaseDate: Date;
  totalMg: 40 | 60 | 90;
  cost: number;
  remainingMg: number;
  soldMg: number;
};

export type NewVialData = Omit<Vial, 'id' | 'remainingMg' | 'soldMg'> & {
    quantity: number;
};

// --- Data Access Functions ---

export const getPatients = async (): Promise<Patient[]> => {
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
    
    const initialBmi = calculateBmi(patientData.initialWeight, patientData.height / 100);
    const doses = generateDoseSchedule(patientData.firstDoseDate).map(dose => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const doseDate = new Date(dose.date);
        doseDate.setHours(0, 0, 0, 0);

        if (doseDate < today) {
            return {
                ...dose,
                status: 'administered' as 'administered',
                weight: patientData.initialWeight,
                bmi: initialBmi,
                administeredDose: 2.5,
                payment: { method: 'pix' as 'pix', amount: 220 } 
            };
        }
        return dose;
    });

    const newPatient: Patient = {
        id: String(newId),
        fullName: patientData.fullName,
        age: patientData.age,
        initialWeight: patientData.initialWeight,
        height: patientData.height,
        desiredWeight: patientData.desiredWeight,
        firstDoseDate: patientData.firstDoseDate,
        address: { ...patientData.address },
        phone: patientData.phone,
        healthContraindications: patientData.healthContraindications ?? "Nenhuma observação.",
        avatarUrl: patientData.avatarUrl || `https://i.pravatar.cc/150?u=${newId}`,
        doses: doses,
        evolutions: [],
        dailyMedications: patientData.dailyMedications ?? '',
        oralContraceptive: patientData.oralContraceptive,
        usedMonjauro: patientData.usedMonjauro,
        monjauroDose: patientData.monjauroDose ?? '',
        monjauroTime: patientData.monjauroTime ?? '',
        indication: patientData.indication,
        points: 0,
        pointHistory: [],
    };

    data.patients.push(newPatient);
    writeData(data);
    
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
        ...originalPatient, // Keep original doses, evolutions, id
        fullName: patientData.fullName,
        age: patientData.age,
        initialWeight: patientData.initialWeight,
        height: patientData.height,
        desiredWeight: patientData.desiredWeight,
        firstDoseDate: patientData.firstDoseDate,
        address: { ...patientData.address },
        phone: patientData.phone,
        healthContraindications: patientData.healthContraindications,
        avatarUrl: patientData.avatarUrl || originalPatient.avatarUrl,
        dailyMedications: patientData.dailyMedications ?? '',
        oralContraceptive: patientData.oralContraceptive,
        usedMonjauro: patientData.usedMonjauro,
        monjauroDose: patientData.monjauroDose ?? '',
        monjauroTime: patientData.monjauroTime ?? '',
        indication: patientData.indication,
    };

    data.patients[patientIndex] = updatedPatient;
    writeData(data);

    await new Promise(resolve => setTimeout(resolve, 100));
    return updatedPatient;
};


export const deletePatient = async (id: string): Promise<void> => {
    const data = readData();
    const index = data.patients.findIndex(p => p.id === id);
    if (index !== -1) {
        data.patients.splice(index, 1);
        writeData(data);
    } else {
        throw new Error("Patient not found");
    }
    await new Promise(resolve => setTimeout(resolve, 100));
};

export type DoseUpdateData = Partial<Omit<Dose, 'id' | 'doseNumber'>>;

export const updateDose = async (patientId: string, doseId: number, doseData: DoseUpdateData): Promise<Patient | null> => {
    const data = readData();
    const patientIndex = data.patients.findIndex(p => p.id === patientId);

    if (patientIndex === -1) return null;

    const patient = data.patients[patientIndex];
    const doseIndex = patient.doses.findIndex(d => d.id === doseId);

    if (doseIndex === -1) return null;

    const originalDose = patient.doses[doseIndex];
    
    const updatedDose: Dose = {
        ...originalDose,
        ...doseData,
        date: doseData.date ? new Date(doseData.date) : originalDose.date,
    };
    
    if (updatedDose.status === 'administered' && updatedDose.weight) {
        updatedDose.bmi = calculateBmi(updatedDose.weight, patient.height / 100);
    }
     // Add payment amount if method is selected
    if(doseData.payment?.method && updatedDose.payment) {
        updatedDose.payment.amount = originalDose.payment?.amount || 0; // Default or calculate based on dose
    }

    patient.doses[doseIndex] = updatedDose;
    patient.doses.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    data.patients[patientIndex] = patient;
    writeData(data);

    await new Promise(resolve => setTimeout(resolve, 100));
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
    writeData(data);

    await new Promise(resolve => setTimeout(resolve, 100));
    return patient;
};


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

    const soldMg = parseFloat(saleData.soldDose);
    if (isNaN(soldMg)) {
        throw new Error("Dose vendida inválida.");
    }

    const totalRemainingMg = data.vials.reduce((acc, v) => acc + v.remainingMg, 0);
    if (totalRemainingMg < soldMg) {
        throw new Error(`Estoque insuficiente. Apenas ${totalRemainingMg.toFixed(2)}mg disponíveis.`);
    }

    // --- Update Stock ---
    const sortedVials = [...data.vials].sort((a, b) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime());
    let remainingToDeduct = soldMg;
    for (const vial of sortedVials) {
        if (remainingToDeduct <= 0) break;
        if (vial.remainingMg > 0) {
            const amountToDeduct = Math.min(vial.remainingMg, remainingToDeduct);
            vial.remainingMg -= amountToDeduct;
            vial.soldMg += amountToDeduct;
            remainingToDeduct -= amountToDeduct;
        }
    }
    
    // --- Create Sale ---
    const newId = (data.sales.length > 0 ? Math.max(...data.sales.map(s => parseInt(s.id, 10))) : 0) + 1;
    const total = (saleData.price || 0) - (saleData.discount || 0);
    
    const newSale: Sale = {
        id: String(newId),
        ...saleData,
        patientName: patient.fullName,
        total: total,
    };

    // --- Handle Points ---
    const pointsGained = soldMg * 4; // 1mg = 4 UI, 1 UI = 1 point
    patient.points = (patient.points || 0) + pointsGained;
    patient.pointHistory.push({
        date: new Date(),
        description: `Compra da dose ${saleData.soldDose}mg`,
        points: pointsGained,
    });
    
    if (saleData.pointsUsed && saleData.pointsUsed > 0) {
        if (patient.points < saleData.pointsUsed) {
            throw new Error('Pontos insuficientes para o resgate.');
        }
        patient.points -= saleData.pointsUsed;
        patient.pointHistory.push({
            date: new Date(),
            description: `Resgate de ${formatCurrency(saleData.discount || 0)}`,
            points: -saleData.pointsUsed,
        });
    }

    data.sales.push(newSale);
    data.patients[patientIndex] = patient;

    // --- Create Cash Flow Entry ---
    if (newSale.paymentStatus === 'pago') {
        const newCashFlowEntry: CashFlowEntry = {
            id: `sale-${newSale.id}`,
            type: 'entrada',
            purchaseDate: newSale.paymentDate || newSale.saleDate,
            description: `Venda p/ ${patient.fullName}`,
            amount: total,
            status: 'pago',
            paymentMethod: 'pix', // Placeholder, needs to be dynamic in a real app
        };
        data.cashFlowEntries.push(newCashFlowEntry);
    }
    
    writeData(data);
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

    const cashFlowEntryId = `sale-${id}`;
    const cashFlowIndex = data.cashFlowEntries.findIndex(cf => cf.id === cashFlowEntryId);
    if (cashFlowIndex !== -1) {
        data.cashFlowEntries.splice(cashFlowIndex, 1);
    }
    writeData(data);
    await new Promise(resolve => setTimeout(resolve, 100));
};
    
export const getCashFlowEntries = async (): Promise<CashFlowEntry[]> => {
  const { cashFlowEntries } = readData();
  await new Promise(resolve => setTimeout(resolve, 100));
  return [...cashFlowEntries].sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
}

export const addCashFlowEntry = async (entryData: NewCashFlowData): Promise<CashFlowEntry> => {
    const data = readData();
    const newId = `manual-${(data.cashFlowEntries.filter(e => e.id.startsWith('manual-')).length > 0 ? Math.max(...data.cashFlowEntries.filter(e => e.id.startsWith('manual-')).map(e => parseInt(e.id.replace('manual-',''), 10))) : 0) + 1}`;
    const newEntry: CashFlowEntry = { id: newId, ...entryData };
    data.cashFlowEntries.push(newEntry);
    writeData(data);
    await new Promise(resolve => setTimeout(resolve, 100));
    return newEntry;
}

export const deleteCashFlowEntry = async (id: string): Promise<void> => {
    const data = readData();
    const index = data.cashFlowEntries.findIndex(e => e.id === id);
    if (index !== -1) {
        data.cashFlowEntries.splice(index, 1);
        writeData(data);
    } else {
        throw new Error("Lançamento não encontrado no fluxo de caixa");
    }
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
    for (let i = 0; i < vialData.quantity; i++) {
        const newId = `vial-${Date.now()}-${i}`;
        const newVial: Vial = {
            id: newId,
            purchaseDate: vialData.purchaseDate,
            totalMg: vialData.totalMg,
            cost: vialData.cost,
            remainingMg: vialData.totalMg,
            soldMg: 0,
        };
        newVials.push(newVial);
        data.vials.push(newVial);
    }
    
    const cashFlowEntry: NewCashFlowData = {
        type: 'saida',
        purchaseDate: vialData.purchaseDate,
        description: `Compra ${vialData.quantity}x frasco ${vialData.totalMg}mg`,
        amount: vialData.cost * vialData.quantity,
        status: 'pago',
        paymentMethod: 'pix'
    };
    
    const newId = `manual-${(data.cashFlowEntries.filter(e => e.id.startsWith('manual-')).length > 0 ? Math.max(...data.cashFlowEntries.filter(e => e.id.startsWith('manual-')).map(e => parseInt(e.id.replace('manual-',''), 10))) : 0) + 1}`;
    const newEntry: CashFlowEntry = { id: newId, ...cashFlowEntry };
    data.cashFlowEntries.push(newEntry);
    
    writeData(data);
    await new Promise(resolve => setTimeout(resolve, 100));
    return newVials;
}

export const resetAllData = async (): Promise<void> => {
    const emptyData: MockData = {
        patients: [],
        sales: [],
        cashFlowEntries: [],
        vials: []
    };
    writeData(emptyData);
    await new Promise(resolve => setTimeout(resolve, 100));
}

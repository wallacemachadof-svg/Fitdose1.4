

import { placeholderImages } from "@/lib/placeholder-images";
import { calculateBmi } from "./utils";

const generateDoseSchedule = (startDate: Date): Dose[] => {
  const doses: Dose[] = [];
  let currentDate = new Date(startDate);
  for (let i = 1; i <= 12; i++) {
    doses.push({
      id: i,
      doseNumber: i,
      date: new Date(currentDate),
      status: 'pending',
    });
    currentDate.setDate(currentDate.getDate() + 7);
  }
  return doses;
};

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
  dailyMedications?: string;
  oralContraceptive?: 'yes' | 'no';
  usedMonjauro?: 'yes' | 'no';
  monjauroDose?: string;
  monjauroTime?: string;
  indication?: {
    type: 'indicado' | 'indicador' | 'nao_se_aplica';
    name: string;
    patientId?: string;
  };
};

export type NewPatientData = Omit<Patient, 'id' | 'doses' | 'evolutions'>;

export type Dose = {
  id: number;
  doseNumber: number;
  date: Date;
  weight?: number;
  bmi?: number;
  administeredDose?: number;
  payment?: {
    method: "cash" | "pix" | "debit" | "credit" | "payment_link";
    installments?: number;
  };
  status: 'administered' | 'pending';
};

export type Evolution = {
    id: string;
    date: Date;
    notes: string;
    photoUrl?: string;
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


// We use a global variable to simulate a database in a development environment.
// This is not suitable for production.
const globalWithMockData = global as typeof global & {
  mockPatients?: Patient[];
  mockSales?: Sale[];
  mockCashFlowEntries?: CashFlowEntry[];
  mockVials?: Vial[];
};

if (globalWithMockData.mockPatients === undefined) {
    globalWithMockData.mockPatients = [];
}
if (globalWithMockData.mockSales === undefined) {
  globalWithMockData.mockSales = [];
}
if (globalWithMockData.mockCashFlowEntries === undefined) {
  globalWithMockData.mockCashFlowEntries = [];
}
if (globalWithMockData.mockVials === undefined) {
    globalWithMockData.mockVials = [];
}

const patients = globalWithMockData.mockPatients!;
const sales = globalWithMockData.mockSales!;
const cashFlowEntries = globalWithMockData.mockCashFlowEntries!;
const vials = globalWithMockData.mockVials!;


export const getPatients = async (): Promise<Patient[]> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return [...patients].sort((a,b) => a.fullName.localeCompare(b.fullName));
}

export const getPatientById = async (id: string): Promise<Patient | null> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return patients.find(p => p.id === id) ?? null;
}

export const addPatient = async (patientData: NewPatientData): Promise<Patient> => {
    
    const newId = (patients.length > 0 ? Math.max(...patients.map(p => parseInt(p.id, 10))) : 0) + 1;
    
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
                administeredDose: 2.5, // Default dose for past dates
                payment: { method: 'pix' as 'pix' } // Default payment
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
        address: {
            zip: patientData.zip,
            street: patientData.street,
            number: patientData.number,
            city: patientData.city,
            state: patientData.state,
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
    };

    patients.push(newPatient);
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return newPatient;
};

export const deletePatient = async (id: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const index = patients.findIndex(p => p.id === id);
    if (index !== -1) {
        patients.splice(index, 1);
    } else {
        throw new Error("Patient not found");
    }
};

export type DoseUpdateData = Partial<Omit<Dose, 'id' | 'doseNumber' | 'date'>>;

export const updateDose = async (patientId: string, doseId: number, doseData: DoseUpdateData): Promise<Patient | null> => {
    await new Promise(resolve => setTimeout(resolve, 500));

    const patientIndex = patients.findIndex(p => p.id === patientId);

    if (patientIndex === -1) {
        return null;
    }

    const patient = patients[patientIndex];
    const doseIndex = patient.doses.findIndex(d => d.id === doseId);

    if (doseIndex === -1) {
        return null;
    }

    const originalDose = patient.doses[doseIndex];
    const updatedDose: Dose = {
        ...originalDose,
        ...doseData,
    };
    
    if (updatedDose.status === 'administered' && updatedDose.weight) {
        updatedDose.bmi = calculateBmi(updatedDose.weight, patient.height / 100);
    }

    patient.doses[doseIndex] = updatedDose;
    patients[patientIndex] = patient;

    return patient;
};

export const addPatientEvolution = async (patientId: string, evolutionData: NewEvolutionData): Promise<Patient> => {
    await new Promise(resolve => setTimeout(resolve, 500));

    const patientIndex = patients.findIndex(p => p.id === patientId);
    if (patientIndex === -1) {
        throw new Error("Patient not found");
    }

    const patient = patients[patientIndex];
    const newEvolution: Evolution = {
        id: `evo-${Date.now()}`,
        date: new Date(),
        notes: evolutionData.notes,
        photoUrl: evolutionData.photoUrl,
    };

    patient.evolutions.push(newEvolution);
    patients[patientIndex] = patient;

    return patient;
};


export const getSales = async (): Promise<Sale[]> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return [...sales].sort((a, b) => b.saleDate.getTime() - a.saleDate.getTime());
};

export const addSale = async (saleData: NewSaleData): Promise<Sale> => {
    const patient = patients.find(p => p.id === saleData.patientId);
    if (!patient) {
        throw new Error("Paciente não encontrado");
    }

    const soldMg = parseFloat(saleData.soldDose);
    
    // Check total available stock
    const totalRemainingMg = vials.reduce((acc, v) => acc + v.remainingMg, 0);
    if (totalRemainingMg < soldMg) {
        throw new Error(`Estoque insuficiente. Apenas ${totalRemainingMg.toFixed(2)}mg disponíveis.`);
    }

    // FIFO: Find oldest vials with enough stock
    const sortedVials = [...vials].sort((a, b) => a.purchaseDate.getTime() - b.purchaseDate.getTime());

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

    
    const newId = (sales.length > 0 ? Math.max(...sales.map(s => parseInt(s.id, 10))) : 0) + 1;
    const total = (saleData.price || 0) - (saleData.discount || 0);
    
    const newSale: Sale = {
        id: String(newId),
        ...saleData,
        patientName: patient.fullName,
        total: total,
    };

    sales.push(newSale);

    // Now, add to cash flow if it's paid
    if (newSale.paymentStatus === 'pago') {
        const newCashFlowEntry: CashFlowEntry = {
            id: `sale-${newSale.id}`,
            type: 'entrada',
            purchaseDate: newSale.paymentDate || newSale.saleDate,
            description: `Venda p/ ${patient.fullName}`,
            amount: total,
            status: 'pago',
            paymentMethod: 'pix', // Defaulting, can be improved
        };
        cashFlowEntries.push(newCashFlowEntry);
    }


    await new Promise(resolve => setTimeout(resolve, 500));

    return newSale;
};

export const deleteSale = async (id: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const saleIndex = sales.findIndex(s => s.id === id);
    if (saleIndex !== -1) {
        sales.splice(saleIndex, 1);
    } else {
        throw new Error("Venda não encontrada");
    }

    const cashFlowEntryId = `sale-${id}`;
    const cashFlowIndex = cashFlowEntries.findIndex(cf => cf.id === cashFlowEntryId);
    if (cashFlowIndex !== -1) {
        cashFlowEntries.splice(cashFlowIndex, 1);
    }
};
    
export const getCashFlowEntries = async (): Promise<CashFlowEntry[]> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return [...cashFlowEntries].sort((a, b) => b.purchaseDate.getTime() - a.purchaseDate.getTime());
}

export const addCashFlowEntry = async (entryData: NewCashFlowData): Promise<CashFlowEntry> => {
    const newId = `manual-${(cashFlowEntries.filter(e => e.id.startsWith('manual-')).length > 0 ? Math.max(...cashFlowEntries.filter(e => e.id.startsWith('manual-')).map(e => parseInt(e.id.replace('manual-',''), 10))) : 0) + 1}`;

    const newEntry: CashFlowEntry = {
        id: newId,
        ...entryData,
    };

    cashFlowEntries.push(newEntry);
    await new Promise(resolve => setTimeout(resolve, 500));
    return newEntry;
}

export const deleteCashFlowEntry = async (id: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 500));

    const index = cashFlowEntries.findIndex(e => e.id === id);
    if (index !== -1) {
        cashFlowEntries.splice(index, 1);
    } else {
        throw new Error("Lançamento não encontrado no fluxo de caixa");
    }
};

export const getVials = async (): Promise<Vial[]> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return [...vials].sort((a,b) => a.purchaseDate.getTime() - b.purchaseDate.getTime());
}

export const addVial = async (vialData: NewVialData): Promise<Vial[]> => {
    await new Promise(resolve => setTimeout(resolve, 500));

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
        vials.push(newVial);
    }
    
    // Also add to cash flow as an expense
    const cashFlowEntry: NewCashFlowData = {
        type: 'saida',
        purchaseDate: vialData.purchaseDate,
        description: `Compra ${vialData.quantity}x frasco ${vialData.totalMg}mg`,
        amount: vialData.cost * vialData.quantity,
        status: 'pago',
        paymentMethod: 'pix' // Defaulting, can be improved
    };
    await addCashFlowEntry(cashFlowEntry);


    return newVials;
}

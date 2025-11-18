

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

// We use a global variable to simulate a database in a development environment.
// This is not suitable for production.
const globalWithMockData = global as typeof global & {
  mockPatients?: Patient[];
  mockSales?: Sale[];
  mockCashFlowEntries?: CashFlowEntry[];
};

if (globalWithMockData.mockPatients === undefined) {
    globalWithMockData.mockPatients = [
      {
        id: "1",
        fullName: "Ana Silva",
        age: 34,
        initialWeight: 85,
        height: 165,
        desiredWeight: 65,
        firstDoseDate: new Date("2024-05-10"),
        address: {
          zip: "01001-000",
          street: "Praça da Sé",
          number: "100",
          city: "São Paulo",
          state: "SP",
        },
        phone: "5511987654321",
        healthContraindications: "Nenhuma observação.",
        avatarUrl: placeholderImages.find(p => p.id === "woman-smiling-1")?.imageUrl ?? "/placeholder.jpg",
        doses: [
            ...generateDoseSchedule(new Date("2024-05-10")).slice(0, 4).map((dose, index) => ({
                ...dose,
                status: 'administered' as 'administered',
                weight: 85 - (index * 1.2),
                bmi: calculateBmi(85 - (index * 1.2), 1.65),
                administeredDose: 2.5,
                payment: { method: 'pix' as 'pix' }
            })),
            ...generateDoseSchedule(new Date("2024-05-10")).slice(4)
        ],
        evolutions: [],
      },
      {
        id: "2",
        fullName: "Bruno Costa",
        age: 42,
        initialWeight: 102,
        height: 180,
        desiredWeight: 88,
        firstDoseDate: new Date("2024-06-01"),
        address: {
          zip: "20031-050",
          street: "Rua México",
          number: "123",
          city: "Rio de Janeiro",
          state: "RJ",
        },
        phone: "5521912345678",
        healthContraindications: "Hipertensão controlada.",
        avatarUrl: placeholderImages.find(p => p.id === "man-posing-1")?.imageUrl ?? "/placeholder.jpg",
        doses: generateDoseSchedule(new Date("2024-06-01")),
        evolutions: [],
      },
      {
        id: "3",
        fullName: "Carla Dias",
        age: 28,
        initialWeight: 72,
        height: 172,
        desiredWeight: 60,
        firstDoseDate: new Date(new Date().setDate(new Date().getDate() - 21)),
        address: {
          zip: "30110-044",
          street: "Avenida do Contorno",
          number: "456",
          city: "Belo Horizonte",
          state: "MG",
        },
        phone: "5531999998888",
        healthContraindications: "Alergia a amendoim.",
        avatarUrl: placeholderImages.find(p => p.id === "woman-outdoors-1")?.imageUrl ?? "/placeholder.jpg",
        doses: [
          { id: 1, doseNumber: 1, date: new Date(new Date().setDate(new Date().getDate() - 21)), status: 'administered', weight: 72, bmi: calculateBmi(72, 1.72), administeredDose: 2.5, payment: { method: 'credit', installments: 2 } },
          { id: 2, doseNumber: 2, date: new Date(new Date().setDate(new Date().getDate() - 14)), status: 'administered', weight: 70.5, bmi: calculateBmi(70.5, 1.72), administeredDose: 2.5, payment: { method: 'credit', installments: 2 } },
          ...generateDoseSchedule(new Date(new Date().setDate(new Date().getDate() - 21))).slice(2)
        ],
        evolutions: [],
      },
    ];
}

if (globalWithMockData.mockSales === undefined) {
  globalWithMockData.mockSales = [
    { id: '1', saleDate: new Date('2024-07-20'), soldDose: '2.5', price: 220, discount: 0, total: 220, patientId: '1', patientName: 'Ana Silva', paymentDate: new Date('2024-07-20'), paymentStatus: 'pago', deliveryStatus: 'entregue', observations: 'Primeira compra.', deliveryDate: new Date('2024-07-21') },
    { id: '2', saleDate: new Date('2024-07-21'), soldDose: '3.75', price: 330, discount: 10, total: 320, patientId: '2', patientName: 'Bruno Costa', paymentStatus: 'pendente', deliveryStatus: 'em processamento' },
    { id: '3', saleDate: new Date('2024-07-22'), soldDose: '5.0', price: 380, discount: 0, total: 380, patientId: '3', patientName: 'Carla Dias', paymentDate: new Date('2024-07-22'), paymentStatus: 'pago', deliveryStatus: 'entregue', deliveryDate: new Date('2024-07-23') },
    { id: '4', saleDate: new Date('2024-07-23'), soldDose: '2.5', price: 220, discount: 0, total: 220, patientId: '2', patientName: 'Bruno Costa', paymentStatus: 'pendente', deliveryStatus: 'em agendamento', observations: 'Agendar entrega para a parte da manhã.' },
  ];
}

if (globalWithMockData.mockCashFlowEntries === undefined) {
  globalWithMockData.mockCashFlowEntries = [
    { id: 'sale-1', type: 'entrada', purchaseDate: new Date('2024-07-20'), description: 'Venda dose Ana Silva', status: 'pago', amount: 220, paymentMethod: 'pix' },
    { id: 'manual-1', type: 'saida', purchaseDate: new Date('2024-07-19'), description: 'Compra de material', status: 'pago', amount: 80, paymentMethod: 'debito' },
    { id: 'sale-3', type: 'entrada', purchaseDate: new Date('2024-07-22'), description: 'Venda dose Carla Dias', status: 'pago', amount: 380, paymentMethod: 'credito' },
    { id: 'manual-2', type: 'saida', purchaseDate: new Date('2024-07-25'), description: 'Aluguel do espaço', status: 'pendente', amount: 500, dueDate: new Date('2024-08-05') },
  ];
}

const patients = globalWithMockData.mockPatients!;
const sales = globalWithMockData.mockSales!;
const cashFlowEntries = globalWithMockData.mockCashFlowEntries!;


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


export const getSales = async (): Promise<Sale[]> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return [...sales].sort((a, b) => b.saleDate.getTime() - a.saleDate.getTime());
};

export const addSale = async (saleData: NewSaleData): Promise<Sale> => {
    const patient = patients.find(p => p.id === saleData.patientId);

    if (!patient) {
        throw new Error("Patient not found");
    }
    
    const newId = (sales.length > 0 ? Math.max(...sales.map(s => parseInt(s.id, 10))) : 0) + 1;
    const total = saleData.price - (saleData.discount || 0);
    
    const newSale: Sale = {
        id: String(newId),
        ...saleData,
        patientName: patient.fullName,
        total: total,
    };

    sales.push(newSale);

    // Now, add to cash flow
    const newCashFlowEntry: CashFlowEntry = {
        id: `sale-${newSale.id}`,
        type: 'entrada',
        purchaseDate: newSale.saleDate,
        description: `Venda dose ${patient.fullName}`,
        amount: total,
        status: newSale.paymentStatus,
        dueDate: newSale.paymentStatus === 'pendente' ? newSale.paymentDate : undefined,
    };
    
    cashFlowEntries.push(newCashFlowEntry);


    await new Promise(resolve => setTimeout(resolve, 500));

    return newSale;
};

export const deleteSale = async (id: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const saleIndex = sales.findIndex(s => s.id === id);
    if (saleIndex !== -1) {
        sales.splice(saleIndex, 1);
    } else {
        throw new Error("Sale not found");
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

    if (id.startsWith('sale-')) {
       throw new Error("Lançamentos de vendas não podem ser excluídos por aqui. Exclua a venda em 'Controle de Vendas'.");
    }
    
    const index = cashFlowEntries.findIndex(e => e.id === id);
    if (index !== -1) {
        cashFlowEntries.splice(index, 1);
    } else {
        throw new Error("Cash flow entry not found");
    }
};
    

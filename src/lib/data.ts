import { placeholderImages } from "@/lib/placeholder-images";
import { calculateBmi } from "./utils";

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
  dailyMedications?: string;
  oralContraceptive?: 'yes' | 'no';
  usedMonjauro?: 'yes' | 'no';
  monjauroDose?: string;
  monjauroTime?: string;
};

export type NewPatientData = Omit<Patient, 'id' | 'avatarUrl' | 'doses'>;

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

export type Sale = {
  id: string;
  saleDate: Date;
  soldDose: string;
  price: number;
  patientId: string;
  patientName: string;
  paymentDate?: Date;
  paymentStatus: 'pago' | 'pendente';
  deliveryStatus: 'em agendamento' | 'entregue' | 'em preparo';
  observations?: string;
};

export type NewSaleData = Omit<Sale, 'id' | 'patientName'>;


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

// We use a global variable to simulate a database in a development environment.
// This is not suitable for production.
const globalWithMockData = global as typeof global & {
  mockPatients?: Patient[];
  mockSales?: Sale[];
};

if (!globalWithMockData.mockPatients) {
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
        ]
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
      },
    ];
}

if (!globalWithMockData.mockSales) {
  globalWithMockData.mockSales = [
    { id: '1', saleDate: new Date('2024-07-20'), soldDose: '2.5', price: 220, patientId: '1', patientName: 'Ana Silva', paymentDate: new Date('2024-07-20'), paymentStatus: 'pago', deliveryStatus: 'entregue', observations: 'Primeira compra.' },
    { id: '2', saleDate: new Date('2024-07-21'), soldDose: '3.75', price: 330, patientId: '2', patientName: 'Bruno Costa', paymentStatus: 'pendente', deliveryStatus: 'em preparo' },
    { id: '3', saleDate: new Date('2024-07-22'), soldDose: '5.0', price: 380, patientId: '3', patientName: 'Carla Dias', paymentDate: new Date('2024-07-22'), paymentStatus: 'pago', deliveryStatus: 'entregue' },
    { id: '4', saleDate: new Date('2024-07-23'), soldDose: '2.5', price: 220, patientId: '2', patientName: 'Bruno Costa', paymentStatus: 'pendente', deliveryStatus: 'em agendamento', observations: 'Agendar entrega para a parte da manhã.' },
  ];
}


export const getPatients = async (): Promise<Patient[]> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return [...(globalWithMockData.mockPatients || [])].sort((a,b) => a.fullName.localeCompare(b.fullName));
}

export const getPatientById = async (id: string): Promise<Patient | null> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return (globalWithMockData.mockPatients || []).find(p => p.id === id) ?? null;
}

export const addPatient = async (patientData: NewPatientData): Promise<Patient> => {
    
    const newId = ((globalWithMockData.mockPatients || []).length > 0 ? Math.max(...(globalWithMockData.mockPatients || []).map(p => parseInt(p.id, 10))) : 0) + 1;
    
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
        avatarUrl: `https://i.pravatar.cc/150?u=${newId}`,
        doses: doses,
        dailyMedications: patientData.dailyMedications,
        oralContraceptive: patientData.oralContraceptive,
        usedMonjauro: patientData.usedMonjauro,
        monjauroDose: patientData.monjauroDose,
        monjauroTime: patientData.monjauroTime,
    };

    if (!globalWithMockData.mockPatients) {
        globalWithMockData.mockPatients = [];
    }
    globalWithMockData.mockPatients.push(newPatient);
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return newPatient;
};

export const getSales = async (): Promise<Sale[]> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return [...(globalWithMockData.mockSales || [])].sort((a, b) => b.saleDate.getTime() - a.saleDate.getTime());
};

export const addSale = async (saleData: NewSaleData): Promise<Sale> => {
    const patients = globalWithMockData.mockPatients || [];
    const patient = patients.find(p => p.id === saleData.patientId);

    if (!patient) {
        throw new Error("Patient not found");
    }

    const newId = ((globalWithMockData.mockSales || []).length > 0 ? Math.max(...(globalWithMockData.mockSales || []).map(s => parseInt(s.id, 10))) : 0) + 1;
    
    const newSale: Sale = {
        id: String(newId),
        ...saleData,
        patientName: patient.fullName,
    };

    if (!globalWithMockData.mockSales) {
        globalWithMockData.mockSales = [];
    }
    globalWithMockData.mockSales.push(newSale);

    await new Promise(resolve => setTimeout(resolve, 500));

    return newSale;
};

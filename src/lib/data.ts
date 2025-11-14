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

const mockPatients: Patient[] = [
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
      { id: 1, doseNumber: 1, date: new Date(new Date().setDate(new Date().getDate() - 21)), status: 'administered', weight: 72, administeredDose: 2.5, payment: { method: 'credit', installments: 2 } },
      { id: 2, doseNumber: 2, date: new Date(new Date().setDate(new Date().getDate() - 14)), status: 'administered', weight: 70.5, administeredDose: 2.5, payment: { method: 'credit', installments: 2 } },
      ...generateDoseSchedule(new Date(new Date().setDate(new Date().getDate() - 21))).slice(2)
    ],
  },
];

export const getPatients = async (): Promise<Patient[]> => {
    // In a real app, this would fetch from a database.
    // We'll simulate that by returning a copy of our mock data.
    return new Promise(resolve => setTimeout(() => resolve([...mockPatients].sort((a,b) => b.firstDoseDate.getTime() - a.firstDoseDate.getTime())), 500));
}

export const getPatientById = async (id: string): Promise<Patient | null> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockPatients.find(p => p.id === id) ?? null;
}

export const addPatient = async (patientData: NewPatientData): Promise<Patient> => {
    const newId = (mockPatients.length + 1).toString();
    
    // Some doses might be administered already, let's update them based on the BMI calculated with their initial weight
    const initialBmi = calculateBmi(patientData.initialWeight, patientData.height / 100);
    const doses = generateDoseSchedule(patientData.firstDoseDate).map(dose => {
        const today = new Date();
        if (dose.date < today) {
            return {
                ...dose,
                status: 'administered' as 'administered',
                weight: patientData.initialWeight, // Assume initial weight for past doses
                bmi: initialBmi,
                administeredDose: 2.5, // Default dose
                payment: { method: 'pix' as 'pix' }
            };
        }
        return dose;
    });

    const newPatient: Patient = {
        id: newId,
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
        avatarUrl: `https://i.pravatar.cc/150?u=${newId}`, // Using a random avatar service
        doses: doses,
    };

    mockPatients.push(newPatient);
    
    // Simulate network delay for saving
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return newPatient;
};

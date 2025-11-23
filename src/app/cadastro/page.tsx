
import { getPatients } from '@/lib/actions';
import PatientRegistrationForm from './form';
import { Suspense } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

// This is now a Server Component
export default async function CadastroPage() {
    // Fetch initial data on the server
    const patients = await getPatients();
    const patientOptions = patients.map(p => ({ value: p.id, label: p.fullName }));

    return (
        <Suspense fallback={<Card className="w-full max-w-4xl h-96 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></Card>}>
            {/* Pass the server-fetched data as a prop to the Client Component */}
            <PatientRegistrationForm patientOptions={patientOptions} />
        </Suspense>
    )
}

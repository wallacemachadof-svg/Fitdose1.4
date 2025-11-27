
import { Suspense } from 'react';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import PatientRegistrationForm from './form';
import { getPatients } from '@/lib/actions';

// This is now a Server Component that fetches data
async function CadastroFormLoader() {
    const patients = await getPatients();
    return <PatientRegistrationForm patients={patients} />;
}

export default function CadastroPage() {
    return (
        <Suspense fallback={<Card className="w-full max-w-4xl h-96 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></Card>}>
            <CadastroFormLoader />
        </Suspense>
    )
}

    
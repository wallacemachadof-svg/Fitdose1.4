
import { Suspense } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import PatientRegistrationForm from './form';

// This is now a Server Component
export default function CadastroPage() {
    return (
        <Suspense fallback={<Card className="w-full max-w-4xl h-96 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></Card>}>
            <PatientRegistrationForm />
        </Suspense>
    )
}

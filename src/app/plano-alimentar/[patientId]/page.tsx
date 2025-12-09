
'use client';

import { Suspense, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import FoodPlanDisplay from './food-plan';

// A simple wrapper to ensure layout runs on client
function ClientLayout({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        document.body.style.backgroundColor = 'hsl(var(--muted))';
        return () => {
            document.body.style.backgroundColor = '';
        }
    }, []);
    return <>{children}</>;
}

type PageProps = {
    params: {
        patientId: string;
    };
};

export default function FoodPlanPage({ params }: PageProps) {
    return (
       <ClientLayout>
            <Suspense fallback={<Card className="w-full max-w-4xl h-96 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></Card>}>
                <FoodPlanDisplay patientId={params.patientId} />
            </Suspense>
       </ClientLayout>
    )
}

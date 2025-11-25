
import { Suspense } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import FoodPlanDisplay from './food-plan';

export default function FoodPlanPage({ params }: { params: { patientId: string } }) {
    return (
        <Suspense fallback={<Card className="w-full max-w-4xl h-96 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></Card>}>
            <FoodPlanDisplay patientId={params.patientId} />
        </Suspense>
    )
}

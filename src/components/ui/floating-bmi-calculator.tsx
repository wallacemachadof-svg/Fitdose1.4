
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calculator, X } from 'lucide-react';
import { calculateBmi } from '@/lib/utils';
import { cn } from '@/lib/utils';

export function FloatingBmiCalculator() {
  const [isOpen, setIsOpen] = useState(false);
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [bmi, setBmi] = useState<number | null>(null);

  useEffect(() => {
    if (weight && height) {
      const calculatedBmi = calculateBmi(parseFloat(weight), parseFloat(height) / 100);
      setBmi(calculatedBmi);
    } else {
      setBmi(null);
    }
  }, [weight, height]);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen ? (
        <Card className="w-80 shadow-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Calculadora de IMC</CardTitle>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="weight">Peso (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  placeholder="Ex: 70.5"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height">Altura (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  placeholder="Ex: 175"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">Seu IMC é</p>
              <p className={cn("text-4xl font-bold", bmi === null && "text-muted-foreground")}>
                {bmi !== null ? bmi.toFixed(2) : '-.--'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button className="h-14 w-14 rounded-full shadow-lg" onClick={() => setIsOpen(true)}>
          <Calculator className="h-6 w-6" />
        </Button>
      )}
    </div>
  );
}

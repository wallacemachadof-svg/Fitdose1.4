
'use client';

import { useState, useEffect, useRef } from 'react';
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
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    // Set initial position once client-side rendering occurs
    setPosition({ x: window.innerWidth - 80, y: window.innerHeight - 100 });
  }, []);

  useEffect(() => {
    if (weight && height) {
      const calculatedBmi = calculateBmi(parseFloat(weight), parseFloat(height) / 100);
      setBmi(calculatedBmi);
    } else {
      setBmi(null);
    }
  }, [weight, height]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('input') || (target.closest('button') && !target.classList.contains('drag-handle'))) {
      return;
    }
    
    isDragging.current = true;
    dragStartPos.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    document.body.style.userSelect = 'none';
    e.preventDefault(); // Prevent text selection
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current) return;
    
    const newX = e.clientX - dragStartPos.current.x;
    const newY = e.clientY - dragStartPos.current.y;
    
    const maxX = window.innerWidth - (ref.current?.offsetWidth || 0);
    const maxY = window.innerHeight - (ref.current?.offsetHeight || 0);

    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY)),
    });
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    document.body.style.userSelect = '';
  };
  
  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []); // Empty dependency array, so it runs once and cleans up on unmount

  return (
    <div
        ref={ref}
        className="fixed z-50 cursor-grab active:cursor-grabbing"
        style={{ left: `${position.x}px`, top: `${position.y}px` }}
        onMouseDown={handleMouseDown}
    >
      {isOpen ? (
          <Card className="w-80 shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Calculadora de IMC</CardTitle>
              <Button variant="ghost" size="icon" className="h-6 w-6 cursor-pointer z-10" onClick={() => setIsOpen(false)}>
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
                    className="cursor-text"
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
                    className="cursor-text"
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
          <Button
            className="drag-handle h-14 w-14 rounded-full shadow-lg z-50 cursor-grab active:cursor-grabbing"
            onClick={() => setIsOpen(true)}
          >
            <Calculator className="h-6 w-6" />
          </Button>
      )}
    </div>
  );
}

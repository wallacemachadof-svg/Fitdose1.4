'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import Link from "next/link";

export default function SuccessPage() {
    return (
        <Card className="w-full max-w-lg text-center">
            <CardHeader>
                <div className="mx-auto bg-green-100 rounded-full p-3 w-fit">
                    <CheckCircle className="h-12 w-12 text-green-600" />
                </div>
                <CardTitle className="mt-4 text-2xl">Cadastro Realizado com Sucesso!</CardTitle>
                <CardDescription>
                    Sua ficha de cadastro foi enviada. Em breve, entraremos em contato para dar continuidade ao seu atendimento.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">
                    Agradecemos pelo seu interesse!
                </p>
            </CardContent>
        </Card>
    );
}


'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';
import { Upload, Trash2, Image as ImageIcon } from 'lucide-react';

export default function ProfilePage() {
    const { toast } = useToast();
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    useEffect(() => {
        const storedLogo = localStorage.getItem('customLogo');
        if (storedLogo) {
            setLogoPreview(storedLogo);
        }
    }, []);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const dataUrl = reader.result as string;
                localStorage.setItem('customLogo', dataUrl);
                setLogoPreview(dataUrl);
                toast({
                    title: "Logotipo Atualizado!",
                    description: "O novo logotipo foi salvo e será exibido em todo o aplicativo.",
                });
                // Dispatch a storage event to notify other tabs
                window.dispatchEvent(new StorageEvent('storage', {
                    key: 'customLogo',
                    newValue: dataUrl,
                }));
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleRemoveLogo = () => {
        localStorage.removeItem('customLogo');
        setLogoPreview(null);
        toast({
            title: "Logotipo Removido",
            description: "O aplicativo voltará a exibir o nome padrão.",
        });
         // Dispatch a storage event to notify other tabs
        window.dispatchEvent(new StorageEvent('storage', {
            key: 'customLogo',
            newValue: null,
        }));
    };

    const triggerFileSelect = () => fileInputRef.current?.click();

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Perfil e Configurações</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Logotipo do Aplicativo</CardTitle>
                    <CardDescription>Personalize a aparência do seu painel enviando um logotipo. Recomendamos uma imagem retangular (ex: 250x80 pixels).</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="p-4 border-2 border-dashed rounded-lg flex flex-col items-center justify-center min-h-[150px]">
                        {logoPreview ? (
                            <Image src={logoPreview} alt="Prévia do Logotipo" width={200} height={80} className="object-contain max-h-24" />
                        ) : (
                            <div className="text-center text-muted-foreground">
                                <ImageIcon className="mx-auto h-12 w-12" />
                                <p className="mt-2 text-sm">Nenhum logotipo enviado.</p>
                            </div>
                        )}
                    </div>
                    <Input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/png, image/jpeg, image/svg+xml"
                        onChange={handleFileChange}
                    />
                    <div className="flex flex-wrap gap-2">
                        <Button onClick={triggerFileSelect}>
                            <Upload className="mr-2 h-4 w-4" />
                            {logoPreview ? 'Trocar Logotipo' : 'Enviar Logotipo'}
                        </Button>
                        {logoPreview && (
                             <Button variant="destructive" onClick={handleRemoveLogo}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remover Logotipo
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

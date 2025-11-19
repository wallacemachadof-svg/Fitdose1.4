'use client';

import { useState } from "react";
import { personalizedDosageRecommendations, PersonalizedDosageRecommendationsOutput } from "@/ai/flows/personalized-dosage-recommendations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Bot, FileText, FlaskConical, Loader2, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function AIPersonalizationPage() {
    const [patientDetails, setPatientDetails] = useState('');
    const [latestResearch, setLatestResearch] = useState('');
    const [result, setResult] = useState<PersonalizedDosageRecommendationsOutput | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setResult(null);
        setError(null);
        
        try {
            const output = await personalizedDosageRecommendations({
                patientDetails,
                latestResearch,
            });
            setResult(output);
        } catch (err) {
            setError('Falha ao gerar recomendação. Tente novamente.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FlaskConical className="h-6 w-6" />
                        Ferramenta de Personalização de Dosagem com IA
                    </CardTitle>
                    <CardDescription>
                        Use a IA para analisar dados do paciente e pesquisas recentes para obter recomendações de dosagem personalizadas.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="patient-details" className="flex items-center gap-2"><FileText className="h-4 w-4" /> Detalhes do Paciente</Label>
                                <Textarea
                                    id="patient-details"
                                    placeholder="Insira o histórico de saúde, condição atual, metas de tratamento, etc."
                                    rows={8}
                                    value={patientDetails}
                                    onChange={(e) => setPatientDetails(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="latest-research" className="flex items-center gap-2"><FileText className="h-4 w-4" /> Pesquisas Recentes</Label>
                                <Textarea
                                    id="latest-research"
                                    placeholder="Insira as últimas pesquisas médicas, diretrizes relacionadas à dosagem, etc."
                                    rows={8}
                                    value={latestResearch}
                                    onChange={(e) => setLatestResearch(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <Button type="submit" disabled={loading}>
                            {loading ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando...</>
                            ) : (
                                <><Bot className="mr-2 h-4 w-4" /> Gerar Recomendação</>
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {loading && <ResultsSkeleton />}
            
            {error && <Card className="border-destructive bg-destructive/10"><CardContent className="pt-6"><p className="text-destructive font-medium">{error}</p></CardContent></Card>}

            {result && (
                <Card className="bg-primary/10 border-primary/20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-primary-foreground"><Sparkles className="h-5 w-5" /> Resultados da IA</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <ResultSection title="Recomendação de Dosagem" content={result.dosageRecommendation} />
                        <ResultSection title="Justificativa" content={result.rationale} />
                        <ResultSection title="Considerações Adicionais" content={result.additionalConsiderations} />
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

function ResultSection({ title, content }: { title: string, content: string }) {
    return (
        <div>
            <h3 className="font-semibold text-lg mb-2 text-primary-foreground/90">{title}</h3>
            <p className="text-muted-foreground whitespace-pre-wrap">{content}</p>
        </div>
    );
}

function ResultsSkeleton() {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-1/4" />
            </CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <Skeleton className="h-5 w-1/5 mb-2" />
                    <Skeleton className="h-12 w-full" />
                </div>
                <div>
                    <Skeleton className="h-5 w-1/5 mb-2" />
                    <Skeleton className="h-20 w-full" />
                </div>
                <div>
                    <Skeleton className="h-5 w-1/5 mb-2" />
                    <Skeleton className="h-16 w-full" />
                </div>
            </CardContent>
        </Card>
    );
}

    
'use server';
/**
 * @fileOverview Analyzes a bioimpedance app screenshot and extracts the metrics.
 *
 * - analyzeBioimpedanceImage - A function that handles the image analysis.
 * - AnalyzeBioimpedanceInput - The input type for the function.
 * - AnalyzeBioimpedanceOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeBioimpedanceInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a bioimpedance app screen, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AnalyzeBioimpedanceInput = z.infer<typeof AnalyzeBioimpedanceInputSchema>;

const AnalyzeBioimpedanceOutputSchema = z.object({
    weight: z.number().optional().describe('O valor do "Peso(Kg)".'),
    bmi: z.number().optional().describe('O valor do "IMC".'),
    fatPercentage: z.number().optional().describe('O valor da "Gordura(%)".'),
    fatWeight: z.number().optional().describe('O valor do "Peso da gordura(Kg)".'),
    skeletalMusclePercentage: z.number().optional().describe('O valor do "Percentual da massa muscular esquelética(%)".'),
    skeletalMuscleWeight: z.number().optional().describe('O valor do "Peso da massa muscular esquelética(Kg)".'),
    muscleMassPercentage: z.number().optional().describe('O valor do "Registro de massa muscular(%)".'),
    muscleMassWeight: z.number().optional().describe('O valor do "Peso da massa muscular(Kg)".'),
    visceralFat: z.number().optional().describe('O valor da "Gordura visceral".'),
    hydration: z.number().optional().describe('O valor da "Água(%)".'),
    waterWeight: z.number().optional().describe('O valor do "peso da água(Kg)".'),
    metabolism: z.number().optional().describe('O valor do "Metabolismo(kcal / dia)".'),
    obesityPercentage: z.number().optional().describe('O valor da "Obesidade(%)".'),
    boneMass: z.number().optional().describe('O valor da "Ossos(Kg)".'),
    protein: z.number().optional().describe('O valor da "Proteina(%)".'),
    lbm: z.number().optional().describe('O valor da "LBM(Kg)".'),
    metabolicAge: z.number().optional().describe('O valor da "Idade metabólica".'),
});
export type AnalyzeBioimpedanceOutput = z.infer<typeof AnalyzeBioimpedanceOutputSchema>;

export async function analyzeBioimpedanceImage(input: AnalyzeBioimpedanceInput): Promise<AnalyzeBioimpedanceOutput> {
  return analyzeBioimpedanceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeBioimpedancePrompt',
  model: 'googleai/gemini-1.5-flash-preview',
  input: {schema: AnalyzeBioimpedanceInputSchema},
  output: {schema: AnalyzeBioimpedanceOutputSchema},
  prompt: `You are an expert AI assistant that extracts health metrics from screenshots of a bioimpedance scale application.
The language in the image is Brazilian Portuguese. Analyze the provided image and extract the following values based on their labels.

- "Peso(Kg)"
- "IMC"
- "Gordura(%)"
- "Peso da gordura(Kg)"
- "Percentual da massa muscular esquelética(%)"
- "Peso da massa muscular esquelética(Kg)"
- "Registro de massa muscular(%)"
- "Peso da massa muscular(Kg)"
- "Gordura visceral"
- "Água(%)"
- "peso da água(Kg)"
- "Metabolismo(kcal / dia)"
- "Obesidade(%)"
- "Ossos(Kg)"
- "Proteina(%)"
- "LBM(Kg)"
- "Idade metabólica"

Return the extracted data in the specified JSON format. If a value is not present or not clear, omit it.

Image to analyze: {{media url=photoDataUri}}`,
});

const analyzeBioimpedanceFlow = ai.defineFlow(
  {
    name: 'analyzeBioimpedanceFlow',
    inputSchema: AnalyzeBioimpedanceInputSchema,
    outputSchema: AnalyzeBioimpedanceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

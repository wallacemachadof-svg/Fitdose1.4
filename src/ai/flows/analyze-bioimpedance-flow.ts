
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
    weight: z.number().optional().describe('The value for "Peso(Kg)".'),
    bmi: z.number().optional().describe('The value for "IMC".'),
    fatPercentage: z.number().optional().describe('The value for "Gordura(%)".'),
    fatWeight: z.number().optional().describe('The value for "Peso da gordura(Kg)".'),
    skeletalMusclePercentage: z.number().optional().describe('The value for "Percentual da massa muscular esquelética(%)".'),
    skeletalMuscleWeight: z.number().optional().describe('The value for "Peso da massa muscular esquelética(Kg)".'),
    muscleMassPercentage: z.number().optional().describe('The value for "Registro de massa muscular(%)".'),
    muscleMassWeight: z.number().optional().describe('The value for "Peso da massa muscular(Kg)".'),
    visceralFat: z.number().optional().describe('The value for "Gordura visceral".'),
    hydration: z.number().optional().describe('The value for "Água(%)".'),
    waterWeight: z.number().optional().describe('The value for "peso da água(Kg)".'),
    metabolism: z.number().optional().describe('The value for "Metabolismo(kcal / dia)".'),
    obesityPercentage: z.number().optional().describe('The value for "Obesidade(%)".'),
    boneMass: z.number().optional().describe('The value for "Ossos(Kg)".'),
    protein: z.number().optional().describe('The value for "Proteina(%)".'),
    lbm: z.number().optional().describe('The value for "LBM(Kg)".'),
    metabolicAge: z.number().optional().describe('The value for "Idade metabólica".'),
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
The language in the image is Brazilian Portuguese. Analyze the provided image and extract ONLY THE NUMERICAL VALUE for each of the following labels.

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

Return the extracted numerical data in the specified JSON format. If a value is not present or not clear, omit it.

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

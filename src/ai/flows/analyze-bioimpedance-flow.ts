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
    fatPercentage: z.number().optional().describe('O valor da "Gordura Corporal" em porcentagem.'),
    muscleMass: z.number().optional().describe('O valor do "Músculo" em porcentagem.'),
    visceralFat: z.number().optional().describe('O valor da "Gordura Visceral".'),
    hydration: z.number().optional().describe('O valor da "Água Corporal" em porcentagem.'),
    metabolism: z.number().optional().describe('O valor do "Metabolismo Basal" em kcal.'),
    boneMass: z.number().optional().describe('O valor da "Massa Óssea" em kg.'),
    protein: z.number().optional().describe('O valor da "Proteína" em porcentagem.'),
    metabolicAge: z.number().optional().describe('O valor da "Idade Corporal".'),
});
export type AnalyzeBioimpedanceOutput = z.infer<typeof AnalyzeBioimpedanceOutputSchema>;

export async function analyzeBioimpedanceImage(input: AnalyzeBioimpedanceInput): Promise<AnalyzeBioimpedanceOutput> {
  return analyzeBioimpedanceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeBioimpedancePrompt',
  input: {schema: AnalyzeBioimpedanceInputSchema},
  output: {schema: AnalyzeBioimpedanceOutputSchema},
  prompt: `You are an expert AI assistant that extracts health metrics from screenshots of a bioimpedance scale application.
Analyze the provided image and extract the following values. The labels might be in Portuguese.

- "Gordura Corporal" (Fat Percentage) as a percentage.
- "Músculo" (Muscle Mass) as a percentage.
- "Gordura Visceral" (Visceral Fat) as a level/number.
- "Água Corporal" (Body Water) as a percentage.
- "Metabolismo Basal" (Basal Metabolism) in kcal.
- "Massa Óssea" (Bone Mass) in kg.
- "Proteína" (Protein) as a percentage.
- "Idade Corporal" (Body Age) as a number of years.

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

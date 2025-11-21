
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
    skeletalMusclePercentage: z.number().optional().describe('The value for "Percentual da massa muscular esquelética(%)".'),
    visceralFat: z.number().optional().describe('The value for "Gordura visceral".'),
    hydration: z.number().optional().describe('The value for "Água(%)".'),
    metabolism: z.number().optional().describe('The value for "Metabolismo(kcal / dia)".'),
    obesityPercentage: z.number().optional().describe('The value for "Obesidade(%)".'),
    boneMass: z.number().optional().describe('The value for "Ossos(Kg)".'),
    protein: z.number().optional().describe('The value for "Proteina(%)".'),
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
- "Percentual da massa muscular esquelética(%)"
- "Gordura visceral"
- "Água(%)"
- "Metabolismo(kcal / dia)"
- "Obesidade(%)"
- "Ossos(Kg)"
- "Proteina(%)"

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

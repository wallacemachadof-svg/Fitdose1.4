'use server';
/**
 * @fileOverview Summarizes patient health data, highlighting potential risks and interactions with the medication.
 *
 * - summarizeHealthData - A function that handles the summarization of health data.
 * - SummarizeHealthDataInput - The input type for the summarizeHealthData function.
 * - SummarizeHealthDataOutput - The return type for the summarizeHealthData function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeHealthDataInputSchema = z.object({
  healthContraindicationsForm: z
    .string()
    .describe("Patient's health contraindications form."),
});
export type SummarizeHealthDataInput = z.infer<typeof SummarizeHealthDataInputSchema>;

const SummarizeHealthDataOutputSchema = z.object({
  summary: z.string().describe('A summary of the health contraindications, highlighting potential risks and interactions with the medication.'),
});
export type SummarizeHealthDataOutput = z.infer<typeof SummarizeHealthDataOutputSchema>;

export async function summarizeHealthData(input: SummarizeHealthDataInput): Promise<SummarizeHealthDataOutput> {
  return summarizeHealthDataFlow(input);
}

const summarizeHealthDataPrompt = ai.definePrompt({
  name: 'summarizeHealthDataPrompt',
  input: {schema: SummarizeHealthDataInputSchema},
  output: {schema: SummarizeHealthDataOutputSchema},
  prompt: `You are a healthcare assistant tasked with summarizing patient health data from a contraindications form.

  Your goal is to identify any potential risks or interactions with the prescribed medication based on the provided information.
  Summarize the key points of the health contraindications form below, highlighting any concerns that the healthcare provider should be aware of.

  Health Contraindications Form:
  {{healthContraindicationsForm}}`,
});

const summarizeHealthDataFlow = ai.defineFlow(
  {
    name: 'summarizeHealthDataFlow',
    inputSchema: SummarizeHealthDataInputSchema,
    outputSchema: SummarizeHealthDataOutputSchema,
  },
  async input => {
    const {output} = await summarizeHealthDataPrompt(input);
    return output!;
  }
);

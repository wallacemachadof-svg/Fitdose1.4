'use server';
/**
 * @fileOverview This file defines a Genkit flow for providing personalized dosage recommendations based on patient data and the latest research.
 *
 * - personalizedDosageRecommendations - A function that returns personalized dosage recommendations.
 * - PersonalizedDosageRecommendationsInput - The input type for the personalizedDosageRecommendations function.
 * - PersonalizedDosageRecommendationsOutput - The return type for the personalizedDosageRecommendations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PersonalizedDosageRecommendationsInputSchema = z.object({
  patientDetails: z
    .string()
    .describe("Comprehensive details of the patient's health history, current condition, and treatment goals."),
  latestResearch: z
    .string()
    .describe('The latest medical research and guidelines related to dosage and treatment optimization.'),
});
export type PersonalizedDosageRecommendationsInput = z.infer<
  typeof PersonalizedDosageRecommendationsInputSchema
>;

const PersonalizedDosageRecommendationsOutputSchema = z.object({
  dosageRecommendation: z
    .string()
    .describe('A personalized dosage recommendation based on the patient details and latest research.'),
  rationale: z
    .string()
    .describe('A detailed rationale for the dosage recommendation, explaining the factors considered.'),
  additionalConsiderations: z
    .string()
    .describe('Any additional considerations or precautions related to the dosage recommendation.'),
});
export type PersonalizedDosageRecommendationsOutput = z.infer<
  typeof PersonalizedDosageRecommendationsOutputSchema
>;

export async function personalizedDosageRecommendations(
  input: PersonalizedDosageRecommendationsInput
): Promise<PersonalizedDosageRecommendationsOutput> {
  return personalizedDosageRecommendationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'personalizedDosageRecommendationsPrompt',
  input: {schema: PersonalizedDosageRecommendationsInputSchema},
  output: {schema: PersonalizedDosageRecommendationsOutputSchema},
  prompt: `You are an AI assistant that specializes in providing personalized dosage recommendations based on patient-specific data and the latest medical research.

  Analyze the following patient details and the latest research to generate a dosage recommendation, a detailed rationale, and any additional considerations.

  Patient Details: {{{patientDetails}}}
  Latest Research: {{{latestResearch}}}

  Based on this information, provide a personalized dosage recommendation, a detailed rationale, and any additional considerations.
  Ensure that the dosage recommendation is safe, effective, and tailored to the individual patient's needs and health status.

  Output the dosage recommendation, rationale, and additional considerations in the format specified in the output schema. Adhere to the output schema descriptions when constructing the response.`,
});

const personalizedDosageRecommendationsFlow = ai.defineFlow(
  {
    name: 'personalizedDosageRecommendationsFlow',
    inputSchema: PersonalizedDosageRecommendationsInputSchema,
    outputSchema: PersonalizedDosageRecommendationsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

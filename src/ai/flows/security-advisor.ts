'use server';

/**
 * @fileOverview Security Advisor AI agent providing actionable security recommendations.
 *
 * - getSecurityRecommendations - A function that generates security recommendations based on current and desired security states.
 * - SecurityRecommendationsInput - The input type for the getSecurityRecommendations function.
 * - SecurityRecommendationsOutput - The return type for the getSecurityRecommendations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SecurityRecommendationsInputSchema = z.object({
  currentSecurityState: z
    .string()
    .describe('The current security state of the system.'),
  desiredSecurityState: z
    .string()
    .describe('The desired security state of the system.'),
});
export type SecurityRecommendationsInput = z.infer<
  typeof SecurityRecommendationsInputSchema
>;

const SecurityRecommendationsOutputSchema = z.object({
  recommendations: z
    .string()
    .describe(
      'Actionable recommendations for achieving the desired security state.'
    ),
});
export type SecurityRecommendationsOutput = z.infer<
  typeof SecurityRecommendationsOutputSchema
>;

export async function getSecurityRecommendations(
  input: SecurityRecommendationsInput
): Promise<SecurityRecommendationsOutput> {
  return securityRecommendationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'securityRecommendationsPrompt',
  input: {schema: SecurityRecommendationsInputSchema},
  output: {schema: SecurityRecommendationsOutputSchema},
  prompt: `You are an AI security advisor. Your task is to analyze the current security state and provide actionable recommendations to achieve the desired security state.

Current Security State: {{{currentSecurityState}}}
Desired Security State: {{{desiredSecurityState}}}

Provide actionable recommendations for achieving the desired security state:
`,
});

const securityRecommendationsFlow = ai.defineFlow(
  {
    name: 'securityRecommendationsFlow',
    inputSchema: SecurityRecommendationsInputSchema,
    outputSchema: SecurityRecommendationsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

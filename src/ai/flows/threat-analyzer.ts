// Threat Analyzer flow
'use server';

/**
 * @fileOverview AI Threat Analyzer flow that provides a summarized and prioritized list of potential threats based on real-time data feeds.
 *
 * - threatAnalyzerSummary - A function that handles the threat analysis process.
 * - ThreatAnalyzerInput - The input type for the threatAnalyzerSummary function.
 * - ThreatAnalyzerOutput - The return type for the threatAnalyzerSummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ThreatAnalyzerInputSchema = z.object({
  realTimeDataFeeds: z
    .string()
    .describe(
      'Real-time updates on potential threats and vulnerabilities from centralized sensors collecting network event data.'
    ),
});
export type ThreatAnalyzerInput = z.infer<typeof ThreatAnalyzerInputSchema>;

const ThreatAnalyzerOutputSchema = z.object({
  threatSummary: z
    .string()
    .describe(
      'A summarized and prioritized list of potential threats based on real-time data feeds.'
    ),
});
export type ThreatAnalyzerOutput = z.infer<typeof ThreatAnalyzerOutputSchema>;

export async function threatAnalyzerSummary(input: ThreatAnalyzerInput): Promise<ThreatAnalyzerOutput> {
  return threatAnalyzerFlow(input);
}

const prompt = ai.definePrompt({
  name: 'threatAnalyzerPrompt',
  input: {schema: ThreatAnalyzerInputSchema},
  output: {schema: ThreatAnalyzerOutputSchema},
  prompt: `You are a security analyst who provides a summarized and prioritized list of potential threats based on real-time data feeds.
\nUse the following real-time data feeds to provide the threat summary.
\nReal-time Data Feeds: {{{realTimeDataFeeds}}}`,
});

const threatAnalyzerFlow = ai.defineFlow(
  {
    name: 'threatAnalyzerFlow',
    inputSchema: ThreatAnalyzerInputSchema,
    outputSchema: ThreatAnalyzerOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

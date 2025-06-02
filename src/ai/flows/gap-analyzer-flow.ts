
'use server';
/**
 * @fileOverview An AI flow to analyze gaps between current and target security profiles and provide recommendations.
 *
 * - analyzeSecurityGaps - A function that handles the gap analysis.
 * - GapAnalysisInput - The input type for the analyzeSecurityGaps function.
 * - GapAnalysisOutput - The return type for the analyzeSecurityGaps function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GapAnalysisInputSchema = z.object({
  currentProfileSummary: z.string().describe("A detailed summary of the current security profile, including identified threats (potentially multiple), vulnerabilities, implemented controls, and relevant asset information for each threat."),
  targetProfileSummary: z.string().describe("A detailed summary of the desired target security profile, including target identifiers (potentially multiple), desired implementation levels, and types of assets it applies to.")
});
export type GapAnalysisInput = z.infer<typeof GapAnalysisInputSchema>;

const GapAnalysisOutputSchema = z.object({
  gapAnalysis: z.string().describe("A concise analysis identifying the key gaps between the current and target security profiles. This should highlight discrepancies in controls, implementation levels, and coverage for the specified threats and target identifiers."),
  recommendations: z.array(
    z.object({
      title: z.string().describe("A short, clear title for the recommendation."),
      description: z.string().describe("A detailed explanation of the recommended action, including what needs to be done, why it's important, and potentially how to implement it or what tools/ICS to use."),
      priority: z.enum(["High", "Medium", "Low"]).describe("The priority of implementing this recommendation.")
    })
  ).describe("A list of actionable recommendations to bridge the identified gaps. Each recommendation should be specific and aimed at achieving the target security profile.")
});
export type GapAnalysisOutput = z.infer<typeof GapAnalysisOutputSchema>;

export async function analyzeSecurityGaps(input: GapAnalysisInput): Promise<GapAnalysisOutput> {
  return gapAnalyzerFlow(input);
}

const prompt = ai.definePrompt({
  name: 'gapAnalysisPrompt',
  input: {schema: GapAnalysisInputSchema},
  output: {schema: GapAnalysisOutputSchema},
  prompt: `You are an expert cybersecurity analyst specializing in gap analysis and security improvement strategies for critical infrastructure.
Your task is to analyze the provided current and target security profiles and generate a concise gap analysis and a list of actionable recommendations.

Current Security Profile Summary:
{{{currentProfileSummary}}}

Target Security Profile Summary:
{{{targetProfileSummary}}}

Based on this information:
1.  **Gap Analysis:** Provide a concise analysis identifying the key gaps. Focus on discrepancies in controls, implementation levels, and coverage for the specified threats and target identifiers.
2.  **Recommendations:** Generate a list of specific, actionable recommendations to bridge these gaps. For each recommendation:
    *   Provide a clear title.
    *   Describe the action in detail: what needs to be done, why it's important. Suggest specific measures, controls, or Cyber Security Tools (ICS) if applicable.
    *   Assign a priority (High, Medium, Low) based on its impact on achieving the target state and mitigating risks.

The goal is to help the user understand how to move from their current security posture to the desired target posture effectively.
Ensure your recommendations are practical and relevant to critical infrastructure environments.
Be specific in your output, adhering to the requested output schema.`,
  config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE', // Allow discussion of security vulnerabilities
      },
       {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
    ],
  }
});

const gapAnalyzerFlow = ai.defineFlow(
  {
    name: 'gapAnalyzerFlow',
    inputSchema: GapAnalysisInputSchema,
    outputSchema: GapAnalysisOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
        throw new Error("AI failed to generate gap analysis output.");
    }
    return output;
  }
);

"use client";

import { useState } from 'react';
import { getSecurityRecommendations, SecurityRecommendationsInput, SecurityRecommendationsOutput } from '@/ai/flows/security-advisor';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, UserCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function SecurityAdvisorPage() {
  const [currentSecurityState, setCurrentSecurityState] = useState<string>('Current state: \n- Endpoints have basic antivirus, but no EDR solution.\n- Firewall rules are managed manually and infrequently updated.\n- Employee security training was last conducted 2 years ago.\n- Multi-factor authentication is only enforced for admin accounts.');
  const [desiredSecurityState, setDesiredSecurityState] = useState<string>('Desired state: \n- All endpoints protected by EDR with centralized monitoring.\n- Firewall rules automated and dynamically updated based on threat intelligence.\n- Quarterly security awareness training for all employees.\n- MFA enforced for all user accounts and critical systems.');
  const [result, setResult] = useState<SecurityRecommendationsOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const input: SecurityRecommendationsInput = { currentSecurityState, desiredSecurityState };
      const output = await getSecurityRecommendations(input);
      setResult(output);
    } catch (err) {
      console.error("Security Advisor Error:", err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred while fetching recommendations.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-headline">AI Security Advisor</h1>
        <UserCheck className="h-8 w-8 text-primary" />
      </div>
      <CardDescription>
        Describe your current and desired security states. The AI will provide actionable recommendations to bridge the gap.
      </CardDescription>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Get Security Recommendations</CardTitle>
            <CardDescription>Detail your current posture and future goals.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="currentSecurityState" className="text-sm font-medium">Current Security State</Label>
              <Textarea
                id="currentSecurityState"
                value={currentSecurityState}
                onChange={(e) => setCurrentSecurityState(e.target.value)}
                placeholder="Describe your current security measures, vulnerabilities, recent incidents, etc."
                className="mt-1 min-h-[150px] font-code text-sm"
                required
              />
            </div>
            <div>
              <Label htmlFor="desiredSecurityState" className="text-sm font-medium">Desired Security State</Label>
              <Textarea
                id="desiredSecurityState"
                value={desiredSecurityState}
                onChange={(e) => setDesiredSecurityState(e.target.value)}
                placeholder="Describe your target security posture, compliance goals, risk appetite, etc."
                className="mt-1 min-h-[150px] font-code text-sm"
                required
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating Advice...
                </>
              ) : (
                "Get Recommendations"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {error && (
        <Card className="border-destructive bg-destructive/10">
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <AlertTriangle className="mr-2 h-5 w-5" />
              Error Generating Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-primary">
              <CheckCircle2 className="mr-2 h-5 w-5" />
              Actionable Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] w-full rounded-md border p-4 bg-muted/20">
              <pre className="whitespace-pre-wrap text-sm">{result.recommendations}</pre>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

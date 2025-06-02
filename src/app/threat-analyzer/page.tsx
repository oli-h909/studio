"use client";

import { useState } from 'react';
import { threatAnalyzerSummary, ThreatAnalyzerInput, ThreatAnalyzerOutput } from '@/ai/flows/threat-analyzer';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, BrainCircuit, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function ThreatAnalyzerPage() {
  const [realTimeDataFeeds, setRealTimeDataFeeds] = useState<string>('Example: \n- Unusual outbound traffic detected from server 10.0.1.5 to IP 203.0.113.88 on port 6667 (IRC).\n- Multiple failed login attempts for user "root" on server 10.0.1.10 from IP 198.51.100.2.\n- Vulnerability CVE-2023-12345 (Remote Code Execution) reported for Apache Struts version 2.5.1 installed on web-server-01.');
  const [result, setResult] = useState<ThreatAnalyzerOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const output = await threatAnalyzerSummary({ realTimeDataFeeds });
      setResult(output);
    } catch (err) {
      console.error("Threat Analysis Error:", err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred during threat analysis.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-headline">AI Threat Analyzer</h1>
        <BrainCircuit className="h-8 w-8 text-primary" />
      </div>
      <CardDescription>
        Input real-time data feeds about potential threats and vulnerabilities. The AI will provide a summarized and prioritized list of threats.
      </CardDescription>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Analyze Threat Data</CardTitle>
            <CardDescription>Paste your real-time data feeds below.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="realTimeDataFeeds" className="text-sm font-medium">Real-time Data Feeds</Label>
              <Textarea
                id="realTimeDataFeeds"
                value={realTimeDataFeeds}
                onChange={(e) => setRealTimeDataFeeds(e.target.value)}
                placeholder="Enter real-time data feeds here..."
                className="mt-1 min-h-[200px] font-code text-sm"
                required
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...
                </>
              ) : (
                "Analyze Threats"
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
              Analysis Error
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
              Threat Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] w-full rounded-md border p-4 bg-muted/20">
              <pre className="whitespace-pre-wrap text-sm">{result.threatSummary}</pre>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

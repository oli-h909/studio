"use client";

import { useState } from 'react';
import { getSecurityRecommendations, SecurityRecommendationsInput, SecurityRecommendationsOutput } from '@/ai/flows/security-advisor'; // Re-using for similar functionality
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, FileText, Printer, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

export default function ReportingPage() {
  const [currentProfile, setCurrentProfile] = useState<string>('Current state: \n- Endpoints have basic antivirus, but no EDR solution.\n- Firewall rules are managed manually and infrequently updated.\n- Employee security training was last conducted 2 years ago.\n- Multi-factor authentication is only enforced for admin accounts.');
  const [targetProfile, setTargetProfile] = useState<string>('Desired state: \n- All endpoints protected by EDR with centralized monitoring.\n- Firewall rules automated and dynamically updated based on threat intelligence.\n- Quarterly security awareness training for all employees.\n- MFA enforced for all user accounts and critical systems.');
  const [recommendations, setRecommendations] = useState<SecurityRecommendationsOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportGenerated, setReportGenerated] useState(false);

  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setRecommendations(null);
    setReportGenerated(false);
    try {
      const input: SecurityRecommendationsInput = { currentSecurityState: currentProfile, desiredSecurityState: targetProfile };
      const output = await getSecurityRecommendations(input); // Using security advisor AI for recommendations
      setRecommendations(output);
      setReportGenerated(true);
    } catch (err) {
      console.error("Report Generation Error:", err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred while generating the report.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-headline">Reporting Panel</h1>
        <FileText className="h-8 w-8 text-primary" />
      </div>
      <CardDescription>
        Generate a report comparing current and target security profiles, including AI-driven recommendations.
      </CardDescription>

      {!reportGenerated ? (
        <Card>
          <form onSubmit={handleGenerateReport}>
            <CardHeader>
              <CardTitle>Generate Security Report</CardTitle>
              <CardDescription>Define the profiles for your report.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="currentProfile" className="text-sm font-medium">Current Security Profile</Label>
                <Textarea
                  id="currentProfile"
                  value={currentProfile}
                  onChange={(e) => setCurrentProfile(e.target.value)}
                  placeholder="Describe the current security profile..."
                  className="mt-1 min-h-[150px] font-code text-sm"
                  required
                />
              </div>
              <div>
                <Label htmlFor="targetProfile" className="text-sm font-medium">Target Security Profile</Label>
                <Textarea
                  id="targetProfile"
                  value={targetProfile}
                  onChange={(e) => setTargetProfile(e.target.value)}
                  placeholder="Describe the target security profile..."
                  className="mt-1 min-h-[150px] font-code text-sm"
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex-col sm:flex-row items-start sm:items-center gap-2">
              <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating Report...
                  </>
                ) : (
                  "Generate Report"
                )}
              </Button>
               <p className="text-xs text-muted-foreground mt-2 sm:mt-0">
                Note: PDF generation is simulated. Use browser print for a physical copy.
              </p>
            </CardFooter>
          </form>
        </Card>
      ) : null}

      {error && !reportGenerated && (
        <Card className="border-destructive bg-destructive/10">
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <AlertTriangle className="mr-2 h-5 w-5" />
              Error Generating Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {reportGenerated && (
        <>
        <div className="flex justify-end gap-2 mb-4 print:hidden">
            <Button variant="outline" onClick={() => { setReportGenerated(false); setRecommendations(null); setError(null); }}>
                Create New Report
            </Button>
            <Button onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" /> Print Report (Simulated PDF)
            </Button>
        </div>
        <Card className="p-6 print:shadow-none print:border-none" id="report-content">
          <CardHeader className="text-center print:pb-2">
            <h2 className="text-2xl font-headline text-primary">CyberGuard AI Security Report</h2>
            <CardDescription>Generated on: {new Date().toLocaleDateString()}</CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <section>
              <h3 className="text-xl font-headline mb-2 border-b pb-1">Current Security Profile</h3>
              <ScrollArea className="h-[200px] w-full rounded-md border p-3 bg-muted/20 print:h-auto print:border-none print:p-0">
                <pre className="whitespace-pre-wrap text-sm font-code">{currentProfile}</pre>
              </ScrollArea>
            </section>

            <Separator className="my-6" />

            <section>
              <h3 className="text-xl font-headline mb-2 border-b pb-1">Target Security Profile</h3>
              <ScrollArea className="h-[200px] w-full rounded-md border p-3 bg-muted/20 print:h-auto print:border-none print:p-0">
                <pre className="whitespace-pre-wrap text-sm font-code">{targetProfile}</pre>
              </ScrollArea>
            </section>

            <Separator className="my-6" />

            {recommendations && (
              <section>
                <h3 className="text-xl font-headline mb-2 border-b pb-1 flex items-center text-primary">
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  AI-Driven Recommendations
                </h3>
                <ScrollArea className="h-[300px] w-full rounded-md border p-3 bg-muted/20 print:h-auto print:border-none print:p-0">
                  <pre className="whitespace-pre-wrap text-sm">{recommendations.recommendations}</pre>
                </ScrollArea>
              </section>
            )}
             {error && (
                <Card className="border-destructive bg-destructive/10 mt-4">
                <CardHeader>
                    <CardTitle className="flex items-center text-destructive">
                    <AlertTriangle className="mr-2 h-5 w-5" />
                    Error in Recommendations
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-destructive">{error}</p>
                </CardContent>
                </Card>
            )}
          </CardContent>
          <CardFooter className="print:hidden">
            <p className="text-xs text-muted-foreground text-center w-full">
              This is a system-generated report. For actual PDF export, use the browser's print functionality.
            </p>
          </CardFooter>
        </Card>
        </>
      )}
    </div>
  );
}

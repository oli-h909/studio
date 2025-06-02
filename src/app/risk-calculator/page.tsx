"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Calculator, AlertTriangle, ShieldCheck, ShieldAlert, ShieldQuestion } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { cn } from '@/lib/utils';

const likelihoodLevels = ["Low", "Medium", "High"] as const;
const impactLevels = ["Low", "Medium", "High"] as const;

const riskFormSchema = z.object({
  assetName: z.string().min(1, "Asset name is required"),
  vulnerability: z.string().min(1, "Vulnerability description is required"),
  likelihood: z.enum(likelihoodLevels),
  impact: z.enum(impactLevels),
});

type RiskLevel = "Low" | "Medium" | "High" | "Critical";

// Simplified SCAP-like risk calculation
const calculateRisk = (likelihood: typeof likelihoodLevels[number], impact: typeof impactLevels[number]): RiskLevel => {
  if (impact === "High") {
    if (likelihood === "High") return "Critical";
    if (likelihood === "Medium") return "High";
    return "Medium";
  }
  if (impact === "Medium") {
    if (likelihood === "High") return "High";
    if (likelihood === "Medium") return "Medium";
    return "Low";
  }
  // impact === "Low"
  if (likelihood === "High") return "Medium";
  return "Low";
};

const riskLevelConfig: Record<RiskLevel, { color: string; icon: React.ElementType, label: string }> = {
  Low: { color: "bg-green-500", icon: ShieldCheck, label: "Low Risk" },
  Medium: { color: "bg-yellow-500 text-black", icon: ShieldAlert, label: "Medium Risk" },
  High: { color: "bg-orange-500", icon: AlertTriangle, label: "High Risk" },
  Critical: { color: "bg-red-600", icon: AlertTriangle, label: "Critical Risk" },
};

export default function RiskCalculatorPage() {
  const [calculatedRisk, setCalculatedRisk] = useState<RiskLevel | null>(null);
  const [riskDetails, setRiskDetails] = useState<z.infer<typeof riskFormSchema> | null>(null);

  const form = useForm<z.infer<typeof riskFormSchema>>({
    resolver: zodResolver(riskFormSchema),
    defaultValues: { assetName: "", vulnerability: "", likelihood: "Medium", impact: "Medium" },
  });

  const onSubmit = (values: z.infer<typeof riskFormSchema>) => {
    const risk = calculateRisk(values.likelihood, values.impact);
    setCalculatedRisk(risk);
    setRiskDetails(values);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-headline">Risk Calculator</h1>
        <Calculator className="h-8 w-8 text-primary" />
      </div>
      <CardDescription>
        Evaluate potential risks and exposures using a simplified SCAP-like methodology.
        Enter asset and vulnerability details to calculate a risk level.
      </CardDescription>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardHeader>
                <CardTitle>Calculate Risk</CardTitle>
                <CardDescription>Enter details to assess the risk.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="assetName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Asset Name/ID</FormLabel>
                      <FormControl><Input placeholder="e.g., Web Server 01, Employee Database" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="vulnerability"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vulnerability Description</FormLabel>
                      <FormControl><Input placeholder="e.g., Unpatched OS, Weak Password Policy" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="likelihood"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Likelihood of Exploitation</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select likelihood" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {likelihoodLevels.map(level => <SelectItem key={level} value={level}>{level}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="impact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Potential Impact</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select impact" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {impactLevels.map(level => <SelectItem key={level} value={level}>{level}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full sm:w-auto">Calculate Risk Score</Button>
              </CardFooter>
            </form>
          </Form>
        </Card>

        <Card className={cn("flex flex-col items-center justify-center", calculatedRisk ? riskLevelConfig[calculatedRisk].color : 'bg-card')}>
          <CardHeader className="text-center">
            {calculatedRisk ? (
                React.createElement(riskLevelConfig[calculatedRisk].icon, { className: "h-24 w-24 mx-auto text-primary-foreground mb-4" })
            ) : (
                <ShieldQuestion className="h-24 w-24 mx-auto text-muted-foreground mb-4" />
            )}
            <CardTitle className={cn("text-4xl font-headline", calculatedRisk ? 'text-primary-foreground' : 'text-foreground')}>
              {calculatedRisk ? riskLevelConfig[calculatedRisk].label : "Awaiting Calculation"}
            </CardTitle>
          </CardHeader>
          <CardContent className={cn("text-center", calculatedRisk ? 'text-primary-foreground/90' : 'text-muted-foreground')}>
            {riskDetails && calculatedRisk ? (
              <>
                <p className="font-semibold">{riskDetails.assetName}</p>
                <p className="text-sm">Vulnerability: {riskDetails.vulnerability}</p>
                <p className="text-sm mt-2">Likelihood: {riskDetails.likelihood} | Impact: {riskDetails.impact}</p>
              </>
            ) : (
              <p>The calculated risk level will appear here once you submit the form.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

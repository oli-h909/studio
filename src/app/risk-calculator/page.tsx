"use client";

import * as React from 'react'; // Imported React for React.createElement
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

const likelihoodLevels = ["Низька", "Середня", "Висока"] as const;
const impactLevels = ["Низька", "Середня", "Висока"] as const;

type LikelihoodLevelUk = typeof likelihoodLevels[number];
type ImpactLevelUk = typeof impactLevels[number];


const riskFormSchema = z.object({
  assetName: z.string().min(1, "Назва активу обов'язкова"),
  vulnerability: z.string().min(1, "Опис вразливості обов'язковий"),
  likelihood: z.enum(likelihoodLevels),
  impact: z.enum(impactLevels),
});

type RiskLevel = "Low" | "Medium" | "High" | "Critical"; // Internal representation

// Simplified SCAP-like risk calculation, works with Ukrainian inputs
const calculateRisk = (likelihood: LikelihoodLevelUk, impact: ImpactLevelUk): RiskLevel => {
  if (impact === "Висока") {
    if (likelihood === "Висока") return "Critical";
    if (likelihood === "Середня") return "High";
    return "Medium";
  }
  if (impact === "Середня") {
    if (likelihood === "Висока") return "High";
    if (likelihood === "Середня") return "Medium";
    return "Low";
  }
  // impact === "Низька"
  if (likelihood === "Висока") return "Medium";
  return "Low";
};

const riskLevelConfig: Record<RiskLevel, { color: string; icon: React.ElementType, label: string }> = {
  Low: { color: "bg-green-500", icon: ShieldCheck, label: "Низький ризик" },
  Medium: { color: "bg-yellow-500 text-black", icon: ShieldAlert, label: "Середній ризик" },
  High: { color: "bg-orange-500", icon: AlertTriangle, label: "Високий ризик" },
  Critical: { color: "bg-red-600", icon: AlertTriangle, label: "Критичний ризик" },
};

export default function RiskCalculatorPage() {
  const [calculatedRisk, setCalculatedRisk] = useState<RiskLevel | null>(null);
  const [riskDetails, setRiskDetails] = useState<z.infer<typeof riskFormSchema> | null>(null);

  const form = useForm<z.infer<typeof riskFormSchema>>({
    resolver: zodResolver(riskFormSchema),
    defaultValues: { assetName: "", vulnerability: "", likelihood: "Середня", impact: "Середня" },
  });

  const onSubmit = (values: z.infer<typeof riskFormSchema>) => {
    const risk = calculateRisk(values.likelihood, values.impact);
    setCalculatedRisk(risk);
    setRiskDetails(values);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-headline">Калькулятор ризиків</h1>
        <Calculator className="h-8 w-8 text-primary" />
      </div>
      <CardDescription>
        Оцінюйте потенційні ризики та вразливості за допомогою спрощеної методології, подібної до SCAP.
        Введіть деталі активу та вразливості, щоб розрахувати рівень ризику.
      </CardDescription>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardHeader>
                <CardTitle>Розрахувати ризик</CardTitle>
                <CardDescription>Введіть дані для оцінки ризику.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="assetName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Назва/ID активу</FormLabel>
                      <FormControl><Input placeholder="напр., Веб-сервер 01, База даних співробітників" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="vulnerability"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Опис вразливості</FormLabel>
                      <FormControl><Input placeholder="напр., Невиправлена ОС, Слабка політика паролів" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="likelihood"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ймовірність експлуатації</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Виберіть ймовірність" /></SelectTrigger></FormControl>
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
                      <FormLabel>Потенційний вплив</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Виберіть вплив" /></SelectTrigger></FormControl>
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
                <Button type="submit" className="w-full sm:w-auto">Розрахувати оцінку ризику</Button>
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
              {calculatedRisk ? riskLevelConfig[calculatedRisk].label : "Очікування розрахунку"}
            </CardTitle>
          </CardHeader>
          <CardContent className={cn("text-center", calculatedRisk ? 'text-primary-foreground/90' : 'text-muted-foreground')}>
            {riskDetails && calculatedRisk ? (
              <>
                <p className="font-semibold">{riskDetails.assetName}</p>
                <p className="text-sm">Вразливість: {riskDetails.vulnerability}</p>
                <p className="text-sm mt-2">Ймовірність: {riskDetails.likelihood} | Вплив: {riskDetails.impact}</p>
              </>
            ) : (
              <p>Розрахований рівень ризику з'явиться тут після надсилання форми.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


"use client";

import { useState } from 'react';
import { getSecurityRecommendations, SecurityRecommendationsInput, SecurityRecommendationsOutput } from '@/ai/flows/security-advisor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, FileText, Printer, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

const implementationStatusOptions = ["Реалізовано", "Не реалізовано", "Частково реалізовано", "Не застосовується"] as const;
const implementationLevelOptions = ["1", "2", "3", "4"] as const;
const relatedThreatOptions = [
  "Несанкціонований доступ до даних", 
  "Шкідливе програмне забезпечення", 
  "Фішинг", 
  "Відмова в обслуговуванні (DoS/DDoS)", 
  "Порушення політики безпеки",
  "Витік даних",
  "Соціальна інженерія",
  "Недостатній контроль доступу",
  "Інше"
] as const;

const profileDetailsSchema = z.object({
  identifier: z.string().optional(),
  implementationStatus: z.string().optional(),
  implementationLevel: z.string().optional(),
  comment: z.string().optional(),
  relatedThreat: z.string().optional(),
  threatDescription: z.string().optional(),
  ttpDescription: z.string().optional(),
  software: z.string().optional(),
});

const reportPageFormSchema = z.object({
  currentProfileDetails: profileDetailsSchema,
  targetProfileDetails: profileDetailsSchema,
});

type ReportPageFormValues = z.infer<typeof reportPageFormSchema>;

const formatProfileDataToString = (data: z.infer<typeof profileDetailsSchema>, profileTypeLabel: string): string => {
  let summary = `${profileTypeLabel}:\n`;
  if (data.identifier) summary += `- Ідентифікатор: ${data.identifier}\n`;
  if (data.implementationStatus) summary += `- Статус реалізації: ${data.implementationStatus}\n`;
  if (data.implementationLevel) summary += `- Рівень впровадження: ${data.implementationLevel}\n`;
  if (data.relatedThreat) summary += `- Пов'язана загроза: ${data.relatedThreat}\n`;
  if (data.threatDescription) summary += `- Опис загрози: ${data.threatDescription}\n`;
  if (data.ttpDescription) summary += `- Опис ТТР: ${data.ttpDescription}\n`;
  if (data.software) summary += `- Програмне забезпечення: ${data.software}\n`;
  if (data.comment && data.comment.trim() !== '') summary += `- Загальний коментар / Додаткова інформація:\n${data.comment.split('\n').map(line => `  ${line}`).join('\n')}\n`;
  
  // Ensure there's always some content if all optional fields are empty to avoid sending an empty profile string.
  if (summary.trim() === `${profileTypeLabel}:`) {
    summary += "- Інформація не надана\n";
  }
  return summary.trim();
};


export default function ReportingPage() {
  const [recommendations, setRecommendations] = useState<SecurityRecommendationsOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportGenerated, setReportGenerated] = useState(false);
  
  const [displayedCurrentProfile, setDisplayedCurrentProfile] = useState<string>('');
  const [displayedTargetProfile, setDisplayedTargetProfile] = useState<string>('');

  const form = useForm<ReportPageFormValues>({
    resolver: zodResolver(reportPageFormSchema),
    defaultValues: {
      currentProfileDetails: {
        identifier: 'ID.AM-3',
        implementationStatus: 'Реалізовано',
        implementationLevel: '3', // Example level
        comment: 'Кінцеві точки мають базовий антивірус, але немає рішення EDR.\nПравила брандмауера керуються вручну та рідко оновлюються.\nНавчання співробітників з безпеки востаннє проводилося 2 роки тому.\nБагатофакторна автентифікація застосовується лише для облікових записів адміністраторів.',
        relatedThreat: 'Несанкціонований доступ до даних',
        threatDescription: 'Недостатній контроль доступу до баз даних користувачів.',
        ttpDescription: 'OWASP A5 - Broken Access Control: відсутність або обхід обмежень на доступ до об\'єктів.',
        software: 'Власна CRM система',
      },
      targetProfileDetails: {
        identifier: '',
        implementationStatus: '',
        implementationLevel: '',
        comment: 'Усі кінцеві точки захищені EDR з централізованим моніторингом.\nПравила брандмауера автоматизовані та динамічно оновлюються на основі даних про загрози.\nЩоквартальне навчання з питань безпеки для всіх співробітників.\nMFA застосовується для всіх облікових записів користувачів та критичних систем.',
        relatedThreat: '',
        threatDescription: '',
        ttpDescription: '',
        software: '',
      },
    },
  });

  const handleGenerateReport = async (values: ReportPageFormValues) => {
    setIsLoading(true);
    setError(null);
    setRecommendations(null);
    setReportGenerated(false);

    const currentProfileString = formatProfileDataToString(values.currentProfileDetails, "Поточний профіль безпеки");
    const targetProfileString = formatProfileDataToString(values.targetProfileDetails, "Цільовий профіль безпеки");
    
    setDisplayedCurrentProfile(currentProfileString);
    setDisplayedTargetProfile(targetProfileString);

    try {
      const input: SecurityRecommendationsInput = { 
        currentSecurityState: currentProfileString, 
        desiredSecurityState: targetProfileString 
      };
      const output = await getSecurityRecommendations(input); 
      setRecommendations(output);
      setReportGenerated(true);
    } catch (err) {
      console.error("Report Generation Error:", err);
      setError(err instanceof Error ? err.message : 'Сталася невідома помилка під час генерації звіту.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const renderProfileFields = (profileType: "currentProfileDetails" | "targetProfileDetails", title: string) => (
    <div className="space-y-4 p-4 border rounded-md bg-card shadow-sm">
      <h3 className="text-lg font-medium text-primary">{title}</h3>
      <FormField
        control={form.control}
        name={`${profileType}.identifier`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Ідентифікатор (напр., ID.AM-3)</FormLabel>
            <FormControl><Input placeholder="Введіть ідентифікатор..." {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name={`${profileType}.implementationStatus`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Статус реалізації</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl><SelectTrigger><SelectValue placeholder="Оберіть статус" /></SelectTrigger></FormControl>
              <SelectContent>
                {implementationStatusOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name={`${profileType}.implementationLevel`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Рівень впровадження (1-4)</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl><SelectTrigger><SelectValue placeholder="Оберіть рівень" /></SelectTrigger></FormControl>
              <SelectContent>
                {implementationLevelOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name={`${profileType}.relatedThreat`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Пов'язана загроза</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl><SelectTrigger><SelectValue placeholder="Оберіть загрозу" /></SelectTrigger></FormControl>
              <SelectContent>
                {relatedThreatOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name={`${profileType}.threatDescription`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Опис загрози</FormLabel>
            <FormControl><Textarea placeholder="Детальний опис загрози..." {...field} className="min-h-[100px] font-code text-sm" /></FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name={`${profileType}.ttpDescription`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Опис TTP (Тактики, Техніки, Процедури)</FormLabel>
            <FormControl><Textarea placeholder="Опис TTP..." {...field} className="min-h-[100px] font-code text-sm" /></FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name={`${profileType}.software`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Програмне забезпечення</FormLabel>
            <FormControl><Input placeholder="Вкажіть ПЗ, версії..." {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
       <FormField
        control={form.control}
        name={`${profileType}.comment`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Загальний коментар / Додаткова інформація</FormLabel>
            <FormControl><Textarea placeholder="Загальний опис стану, політик, процедур..." {...field} className="min-h-[150px] font-code text-sm" /></FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-headline">Панель звітів</h1>
        <FileText className="h-8 w-8 text-primary" />
      </div>
      <CardDescription>
        Створіть звіт, що порівнює поточний та цільовий профілі безпеки, включаючи рекомендації на основі ШІ.
      </CardDescription>

      {!reportGenerated ? (
        <Card>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleGenerateReport)}>
              <CardHeader>
                <CardTitle>Створити звіт про безпеку</CardTitle>
                <CardDescription>Заповніть деталі для поточного та цільового профілів.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {renderProfileFields("currentProfileDetails", "Поточний профіль безпеки")}
                {renderProfileFields("targetProfileDetails", "Цільовий профіль безпеки")}
              </CardContent>
              <CardFooter className="flex-col sm:flex-row items-start sm:items-center gap-2">
                <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Генерація звіту...
                    </>
                  ) : (
                    "Створити звіт"
                  )}
                </Button>
                 <p className="text-xs text-muted-foreground mt-2 sm:mt-0">
                  Примітка: Генерація PDF симулюється. Використовуйте друк у браузері для отримання фізичної копії.
                </p>
              </CardFooter>
            </form>
          </Form>
        </Card>
      ) : null}

      {error && !reportGenerated && (
        <Card className="border-destructive bg-destructive/10">
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <AlertTriangle className="mr-2 h-5 w-5" />
              Помилка генерації звіту
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
                Створити новий звіт
            </Button>
            <Button onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" /> Роздрукувати звіт (симульований PDF)
            </Button>
        </div>
        <Card className="p-6 print:shadow-none print:border-none" id="report-content">
          <CardHeader className="text-center print:pb-2">
            <h2 className="text-2xl font-headline text-primary">Звіт про безпеку КіберСтраж AI</h2>
            <CardDescription>Згенеровано: {new Date().toLocaleDateString()}</CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <section>
              <h3 className="text-xl font-headline mb-2 border-b pb-1">Поточний профіль безпеки</h3>
              <ScrollArea className="h-auto max-h-[300px] w-full rounded-md border p-3 bg-muted/20 print:h-auto print:border-none print:p-0">
                <pre className="whitespace-pre-wrap text-sm font-code">{displayedCurrentProfile}</pre>
              </ScrollArea>
            </section>

            <Separator className="my-6" />

            <section>
              <h3 className="text-xl font-headline mb-2 border-b pb-1">Цільовий профіль безпеки</h3>
              <ScrollArea className="h-auto max-h-[300px] w-full rounded-md border p-3 bg-muted/20 print:h-auto print:border-none print:p-0">
                <pre className="whitespace-pre-wrap text-sm font-code">{displayedTargetProfile}</pre>
              </ScrollArea>
            </section>

            <Separator className="my-6" />

            {isLoading && !recommendations && (
                 <div className="flex items-center justify-center py-6">
                    <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Завантаження рекомендацій...</p>
                 </div>
            )}

            {error && (
                <Card className="border-destructive bg-destructive/10 mt-4">
                <CardHeader>
                    <CardTitle className="flex items-center text-destructive">
                    <AlertTriangle className="mr-2 h-5 w-5" />
                    Помилка в рекомендаціях
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-destructive">{error}</p>
                </CardContent>
                </Card>
            )}
            
            {recommendations && !error && (
              <section>
                <h3 className="text-xl font-headline mb-2 border-b pb-1 flex items-center text-primary">
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Рекомендації на основі ШІ
                </h3>
                <ScrollArea className="h-auto max-h-[400px] w-full rounded-md border p-3 bg-muted/20 print:h-auto print:border-none print:p-0">
                  <pre className="whitespace-pre-wrap text-sm">{recommendations.recommendations}</pre>
                </ScrollArea>
              </section>
            )}
          </CardContent>
          <CardFooter className="print:hidden">
            <p className="text-xs text-muted-foreground text-center w-full">
              Це системно згенерований звіт. Для фактичного експорту в PDF використовуйте функцію друку браузера.
            </p>
          </CardFooter>
        </Card>
        </>
      )}
    </div>
  );
}

    
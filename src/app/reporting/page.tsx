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
  const [currentProfile, setCurrentProfile] = useState<string>('Поточний стан: \n- Кінцеві точки мають базовий антивірус, але немає рішення EDR.\n- Правила брандмауера керуються вручну та рідко оновлюються.\n- Навчання співробітників з безпеки востаннє проводилося 2 роки тому.\n- Багатофакторна автентифікація застосовується лише для облікових записів адміністраторів.');
  const [targetProfile, setTargetProfile] = useState<string>('Бажаний стан: \n- Усі кінцеві точки захищені EDR з централізованим моніторингом.\n- Правила брандмауера автоматизовані та динамічно оновлюються на основі даних про загрози.\n- Щоквартальне навчання з питань безпеки для всіх співробітників.\n- MFA застосовується для всіх облікових записів користувачів та критичних систем.');
  const [recommendations, setRecommendations] = useState<SecurityRecommendationsOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportGenerated, setReportGenerated] = useState(false);

  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setRecommendations(null);
    setReportGenerated(false);
    try {
      const input: SecurityRecommendationsInput = { currentSecurityState: currentProfile, desiredSecurityState: targetProfile };
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
          <form onSubmit={handleGenerateReport}>
            <CardHeader>
              <CardTitle>Створити звіт про безпеку</CardTitle>
              <CardDescription>Визначте профілі для вашого звіту.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="currentProfile" className="text-sm font-medium">Поточний профіль безпеки</Label>
                <Textarea
                  id="currentProfile"
                  value={currentProfile}
                  onChange={(e) => setCurrentProfile(e.target.value)}
                  placeholder="Опишіть поточний профіль безпеки..."
                  className="mt-1 min-h-[150px] font-code text-sm"
                  required
                />
              </div>
              <div>
                <Label htmlFor="targetProfile" className="text-sm font-medium">Цільовий профіль безпеки</Label>
                <Textarea
                  id="targetProfile"
                  value={targetProfile}
                  onChange={(e) => setTargetProfile(e.target.value)}
                  placeholder="Опишіть цільовий профіль безпеки..."
                  className="mt-1 min-h-[150px] font-code text-sm"
                  required
                />
              </div>
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
              <ScrollArea className="h-[200px] w-full rounded-md border p-3 bg-muted/20 print:h-auto print:border-none print:p-0">
                <pre className="whitespace-pre-wrap text-sm font-code">{currentProfile}</pre>
              </ScrollArea>
            </section>

            <Separator className="my-6" />

            <section>
              <h3 className="text-xl font-headline mb-2 border-b pb-1">Цільовий профіль безпеки</h3>
              <ScrollArea className="h-[200px] w-full rounded-md border p-3 bg-muted/20 print:h-auto print:border-none print:p-0">
                <pre className="whitespace-pre-wrap text-sm font-code">{targetProfile}</pre>
              </ScrollArea>
            </section>

            <Separator className="my-6" />

            {recommendations && (
              <section>
                <h3 className="text-xl font-headline mb-2 border-b pb-1 flex items-center text-primary">
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Рекомендації на основі ШІ
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
                    Помилка в рекомендаціях
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
              Це системно згенерований звіт. Для фактичного експорту в PDF використовуйте функцію друку браузера.
            </p>
          </CardFooter>
        </Card>
        </>
      )}
    </div>
  );
}

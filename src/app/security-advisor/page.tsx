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
  const [currentSecurityState, setCurrentSecurityState] = useState<string>('Поточний стан: \n- Кінцеві точки мають базовий антивірус, але немає рішення EDR.\n- Правила брандмауера керуються вручну та рідко оновлюються.\n- Навчання співробітників з безпеки востаннє проводилося 2 роки тому.\n- Багатофакторна автентифікація застосовується лише для облікових записів адміністраторів.');
  const [desiredSecurityState, setDesiredSecurityState] = useState<string>('Бажаний стан: \n- Усі кінцеві точки захищені EDR з централізованим моніторингом.\n- Правила брандмауера автоматизовані та динамічно оновлюються на основі даних про загрози.\n- Щоквартальне навчання з питань безпеки для всіх співробітників.\n- MFA застосовується для всіх облікових записів користувачів та критичних систем.');
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
      setError(err instanceof Error ? err.message : 'Сталася невідома помилка під час отримання рекомендацій.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-headline">Радник з безпеки ШІ</h1>
        <UserCheck className="h-8 w-8 text-primary" />
      </div>
      <CardDescription>
        Опишіть ваш поточний та бажаний стани безпеки. ШІ надасть дієві рекомендації для подолання розриву.
      </CardDescription>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Отримати рекомендації з безпеки</CardTitle>
            <CardDescription>Деталізуйте вашу поточну ситуацію та майбутні цілі.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="currentSecurityState" className="text-sm font-medium">Поточний стан безпеки</Label>
              <Textarea
                id="currentSecurityState"
                value={currentSecurityState}
                onChange={(e) => setCurrentSecurityState(e.target.value)}
                placeholder="Опишіть ваші поточні заходи безпеки, вразливості, нещодавні інциденти тощо."
                className="mt-1 min-h-[150px] font-code text-sm"
                required
              />
            </div>
            <div>
              <Label htmlFor="desiredSecurityState" className="text-sm font-medium">Бажаний стан безпеки</Label>
              <Textarea
                id="desiredSecurityState"
                value={desiredSecurityState}
                onChange={(e) => setDesiredSecurityState(e.target.value)}
                placeholder="Опишіть вашу цільову позицію безпеки, цілі відповідності, апетит до ризику тощо."
                className="mt-1 min-h-[150px] font-code text-sm"
                required
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Генерація порад...
                </>
              ) : (
                "Отримати рекомендації"
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
              Помилка генерації рекомендацій
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
              Дієві рекомендації
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

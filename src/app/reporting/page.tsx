
"use client";

import { useState, useEffect, useRef } from 'react';
import { analyzeSecurityGaps, GapAnalysisInput, GapAnalysisOutput } from '@/ai/flows/gap-analyzer-flow';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm, useWatch, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, FileText, Printer, AlertTriangle, PlusCircle, Trash2, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useReactToPrint } from 'react-to-print';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const implementationStatusOptions = ["Реалізовано", "Не реалізовано", "Частково реалізовано", "Не застосовується"] as const;
const implementationLevelOptions = ["1", "2", "3", "4"] as const;

const relatedThreatOptions = [
  "SQL Injection на сервері БД",
  "XSS у WordPress",
  "Атака через шкідливі вкладення",
  "Використання уразливого компоненту СМS",
  "Витік даних",
  "DoS-атака на портал",
  "Збереження паролів у відкритому вигляді",
  "Незахищене ліцензування CRM",
  "Несанкціонований доступ до бази користувачів",
  "Недостатній контроль доступу",
  "Обхід автентифікації",
  "Порушення політики безпеки",
  "Соціальна інженерія",
  "Фішинг",
  "Фішинг-посилання у CRM",
  "Шкідливе програмне забезпечення",
  "Інше"
].sort((a, b) => a === "Інше" ? 1 : b === "Інше" ? -1 : a.localeCompare(b)) as const;


const softwareOptions = [
  "1C Бухгалтерія",
  "WordPress CMS",
  "Антивірусне ПЗ",
  "База даних SQL",
  "Будь-яке ПЗ з автентифікацією",
  "Веб-портал",
  "Власна CRM система",
  "Операційна система Windows",
  "Поштовий клієнт",
  "Система автентифікації",
  "Файловий сервер",
  "Інше",
  "-"
].sort((a, b) => (a === "Інше" || a === "-") ? 1 : (b === "Інше" || b === "-") ? -1 : a.localeCompare(b)) as const;

const hardwareOptions = [
  "Веб-сервер",
  "Мережеве обладнання (маршрутизатори, комутатори)",
  "Пошта сервер",
  "Робочі станції",
  "Сервер баз даних",
  "Інше",
  "-"
].sort((a, b) => (a === "Інше" || a === "-") ? 1 : (b === "Інше" || b === "-") ? -1 : a.localeCompare(b)) as const;

const informationResourceOptions = [
  "База даних клієнтів",
  "Веб-сайт компанії",
  "Внутрішні ресурси компанії",
  "Електронна пошта",
  "Конфіденційні документи",
  "Ліцензійні ключі ПЗ",
  "Облікові дані користувачів",
  "Персональні дані співробітників",
  "Політика безпеки компанії",
  "Файловий сервер",
  "Інше",
  "-"
].sort((a, b) => (a === "Інше" || a === "-") ? 1 : (b === "Інше" || b === "-") ? -1 : a.localeCompare(b)) as const;

const icsToolOptions = [
  "DLP система",
  "SIEM система",
  "WAF ModSecurity",
  "Антивірус Касперського",
  "Менеджер паролів",
  "Навчальні платформи з кібербезпеки",
  "Сканер вразливостей",
  "Система виявлення вторгнень (IDS)",
  "Система захисту від DDoS",
  "Система управління активами",
  "Система управління ідентифікацією (IDM)",
  "Фільтр електронної пошти",
  "Інше",
  "-"
].sort((a, b) => (a === "Інше" || a === "-") ? 1 : (b === "Інше" || b === "-") ? -1 : a.localeCompare(b)) as const;

const threatConfigurations: Record<string, {
  identifier: string;
  software: typeof softwareOptions[number];
  hardware: typeof hardwareOptions[number];
  informationResource: typeof informationResourceOptions[number];
  icsTool: typeof icsToolOptions[number];
}> = {
  "Несанкціонований доступ до бази користувачів": { 
    identifier: 'ID.AM-3', software: 'Власна CRM система', hardware: 'Пошта сервер', informationResource: 'База даних клієнтів', icsTool: 'WAF ModSecurity',
  },
  "Шкідливе програмне забезпечення": {
    identifier: 'ID.AM-1', software: 'Антивірусне ПЗ', hardware: 'Робочі станції', informationResource: '-', icsTool: 'Система виявлення вторгнень (IDS)',
  },
  "Фішинг": {
    identifier: 'ID.AM-2', software: '-', hardware: '-', informationResource: 'Облікові дані користувачів', icsTool: 'Фільтр електронної пошти',
  },
  "DoS-атака на портал": { 
    identifier: 'ID.AM-5', software: 'Веб-портал', hardware: 'Мережеве обладнання (маршрутизатори, комутатори)', informationResource: 'Веб-сайт компанії', icsTool: 'Система захисту від DDoS',
  },
  "Порушення політики безпеки": {
    identifier: 'ID.AM-1', software: 'Операційна система Windows', hardware: '-', informationResource: 'Політика безпеки компанії', icsTool: 'SIEM система',
  },
  "Витік даних": {
    identifier: 'ID.AM-3', software: 'База даних SQL', hardware: 'Сервер баз даних', informationResource: 'Конфіденційні документи', icsTool: 'DLP система',
  },
  "Соціальна інженерія": {
    identifier: 'ID.AM-2', software: '-', hardware: '-', informationResource: 'Персональні дані співробітників', icsTool: 'Навчальні платформи з кібербезпеки',
  },
  "Недостатній контроль доступу": {
    identifier: 'ID.AM-3', software: 'Файловий сервер', hardware: '-', informationResource: 'Внутрішні ресурси компанії', icsTool: 'Система управління ідентифікацією (IDM)',
  },
  "SQL Injection на сервері БД": {
    identifier: 'ID.AM-3', software: 'База даних SQL', hardware: 'Сервер баз даних', informationResource: 'База даних клієнтів', icsTool: 'WAF ModSecurity',
  },
  "XSS у WordPress": {
    identifier: 'ID.AM-4', software: 'WordPress CMS', hardware: 'Веб-сервер', informationResource: 'Веб-сайт компанії', icsTool: 'WAF ModSecurity',
  },
  "Незахищене ліцензування CRM": {
    identifier: 'ID.AM-1', software: 'Власна CRM система', hardware: '-', informationResource: 'Ліцензійні ключі ПЗ', icsTool: 'Система управління активами',
  },
  "Атака через шкідливі вкладення": {
    identifier: 'ID.AM-1', software: 'Поштовий клієнт', hardware: 'Робочі станції', informationResource: 'Електронна пошта', icsTool: 'Фільтр електронної пошти',
  },
  "Обхід автентифікації": {
    identifier: 'ID.AM-3', software: 'Система автентифікації', hardware: '-', informationResource: 'Облікові дані користувачів', icsTool: 'Система управління ідентифікацією (IDM)',
  },
  "Фішинг-посилання у CRM": {
    identifier: 'ID.AM-2', software: 'Власна CRM система', hardware: '-', informationResource: 'Облікові дані користувачів', icsTool: 'Фільтр електронної пошти',
  },
  "Збереження паролів у відкритому вигляді": {
    identifier: 'ID.AM-3', software: 'Будь-яке ПЗ з автентифікацією', hardware: '-', informationResource: 'Облікові дані користувачів', icsTool: 'Менеджер паролів',
  },
  "Використання уразливого компоненту СМS": {
    identifier: 'ID.AM-1', software: 'WordPress CMS', hardware: 'Веб-сервер', informationResource: 'Веб-сайт компанії', icsTool: 'Сканер вразливостей',
  },
  "Інше": { identifier: 'N/A', software: '-', hardware: '-', informationResource: '-', icsTool: '-', }
};

const singleCurrentProfileThreatSchema = z.object({
  id: z.string(), // for useFieldArray key
  identifier: z.string().optional(),
  implementationStatus: z.string().optional(),
  implementationLevel: z.string().optional(),
  relatedThreat: z.string().optional(),
  threatDescription: z.string().optional(),
  ttpDescription: z.string().optional(),
  software: z.string().optional(),
  hardware: z.string().optional(),
  informationResource: z.string().optional(),
  icsTool: z.string().optional(),
  comment: z.string().optional(),
});
type SingleCurrentProfileThreatValues = z.infer<typeof singleCurrentProfileThreatSchema>;

const targetProfileIdentifierSchema = z.object({
  id: z.string(), // for useFieldArray key
  value: z.string().min(1, "Ідентифікатор не може бути порожнім"),
});

const targetProfileDetailsSchema = z.object({
  identifiers: z.array(targetProfileIdentifierSchema).min(1, "Має бути принаймні один цільовий ідентифікатор"),
  implementationLevel: z.string().optional(),
  appliesToSoftware: z.boolean().optional().default(false),
  appliesToHardware: z.boolean().optional().default(false),
  appliesToInformationResource: z.boolean().optional().default(false),
  appliesToIcsTool: z.boolean().optional().default(false),
});

const reportPageFormSchema = z.object({
  currentProfileDetails: z.array(singleCurrentProfileThreatSchema).min(1, "Має бути принаймні одна загроза в поточному профілі"),
  targetProfileDetails: targetProfileDetailsSchema,
});

type ReportPageFormValues = z.infer<typeof reportPageFormSchema>;

const defaultThreatValues: SingleCurrentProfileThreatValues = {
  id: Date.now().toString(), // Simple unique ID for new fields
  identifier: 'ID.AM-3',
  implementationStatus: 'Реалізовано',
  implementationLevel: '3',
  relatedThreat: 'Несанкціонований доступ до бази користувачів',
  software: 'Власна CRM система',
  hardware: 'Пошта сервер',
  informationResource: 'База даних клієнтів',
  icsTool: 'WAF ModSecurity',
  threatDescription: 'Недостатній контроль доступу до баз даних користувачів.',
  ttpDescription: 'OWASP A5 - Broken Access Control: відсутність або обхід обмежень на доступ до об\'єктів.',
  comment: 'Кінцеві точки мають базовий антивірус, але немає рішення EDR.',
};

const defaultTargetIdentifierValue = { id: Date.now().toString(), value: 'ID.AM-3 Target' };


const formatCurrentProfileDataToString = (data: SingleCurrentProfileThreatValues[]): string => {
  if (!data || data.length === 0) return "Поточний профіль безпеки: Інформація не надана\n";
  
  let summary = "Поточний профіль безпеки (виявлені загрози та їх деталі):\n\n";
  data.forEach((threat, index) => {
    summary += `Загроза ${index + 1}:\n`;
    if (threat.relatedThreat) summary += `- Пов'язана загроза: ${threat.relatedThreat}\n`;
    if (threat.identifier) summary += `  - Ідентифікатор: ${threat.identifier}\n`;
    if (threat.implementationStatus) summary += `  - Статус реалізації: ${threat.implementationStatus}\n`;
    if (threat.implementationLevel) summary += `  - Рівень впровадження: ${threat.implementationLevel}\n`;
    if (threat.software && threat.software !== '-') summary += `  - Програмне забезпечення: ${threat.software}\n`;
    if (threat.hardware && threat.hardware !== '-') summary += `  - Апаратне забезпечення: ${threat.hardware}\n`;
    if (threat.informationResource && threat.informationResource !== '-') summary += `  - Інформаційний ресурс: ${threat.informationResource}\n`;
    if (threat.icsTool && threat.icsTool !== '-') summary += `  - Засіб ІКЗ: ${threat.icsTool}\n`;
    if (threat.threatDescription) summary += `  - Опис загрози: ${threat.threatDescription}\n`;
    if (threat.ttpDescription) summary += `  - Опис ТТР: ${threat.ttpDescription}\n`;
    if (threat.comment && threat.comment.trim() !== '') summary += `  - Коментар: ${threat.comment}\n`;
    summary += "\n";
  });
  return summary.trim();
};

const formatTargetProfileDataToString = (data: z.infer<typeof targetProfileDetailsSchema>): string => {
  let summary = `Цільовий профіль безпеки:\n`;
  if (data.identifiers && data.identifiers.length > 0) {
    summary += `- Цільові ідентифікатори: ${data.identifiers.map(id => id.value).join(', ')}\n`;
  } else {
    summary += `- Цільові ідентифікатори: не вказано\n`;
  }
  if (data.implementationLevel) summary += `- Рівень впровадження: ${data.implementationLevel}\n`;
  
  const selectedAssets: string[] = [];
  if (data.appliesToSoftware) selectedAssets.push("Програмне забезпечення");
  if (data.appliesToHardware) selectedAssets.push("Апаратне забезпечення");
  if (data.appliesToInformationResource) selectedAssets.push("Інформаційний ресурс");
  if (data.appliesToIcsTool) selectedAssets.push("Засіб ІКЗ");

  if (selectedAssets.length > 0) {
    summary += `- Застосовується до активів: ${selectedAssets.join(', ')}\n`;
  } else {
    summary += `- Активи не обрані\n`;
  }
  
  if (summary.trim() === `Цільовий профіль безпеки:`) {
    summary += "- Інформація не надана\n";
  }
  return summary.trim();
};

const RecommendationPriorityBadge = ({ priority }: { priority: "High" | "Medium" | "Low" }) => {
  const PColors = {
    High: "bg-red-600 hover:bg-red-700",
    Medium: "bg-orange-500 hover:bg-orange-600",
    Low: "bg-yellow-500 hover:bg-yellow-600 text-black",
  };
  return <Badge className={cn(PColors[priority])}>{priority}</Badge>;
};

// Component for printing
const PrintableReport = React.forwardRef<HTMLDivElement, {
  currentProfileSummary: string;
  targetProfileSummary: string;
  aiAnalysis: GapAnalysisOutput | null;
}>(({ currentProfileSummary, targetProfileSummary, aiAnalysis }, ref) => {
  return (
    <div ref={ref} className="p-8 print:p-4 font-sans">
      <header className="text-center mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">Звіт про безпеку "КіберСтраж AI"</h1>
        <p className="text-sm text-muted-foreground">Згенеровано: {new Date().toLocaleDateString('uk-UA', { year: 'numeric', month: 'long', day: 'numeric' })} {new Date().toLocaleTimeString('uk-UA')}</p>
      </header>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-3 border-b-2 border-primary pb-2">1. Поточний профіль безпеки</h2>
        <pre className="whitespace-pre-wrap text-sm bg-gray-100 dark:bg-card p-4 rounded-md font-code">{currentProfileSummary}</pre>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-3 border-b-2 border-primary pb-2">2. Цільовий профіль безпеки</h2>
        <pre className="whitespace-pre-wrap text-sm bg-gray-100 dark:bg-card p-4 rounded-md font-code">{targetProfileSummary}</pre>
      </section>

      {aiAnalysis && (
        <>
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-3 border-b-2 border-primary pb-2">3. Аналіз розривів (AI)</h2>
            <div className="text-sm bg-gray-100 dark:bg-card p-4 rounded-md">
              <p className="whitespace-pre-wrap">{aiAnalysis.gapAnalysis}</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 border-b-2 border-primary pb-2">4. Рекомендації (AI)</h2>
            {aiAnalysis.recommendations.length > 0 ? (
              <Accordion type="single" collapsible className="w-full" defaultValue={`recommendation-0`}>
                {aiAnalysis.recommendations.map((rec, index) => (
                  <AccordionItem value={`recommendation-${index}`} key={index} className="mb-2 border dark:border-border rounded-md overflow-hidden">
                    <AccordionTrigger className="p-4 text-left hover:no-underline bg-gray-100 dark:bg-card hover:bg-gray-200 dark:hover:bg-secondary transition-colors">
                      <div className="flex justify-between items-center w-full">
                        <span className="font-medium text-base">{index + 1}. {rec.title}</span>
                        <RecommendationPriorityBadge priority={rec.priority} />
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="p-4 border-t dark:border-border bg-white dark:bg-background">
                      <p className="whitespace-pre-wrap text-sm">{rec.description}</p>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <p className="text-sm text-muted-foreground">Рекомендації не згенеровано.</p>
            )}
          </section>
        </>
      )}
       <footer className="mt-12 pt-4 border-t text-center text-xs text-muted-foreground">
        КіберСтраж AI - Захист вашої інфраструктури
      </footer>
    </div>
  );
});
PrintableReport.displayName = 'PrintableReport';


export default function ReportingPage() {
  const [aiAnalysisResult, setAiAnalysisResult] = useState<GapAnalysisOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportGenerated, setReportGenerated] = useState(false);
  
  const [displayedCurrentProfile, setDisplayedCurrentProfile] = useState<string>('');
  const [displayedTargetProfile, setDisplayedTargetProfile] = useState<string>('');
  
  const reportPrintRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    content: () => reportPrintRef.current,
    documentTitle: `Звіт_КіберСтраж_AI_${new Date().toISOString().split('T')[0]}`,
  });

  const form = useForm<ReportPageFormValues>({
    resolver: zodResolver(reportPageFormSchema),
    defaultValues: {
      currentProfileDetails: [defaultThreatValues],
      targetProfileDetails: {
        identifiers: [defaultTargetIdentifierValue],
        implementationLevel: '4',
        appliesToSoftware: true,
        appliesToHardware: true,
        appliesToInformationResource: true,
        appliesToIcsTool: true,
      },
    },
  });

  const { fields: currentThreatFields, append: appendCurrentThreat, remove: removeCurrentThreat } = useFieldArray({
    control: form.control,
    name: "currentProfileDetails",
  });

  const { fields: targetIdentifierFields, append: appendTargetIdentifier, remove: removeTargetIdentifier } = useFieldArray({
    control: form.control,
    name: "targetProfileDetails.identifiers",
  });


  const watchedThreats = useWatch({
    control: form.control,
    name: 'currentProfileDetails',
  });

  useEffect(() => {
    if (watchedThreats) {
      watchedThreats.forEach((threat, index) => {
        if (threat.relatedThreat) {
          const config = threatConfigurations[threat.relatedThreat] || threatConfigurations["Інше"];
          const currentIdentifier = form.getValues(`currentProfileDetails.${index}.identifier`);
          const currentSoftware = form.getValues(`currentProfileDetails.${index}.software`);
          // Only update if the config is different to prevent infinite loops if a field triggers the watch
          if (currentIdentifier !== config.identifier) form.setValue(`currentProfileDetails.${index}.identifier`, config.identifier, { shouldValidate: true });
          if (currentSoftware !== config.software) form.setValue(`currentProfileDetails.${index}.software`, config.software, { shouldValidate: true });
          form.setValue(`currentProfileDetails.${index}.hardware`, config.hardware, { shouldValidate: true });
          form.setValue(`currentProfileDetails.${index}.informationResource`, config.informationResource, { shouldValidate: true });
          form.setValue(`currentProfileDetails.${index}.icsTool`, config.icsTool, { shouldValidate: true });
        }
      });
    }
  }, [watchedThreats, form]);

  const handleGenerateReport = async (values: ReportPageFormValues) => {
    setIsLoading(true);
    setError(null);
    setAiAnalysisResult(null);
    setReportGenerated(false);

    const currentProfileString = formatCurrentProfileDataToString(values.currentProfileDetails);
    const targetProfileString = formatTargetProfileDataToString(values.targetProfileDetails);
    
    setDisplayedCurrentProfile(currentProfileString);
    setDisplayedTargetProfile(targetProfileString);

    try {
      const input: GapAnalysisInput = { 
        currentProfileSummary: currentProfileString, 
        targetProfileSummary: targetProfileString 
      };
      const output = await analyzeSecurityGaps(input); 
      setAiAnalysisResult(output);
      setReportGenerated(true);
    } catch (err) {
      console.error("Report Generation Error:", err);
      setError(err instanceof Error ? err.message : 'Сталася невідома помилка під час генерації звіту.');
      setReportGenerated(true); // Still show the basic report even if AI fails
    } finally {
      setIsLoading(false);
    }
  };


  const renderCurrentProfileThreatFields = (threatIndex: number) => {
    const currentThreat = form.watch(`currentProfileDetails.${threatIndex}.relatedThreat`);
    return (
    <CardContent className="space-y-4 p-4 border rounded-md bg-card/80 shadow-sm mb-4 relative">
       <Button 
          type="button" 
          variant="ghost" 
          size="icon"
          className="absolute top-2 right-2 h-7 w-7 text-destructive hover:bg-destructive/10"
          onClick={() => currentThreatFields.length > 1 ? removeCurrentThreat(threatIndex) : alert("Має бути принаймні одна загроза.")}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      <h4 className="text-md font-semibold text-primary/90">Загроза #{threatIndex + 1}</h4>
      <FormField
        control={form.control}
        name={`currentProfileDetails.${threatIndex}.relatedThreat`}
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
        name={`currentProfileDetails.${threatIndex}.identifier`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Ідентифікатор</FormLabel>
            <FormControl><Input placeholder="Автоматично" {...field} disabled /></FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
       <FormField
        control={form.control}
        name={`currentProfileDetails.${threatIndex}.software`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Програмне забезпечення</FormLabel>
            <Select onValueChange={field.onChange} value={field.value || '-'} disabled={!currentThreat || currentThreat === "Інше"}>
              <FormControl><SelectTrigger><SelectValue placeholder="Оберіть ПЗ" /></SelectTrigger></FormControl>
              <SelectContent>
                {softwareOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name={`currentProfileDetails.${threatIndex}.hardware`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Апаратне забезпечення</FormLabel>
            <Select onValueChange={field.onChange} value={field.value || '-'} disabled={!currentThreat || currentThreat === "Інше"}>
              <FormControl><SelectTrigger><SelectValue placeholder="Оберіть апаратне забезпечення" /></SelectTrigger></FormControl>
              <SelectContent>
                {hardwareOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name={`currentProfileDetails.${threatIndex}.informationResource`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Інформаційний ресурс</FormLabel>
            <Select onValueChange={field.onChange} value={field.value || '-'} disabled={!currentThreat || currentThreat === "Інше"}>
              <FormControl><SelectTrigger><SelectValue placeholder="Оберіть інформаційний ресурс" /></SelectTrigger></FormControl>
              <SelectContent>
                {informationResourceOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name={`currentProfileDetails.${threatIndex}.icsTool`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Засіб ІКЗ</FormLabel>
            <Select onValueChange={field.onChange} value={field.value || '-'} disabled={!currentThreat || currentThreat === "Інше"}>
              <FormControl><SelectTrigger><SelectValue placeholder="Оберіть засіб ІКЗ" /></SelectTrigger></FormControl>
              <SelectContent>
                {icsToolOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name={`currentProfileDetails.${threatIndex}.implementationStatus`}
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
        name={`currentProfileDetails.${threatIndex}.implementationLevel`}
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
        name={`currentProfileDetails.${threatIndex}.threatDescription`}
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
        name={`currentProfileDetails.${threatIndex}.ttpDescription`}
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
        name={`currentProfileDetails.${threatIndex}.comment`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Загальний коментар / Додаткова інформація</FormLabel>
            <FormControl><Textarea placeholder="Загальний опис стану, політик, процедур..." {...field} className="min-h-[150px] font-code text-sm" /></FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </CardContent>
    );
  };

  const renderTargetProfileFields = () => (
    <div className="space-y-4 p-4 border rounded-md bg-card shadow-sm">
      <h3 className="text-lg font-medium text-primary">Цільовий профіль безпеки</h3>
      
      <FormLabel>Цільові ідентифікатори</FormLabel>
      {targetIdentifierFields.map((field, index) => (
        <div key={field.id} className="flex items-center gap-2">
          <FormField
            control={form.control}
            name={`targetProfileDetails.identifiers.${index}.value`}
            render={({ field: innerField }) => (
              <FormItem className="flex-grow">
                <FormControl><Input placeholder={`Ідентифікатор #${index + 1}`} {...innerField} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button 
            type="button" 
            variant="ghost" 
            size="icon"
            className="h-9 w-9 text-destructive hover:bg-destructive/10"
            onClick={() => targetIdentifierFields.length > 1 ? removeTargetIdentifier(index) : alert("Має бути принаймні один цільовий ідентифікатор.")}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button 
        type="button" 
        variant="outline" 
        size="sm" 
        onClick={() => appendTargetIdentifier({ id: Date.now().toString(), value: ''})}
        className="mt-1"
      >
        <PlusCircle className="mr-2 h-4 w-4" /> Додати ідентифікатор
      </Button>
      <div className="pt-2"></div>


      <FormField
        control={form.control}
        name="targetProfileDetails.implementationLevel"
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
      <div>
        <FormLabel>Активи, до яких застосовується:</FormLabel>
        <div className="space-y-2 mt-2">
          <FormField
            control={form.control}
            name="targetProfileDetails.appliesToSoftware"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                <FormLabel className="font-normal">Програмне забезпечення</FormLabel>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="targetProfileDetails.appliesToHardware"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                <FormLabel className="font-normal">Апаратне забезпечення</FormLabel>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="targetProfileDetails.appliesToInformationResource"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                <FormLabel className="font-normal">Інформаційний ресурс</FormLabel>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="targetProfileDetails.appliesToIcsTool"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                <FormLabel className="font-normal">Засіб ІКЗ</FormLabel>
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-headline">Панель звітів</h1>
        <FileText className="h-8 w-8 text-primary" />
      </div>
      <CardDescription>
        Створіть звіт, що порівнює поточний та цільовий профілі безпеки, та отримайте рекомендації від ШІ.
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
                <div>
                  <h3 className="text-lg font-medium text-primary mb-2">Поточний профіль безпеки</h3>
                  {currentThreatFields.map((field, index) => (
                    <div key={field.id}>
                      {renderCurrentProfileThreatFields(index)}
                    </div>
                  ))}
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => appendCurrentThreat({...defaultThreatValues, id: Date.now().toString()})}
                    className="mt-2"
                  >
                    <PlusCircle className="mr-2 h-4 w-4" /> Додати загрозу до поточного профілю
                  </Button>
                </div>
                {renderTargetProfileFields()}
              </CardContent>
              <CardFooter className="flex-col sm:flex-row items-start sm:items-center gap-2">
                <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Генерація звіту...
                    </>
                  ) : (
                    <>
                    <Sparkles className="mr-2 h-4 w-4" /> Створити звіт з аналізом ШІ
                    </>
                  )}
                </Button>
                 <p className="text-xs text-muted-foreground mt-2 sm:mt-0">
                  Примітка: Для отримання PDF, після генерації звіту натисніть "Роздрукувати" та оберіть "Зберегти як PDF".
                </p>
              </CardFooter>
            </form>
          </Form>
        </Card>
      ) : null}

      {error && !isLoading && ( // Show error only if not loading and error exists
        <Card className="border-destructive bg-destructive/10">
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <AlertTriangle className="mr-2 h-5 w-5" />
              Помилка генерації звіту ШІ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive">{error}</p>
            <p className="text-sm text-muted-foreground mt-2">Звіт без аналізу ШІ доступний нижче.</p>
          </CardContent>
        </Card>
      )}

      {reportGenerated && (
        <>
        <div className="flex justify-end gap-2 mb-4 print:hidden">
            <Button variant="outline" onClick={() => { setReportGenerated(false); setError(null); setAiAnalysisResult(null); }}>
                Створити новий звіт
            </Button>
            <Button onClick={handlePrint} disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Printer className="mr-2 h-4 w-4" /> Роздрукувати/Зберегти PDF
            </Button>
        </div>
        {/* Hidden component for printing */}
        <div style={{ display: "none" }}>
          <PrintableReport 
            ref={reportPrintRef} 
            currentProfileSummary={displayedCurrentProfile}
            targetProfileSummary={displayedTargetProfile}
            aiAnalysis={aiAnalysisResult}
          />
        </div>

        {/* Displayed report on page */}
        <Card className="p-6 print:shadow-none print:border-none" id="report-content-display">
          <CardHeader className="text-center print:pb-2">
            <h2 className="text-2xl font-headline text-primary">Звіт про безпеку "КіберСтраж AI"</h2>
            <CardDescription>Згенеровано: {new Date().toLocaleDateString('uk-UA')} {new Date().toLocaleTimeString('uk-UA')}</CardDescription>
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
            
            {isLoading && !aiAnalysisResult && (
                <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="mt-2 text-muted-foreground">Генерація аналізу ШІ...</p>
                </div>
            )}

            {aiAnalysisResult && (
              <>
                <section>
                  <h3 className="text-xl font-headline mb-2 border-b pb-1 flex items-center">
                    <Sparkles className="mr-2 h-5 w-5 text-yellow-500" />
                    Аналіз розривів (AI)
                  </h3>
                  <div className="text-sm p-3 rounded-md border bg-muted/20">
                     <p className="whitespace-pre-wrap">{aiAnalysisResult.gapAnalysis}</p>
                  </div>
                </section>

                <Separator className="my-6" />

                <section>
                  <h3 className="text-xl font-headline mb-2 border-b pb-1 flex items-center">
                    <Sparkles className="mr-2 h-5 w-5 text-yellow-500" />
                    Рекомендації (AI)
                  </h3>
                  {aiAnalysisResult.recommendations.length > 0 ? (
                     <Accordion type="single" collapsible className="w-full" defaultValue={`recommendation-0`}>
                        {aiAnalysisResult.recommendations.map((rec, index) => (
                          <AccordionItem value={`recommendation-${index}`} key={index} className="mb-2 border dark:border-border rounded-md overflow-hidden">
                            <AccordionTrigger className="p-4 text-left hover:no-underline bg-muted/30 dark:bg-card/70 hover:bg-muted/50 dark:hover:bg-secondary/50 transition-colors">
                              <div className="flex justify-between items-center w-full">
                                <span className="font-medium text-base">{index + 1}. {rec.title}</span>
                                <RecommendationPriorityBadge priority={rec.priority} />
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="p-4 border-t dark:border-border bg-background">
                              <p className="whitespace-pre-wrap text-sm">{rec.description}</p>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                  ) : (
                    <p className="text-sm text-muted-foreground p-3 rounded-md border bg-muted/20">Рекомендації не згенеровано.</p>
                  )}
                </section>
              </>
            )}
            
          </CardContent>
          <CardFooter className="print:hidden">
            <p className="text-xs text-muted-foreground text-center w-full">
              Це системно згенерований звіт. Для отримання PDF використовуйте кнопку "Роздрукувати/Зберегти PDF" вище.
            </p>
          </CardFooter>
        </Card>
        </>
      )}
    </div>
  );
}

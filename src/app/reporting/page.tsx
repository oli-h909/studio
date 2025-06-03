
"use client";

import * as React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { analyzeSecurityGaps, type GapAnalysisInput, type GapAnalysisOutput } from '@/ai/flows/gap-analyzer-flow';
import type { Asset } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
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
import { Loader2, FileText, Printer, AlertTriangle, PlusCircle, Trash2, Sparkles } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useReactToPrint } from 'react-to-print';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";


const implementationStatusOptions = ["Реалізовано", "Не реалізовано", "Частково реалізовано", "Не застосовується"] as const;
const implementationLevelOptions = ["1", "2", "3", "4"] as const;

type AssetCategoryKey = 'software' | 'hardware' | 'informationResource' | 'icsTool';

const threatDetailsMap: Record<string, {
  identifier: string;
  vulnerability: string;
  ttpDescription: string;
  threatDescription: string;
  affectedAssetTypes: AssetCategoryKey[];
}> = {
  "Атака через шкідливі вкладення": {
    identifier: 'ID.AM-2', // or ID.AM-5 if related to user behavior
    vulnerability: "Атака через шкідливі вкладення",
    ttpDescription: "Відкриття вкладення, інфікування систем шкідливим ПЗ",
    threatDescription: "Інфікування робочих станцій або серверів, втрата контролю над системою",
    affectedAssetTypes: ['software', 'hardware']
  },
  "Використання уразливого компонента CMS": {
    identifier: 'ID.AM-2',
    vulnerability: "Використання уразливого компонента CMS",
    ttpDescription: "Експлуатація вразливості, запуск шкідливого коду",
    threatDescription: "Несанкціоноване виконання коду, крадіжка даних, порушення роботи сайту",
    affectedAssetTypes: ['software']
  },
  "Витік даних": {
    identifier: 'ID.AM-3',
    vulnerability: "Витік даних",
    ttpDescription: "Несанкціонований доступ, копіювання, передача інформації",
    threatDescription: "Втрата конфіденційної інформації, репутаційні й фінансові збитки",
    affectedAssetTypes: ['informationResource']
  },
  "Збереження паролів у відкритому вигляді": {
    identifier: 'ID.AM-3', // As it's about data
    vulnerability: "Збереження паролів у відкритому вигляді",
    ttpDescription: "Викрадення або витік паролів",
    threatDescription: "Несанкціонований доступ до систем і сервісів",
    affectedAssetTypes: ['informationResource', 'software'] // Config files, or app logic
  },
  "Недостатній контроль доступу": {
    identifier: 'ID.AM-3', // Access to information
    vulnerability: "Недостатній контроль доступу",
    ttpDescription: "Несанкціонований вхід, підміна прав користувачів",
    threatDescription: "Порушення цілісності, витік даних, саботаж систем",
    affectedAssetTypes: ['informationResource', 'software', 'hardware']
  },
  "Незахищене ліцензування CRM": {
    identifier: 'ID.AM-2',
    vulnerability: "Незахищене ліцензування CRM",
    ttpDescription: "Викрадення ліцензійних ключів, використання піратських копій",
    threatDescription: "Юридичні проблеми, втрата контролю над системою",
    affectedAssetTypes: ['software']
  },
  "Несанкціонований доступ до бази користувачів": {
    identifier: 'ID.AM-3',
    vulnerability: "Несанкціонований доступ до бази користувачів",
    ttpDescription: "Викрадення або модифікація даних користувачів",
    threatDescription: "Викрадення персональних даних, порушення аутентифікації",
    affectedAssetTypes: ['informationResource']
  },
  "Обхід автентифікації": {
    identifier: 'ID.AM-2', // System/software vulnerability
    vulnerability: "Обхід автентифікації",
    ttpDescription: "Використання вразливостей для обходу перевірки ідентичності",
    threatDescription: "Несанкціонований доступ, компрометація систем",
    affectedAssetTypes: ['software']
  },
  "Порушення політики безпеки": {
    identifier: 'ID.AM-5', // Personnel/Process related
    vulnerability: "Порушення політики безпеки",
    ttpDescription: "Несанкціоновані зміни, ігнорування правил",
    threatDescription: "Підвищений ризик інцидентів, внутрішні загрози",
    affectedAssetTypes: ['software', 'hardware', 'informationResource'] // Can impact any
  },
  "Соціальна інженерія": {
    identifier: 'ID.AM-5',
    vulnerability: "Соціальна інженерія",
    ttpDescription: "Обман співробітників для отримання доступу",
    threatDescription: "Витік інформації, компрометація облікових даних",
    affectedAssetTypes: ['informationResource'] // Primarily targets info like credentials
  },
  "Фішинг": {
    identifier: 'ID.AM-5',
    vulnerability: "Фішинг",
    ttpDescription: "Розсилання підробних листів для отримання даних",
    threatDescription: "Крадіжка облікових даних, несанкціонований доступ",
    affectedAssetTypes: ['informationResource'] // Primarily targets info like credentials
  },
  "Фішинг-посилання у CRM": {
    identifier: 'ID.AM-2',
    vulnerability: "Фішинг-посилання у CRM",
    ttpDescription: "Впровадження шкідливих посилань в CRM",
    threatDescription: "Компрометація користувацьких акаунтів, втручання у роботу CRM",
    affectedAssetTypes: ['software']
  },
  "Шкідливе програмне забезпечення": {
    identifier: 'ID.AM-2',
    vulnerability: "Шкідливе програмне забезпечення",
    ttpDescription: "Інсталяція, поширення шкідливих модулів",
    threatDescription: "Пошкодження систем, крадіжка даних, відмова у обслуговуванні",
    affectedAssetTypes: ['software', 'hardware']
  },
  "DoS-атака на портал": {
    identifier: 'ID.AM-2', // Affects system availability
    vulnerability: "DoS-атака на портал",
    ttpDescription: "Перевантаження сервера запитами",
    threatDescription: "Недоступність сервісу для користувачів",
    affectedAssetTypes: ['software', 'hardware']
  },
  "SQL Injection на сервері бази даних": {
    identifier: 'ID.AM-2', // Technical vulnerability in software
    vulnerability: "SQL Injection на сервері бази даних",
    ttpDescription: "Вставка шкідливого SQL-коду",
    threatDescription: "Викрадення, модифікація або видалення даних у базі",
    affectedAssetTypes: ['software', 'informationResource']
  },
  "XSS у WordPress": {
    identifier: 'ID.AM-2',
    vulnerability: "XSS у WordPress",
    ttpDescription: "Впровадження шкідливого JavaScript-коду",
    threatDescription: "Викрадення сесій, перенаправлення користувачів, викрадення даних",
    affectedAssetTypes: ['software']
  },
  "Інше": {
    identifier: 'N/A',
    vulnerability: "Інше",
    ttpDescription: "Опишіть можливі дії зловмисника...",
    threatDescription: "Опишіть конкретний ризик...",
    affectedAssetTypes: [] // No automatic filtering for "Інше"
  }
};

const relatedThreatOptions = Object.keys(threatDetailsMap).sort((a, b) => a === "Інше" ? 1 : b === "Інше" ? -1 : a.localeCompare(b)) as [string, ...string[]];

const baseAssetOptions = ["-", "Інше"] as const;

const singleCurrentProfileThreatSchema = z.object({
  id: z.string(),
  identifier: z.string().optional(),
  implementationStatus: z.string().optional(),
  implementationLevel: z.string().optional(),
  relatedThreat: z.string().optional(), // This will store the "Вразливість"
  threatDescription: z.string().optional(), // "Загроза (конкретний ризик)"
  ttpDescription: z.string().optional(), // "Можливі дії зловмисника"
  software: z.string().optional(),
  hardware: z.string().optional(),
  informationResource: z.string().optional(),
  icsTool: z.string().optional(),
  comment: z.string().optional(),
});
type SingleCurrentProfileThreatValues = z.infer<typeof singleCurrentProfileThreatSchema>;

const targetProfileIdentifierSchema = z.object({
  id: z.string(),
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

const defaultSelectedThreatKey = relatedThreatOptions.find(opt => opt !== "Інше") || relatedThreatOptions[0];
const defaultThreatDetails = threatDetailsMap[defaultSelectedThreatKey] || threatDetailsMap["Інше"];

const defaultThreatValues: SingleCurrentProfileThreatValues = {
  id: Date.now().toString(),
  relatedThreat: defaultSelectedThreatKey,
  identifier: defaultThreatDetails.identifier,
  implementationStatus: 'Реалізовано',
  implementationLevel: '3',
  software: '-',
  hardware: '-',
  informationResource: '-',
  icsTool: '-',
  threatDescription: defaultThreatDetails.threatDescription,
  ttpDescription: defaultThreatDetails.ttpDescription,
  comment: 'Загальні заходи захисту на рівні мережі та кінцевих точок впроваджені.',
};

const defaultTargetIdentifierValue = { id: Date.now().toString(), value: 'ID.AM-3 Target' };


const formatCurrentProfileDataToString = (data: SingleCurrentProfileThreatValues[]): string => {
  if (!data || data.length === 0) return "Поточний профіль безпеки: Інформація не надана\n";

  let summary = "Поточний профіль безпеки (виявлені загрози та їх деталі):\n\n";
  data.forEach((threat, index) => {
    summary += `Загроза ${index + 1} (на основі вразливості: ${threat.relatedThreat || 'Не вказано'}):\n`;
    if (threat.identifier) summary += `  - Ідентифікатор: ${threat.identifier}\n`;
    if (threat.threatDescription) summary += `  - Опис загрози (ризик): ${threat.threatDescription}\n`;
    if (threat.ttpDescription) summary += `  - Можливі дії зловмисника (TTP): ${threat.ttpDescription}\n`;
    if (threat.implementationStatus) summary += `  - Статус реалізації контрзаходів: ${threat.implementationStatus}\n`;
    if (threat.implementationLevel) summary += `  - Рівень впровадження контрзаходів: ${threat.implementationLevel}\n`;
    if (threat.software && threat.software !== '-') summary += `  - Пов'язане програмне забезпечення (Актив): ${threat.software}\n`;
    if (threat.hardware && threat.hardware !== '-') summary += `  - Пов'язане апаратне забезпечення (Актив): ${threat.hardware}\n`;
    if (threat.informationResource && threat.informationResource !== '-') summary += `  - Пов'язаний інформаційний ресурс (Актив): ${threat.informationResource}\n`;
    if (threat.icsTool && threat.icsTool !== '-') summary += `  - Пов'язаний засіб ІКЗ (Актив): ${threat.icsTool}\n`;
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
  if (data.implementationLevel) summary += `- Бажаний рівень впровадження контрзаходів: ${data.implementationLevel}\n`;

  const selectedAssets: string[] = [];
  if (data.appliesToSoftware) selectedAssets.push("Програмне забезпечення");
  if (data.appliesToHardware) selectedAssets.push("Апаратне забезпечення");
  if (data.appliesToInformationResource) selectedAssets.push("Інформаційний ресурс");
  if (data.appliesToIcsTool) selectedAssets.push("Засіб ІКЗ");

  if (selectedAssets.length > 0) {
    summary += `- Застосовується до типів активів: ${selectedAssets.join(', ')}\n`;
  } else {
    summary += `- Типи активів не обрані\n`;
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

const PrintableReport = React.forwardRef<HTMLDivElement, {
  currentProfileSummary: string;
  targetProfileSummary: string;
  aiAnalysis: GapAnalysisOutput | null;
}>(({ currentProfileSummary, targetProfileSummary, aiAnalysis }, ref) => {
  return (
    <div ref={ref} className="p-8 print:p-4 font-sans">
      <header className="text-center mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">Звіт про безпеку "КіберСтраж"</h1>
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
        КіберСтраж - Захист вашої інфраструктури
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

  const [softwareOptions, setSoftwareOptions] = useState<string[]>([...baseAssetOptions]);
  const [hardwareOptions, setHardwareOptions] = useState<string[]>([...baseAssetOptions]);
  const [informationResourceOptions, setInformationResourceOptions] = useState<string[]>([...baseAssetOptions]);
  const [icsToolOptions, setIcsToolOptions] = useState<string[]>([...baseAssetOptions]);

  const { toast } = useToast();

  const reportPrintRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    content: () => reportPrintRef.current,
    documentTitle: `Звіт_КіберСтраж_${new Date().toISOString().split('T')[0]}`,
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

  const fetchAssets = useCallback(async () => {
    try {
      const assetsCollectionRef = collection(db, 'assets');
      const assetSnapshot = await getDocs(assetsCollectionRef);
      const assetsList = assetSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset));
      
      const sw = assetsList.filter(a => a.type === 'Програмне забезпечення').map(a => a.name);
      setSoftwareOptions(prev => [...new Set([...baseAssetOptions, ...sw])].sort((a, b) => (baseAssetOptions.includes(a as typeof baseAssetOptions[number])) ? (baseAssetOptions.includes(b as typeof baseAssetOptions[number]) ? a.localeCompare(b) : 1) : (baseAssetOptions.includes(b as typeof baseAssetOptions[number])) ? -1 : a.localeCompare(b)));

      const hw = assetsList.filter(a => a.type === 'Обладнання').map(a => a.name);
      setHardwareOptions(prev => [...new Set([...baseAssetOptions, ...hw])].sort((a, b) => (baseAssetOptions.includes(a as typeof baseAssetOptions[number])) ? (baseAssetOptions.includes(b as typeof baseAssetOptions[number]) ? a.localeCompare(b) : 1) : (baseAssetOptions.includes(b as typeof baseAssetOptions[number])) ? -1 : a.localeCompare(b)));

      const ir = assetsList.filter(a => a.type === 'Інформація').map(a => a.name);
      setInformationResourceOptions(prev => [...new Set([...baseAssetOptions, ...ir])].sort((a, b) => (baseAssetOptions.includes(a as typeof baseAssetOptions[number])) ? (baseAssetOptions.includes(b as typeof baseAssetOptions[number]) ? a.localeCompare(b) : 1) : (baseAssetOptions.includes(b as typeof baseAssetOptions[number])) ? -1 : a.localeCompare(b)));

      const ics = assetsList.filter(a => a.type === 'Обладнання' || a.type === 'Програмне забезпечення').map(a => a.name); 
      setIcsToolOptions(prev => [...new Set([...baseAssetOptions, ...ics])].sort((a, b) => (baseAssetOptions.includes(a as typeof baseAssetOptions[number])) ? (baseAssetOptions.includes(b as typeof baseAssetOptions[number]) ? a.localeCompare(b) : 1) : (baseAssetOptions.includes(b as typeof baseAssetOptions[number])) ? -1 : a.localeCompare(b)));

    } catch (error) {
      console.error("Error fetching assets for report: ", error);
      toast({ title: "Помилка", description: "Не вдалося завантажити активи для звітів.", variant: "destructive" });
    }
  }, [toast]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const currentProfileDetailsWatch = useWatch({ control: form.control, name: 'currentProfileDetails' });
  useEffect(() => {
    currentProfileDetailsWatch.forEach((threat, index) => {
      if (form.getValues(`currentProfileDetails.${index}.software`) === undefined) form.setValue(`currentProfileDetails.${index}.software`, '-', { shouldValidate: false });
      if (form.getValues(`currentProfileDetails.${index}.hardware`) === undefined) form.setValue(`currentProfileDetails.${index}.hardware`, '-', { shouldValidate: false });
      if (form.getValues(`currentProfileDetails.${index}.informationResource`) === undefined) form.setValue(`currentProfileDetails.${index}.informationResource`, '-', { shouldValidate: false });
      if (form.getValues(`currentProfileDetails.${index}.icsTool`) === undefined) form.setValue(`currentProfileDetails.${index}.icsTool`, '-', { shouldValidate: false });

      // Apply asset filtering if relatedThreat is already set (e.g. on initial load with defaults)
      const relatedThreatValue = form.getValues(`currentProfileDetails.${index}.relatedThreat`);
      if (relatedThreatValue) {
        const details = threatDetailsMap[relatedThreatValue];
        if (details?.affectedAssetTypes && details.affectedAssetTypes.length > 0) {
            const affected = details.affectedAssetTypes;
            if (!affected.includes('software') && form.getValues(`currentProfileDetails.${index}.software`) !== '-') form.setValue(`currentProfileDetails.${index}.software`, '-', { shouldDirty: true, shouldValidate: true });
            if (!affected.includes('hardware') && form.getValues(`currentProfileDetails.${index}.hardware`) !== '-') form.setValue(`currentProfileDetails.${index}.hardware`, '-', { shouldDirty: true, shouldValidate: true });
            if (!affected.includes('informationResource') && form.getValues(`currentProfileDetails.${index}.informationResource`) !== '-') form.setValue(`currentProfileDetails.${index}.informationResource`, '-', { shouldDirty: true, shouldValidate: true });
            if (!affected.includes('icsTool') && form.getValues(`currentProfileDetails.${index}.icsTool`) !== '-') form.setValue(`currentProfileDetails.${index}.icsTool`, '-', { shouldDirty: true, shouldValidate: true });
        }
      }
    });
  }, [currentProfileDetailsWatch, form]);


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
      toast({ title: "Успіх", description: "Звіт та аналіз ШІ успішно згенеровано." });
    } catch (err) {
      console.error("Report Generation Error:", err);
      const errorMessage = err instanceof Error ? err.message : 'Сталася невідома помилка під час генерації звіту.';
      setError(errorMessage);
      toast({ title: "Помилка ШІ", description: errorMessage, variant: "destructive" });
      setReportGenerated(true); 
    } finally {
      setIsLoading(false);
    }
  };

  const handleRelatedThreatChange = (value: string, threatIndex: number) => {
    const details = threatDetailsMap[value];
    if (details) {
      form.setValue(`currentProfileDetails.${threatIndex}.identifier`, details.identifier, { shouldDirty: true });
      form.setValue(`currentProfileDetails.${threatIndex}.threatDescription`, details.threatDescription, { shouldDirty: true });
      form.setValue(`currentProfileDetails.${threatIndex}.ttpDescription`, details.ttpDescription, { shouldDirty: true });

      if (details.affectedAssetTypes && details.affectedAssetTypes.length > 0) {
        const affected = details.affectedAssetTypes;
        if (!affected.includes('software')) form.setValue(`currentProfileDetails.${threatIndex}.software`, '-', { shouldDirty: true });
        if (!affected.includes('hardware')) form.setValue(`currentProfileDetails.${threatIndex}.hardware`, '-', { shouldDirty: true });
        if (!affected.includes('informationResource')) form.setValue(`currentProfileDetails.${threatIndex}.informationResource`, '-', { shouldDirty: true });
        if (!affected.includes('icsTool')) form.setValue(`currentProfileDetails.${threatIndex}.icsTool`, '-', { shouldDirty: true });
      }
      // If affectedAssetTypes is empty or not defined (e.g., for "Інше"), existing asset selections are preserved.
    }
  };

  const renderCurrentProfileThreatFields = (threatIndex: number) => {
    return (
    <CardContent className="space-y-4 p-4 border rounded-md bg-card/80 shadow-sm mb-4 relative">
       <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-7 w-7 text-destructive hover:bg-destructive/10"
          onClick={() => currentThreatFields.length > 1 ? removeCurrentThreat(threatIndex) : toast({title: "Помилка", description:"Має бути принаймні одна загроза.", variant: "destructive"})}
          aria-label={`Видалити загрозу #${threatIndex + 1}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      <h4 className="text-md font-semibold text-primary/90">Загроза #{threatIndex + 1}</h4>
      <FormField
        control={form.control}
        name={`currentProfileDetails.${threatIndex}.relatedThreat`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Пов'язана вразливість</FormLabel>
            <Select
              onValueChange={(value) => {
                field.onChange(value);
                handleRelatedThreatChange(value, threatIndex);
              }}
              defaultValue={field.value}
            >
              <FormControl><SelectTrigger><SelectValue placeholder="Оберіть вразливість" /></SelectTrigger></FormControl>
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
            <FormLabel>Ідентифікатор (ID.AM-X)</FormLabel>
            <FormControl><Input placeholder="Автоматично" {...field} disabled /></FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
       <FormField
        control={form.control}
        name={`currentProfileDetails.${threatIndex}.threatDescription`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Опис загрози (конкретний ризик)</FormLabel>
            <FormControl><Textarea placeholder="Опис конкретного ризику, що виникає з вразливості..." {...field} className="min-h-[100px] font-code text-sm" /></FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name={`currentProfileDetails.${threatIndex}.ttpDescription`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Можливі дії зловмисника (TTP)</FormLabel>
            <FormControl><Textarea placeholder="Опис тактик, технік та процедур зловмисника..." {...field} className="min-h-[100px] font-code text-sm" /></FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
       <FormField
        control={form.control}
        name={`currentProfileDetails.${threatIndex}.software`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Програмне забезпечення (Актив)</FormLabel>
            <Select onValueChange={field.onChange} value={field.value || '-'}>
              <FormControl><SelectTrigger><SelectValue placeholder="Оберіть ПЗ з реєстру" /></SelectTrigger></FormControl>
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
            <FormLabel>Апаратне забезпечення (Актив)</FormLabel>
            <Select onValueChange={field.onChange} value={field.value || '-'}>
              <FormControl><SelectTrigger><SelectValue placeholder="Оберіть апаратне забезпечення з реєстру" /></SelectTrigger></FormControl>
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
            <FormLabel>Інформаційний ресурс (Актив)</FormLabel>
            <Select onValueChange={field.onChange} value={field.value || '-'}>
              <FormControl><SelectTrigger><SelectValue placeholder="Оберіть інформаційний ресурс з реєстру" /></SelectTrigger></FormControl>
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
            <FormLabel>Засіб ІКЗ (Актив)</FormLabel>
            <Select onValueChange={field.onChange} value={field.value || '-'}>
              <FormControl><SelectTrigger><SelectValue placeholder="Оберіть засіб ІКЗ з реєстру" /></SelectTrigger></FormControl>
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
            <FormLabel>Статус реалізації контрзаходів</FormLabel>
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
            <FormLabel>Рівень впровадження контрзаходів (1-4)</FormLabel>
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
        name={`currentProfileDetails.${threatIndex}.comment`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Коментар (вручну)</FormLabel>
            <FormControl><Textarea placeholder="Додаткова інформація, специфічні деталі реалізації контрзаходів..." {...field} className="min-h-[100px] font-code text-sm" /></FormControl>
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

      <FormLabel>Цільові ідентифікатори безпеки</FormLabel>
      {targetIdentifierFields.map((field, index) => (
        <div key={field.id} className="flex items-center gap-2">
          <FormField
            control={form.control}
            name={`targetProfileDetails.identifiers.${index}.value`}
            render={({ field: innerField }) => (
              <FormItem className="flex-grow">
                <FormControl><Input placeholder={`Ідентифікатор #${index + 1} (напр. ID.AM-3.Target)`} {...innerField} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-destructive hover:bg-destructive/10"
            onClick={() => targetIdentifierFields.length > 1 ? removeTargetIdentifier(index) : toast({title: "Помилка", description: "Має бути принаймні один цільовий ідентифікатор.", variant: "destructive"})}
            aria-label={`Видалити цільовий ідентифікатор #${index + 1}`}
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
        <PlusCircle className="mr-2 h-4 w-4" /> Додати цільовий ідентифікатор
      </Button>
      <div className="pt-2"></div>


      <FormField
        control={form.control}
        name="targetProfileDetails.implementationLevel"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Бажаний рівень впровадження контрзаходів (1-4)</FormLabel>
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
        <FormLabel>Типи активів, до яких застосовується цільовий профіль:</FormLabel>
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
        Актуальні активи підтягуються з Реєстру активів. Вразливості та відповідні поля заповнюються автоматично.
        При виборі вразливості, нерелевантні типи активів будуть автоматично очищені (встановлені в "-").
      </CardDescription>

      {!reportGenerated ? (
        <Card>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleGenerateReport)}>
              <CardHeader>
                <CardTitle>Створити звіт про безпеку</CardTitle>
                <CardDescription>Заповніть деталі для поточного та цільового профілів. Поля "Ідентифікатор", "Опис загрози" та "Опис ТТР" заповняться автоматично при виборі "Пов'язаної вразливості".</CardDescription>
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
                    onClick={() => {
                        const newThreatKey = relatedThreatOptions.find(opt => opt !== "Інше") || relatedThreatOptions[0];
                        const newThreatDetails = threatDetailsMap[newThreatKey] || threatDetailsMap["Інше"];
                        const newThreatToAdd: SingleCurrentProfileThreatValues = {
                            ...defaultThreatValues, 
                            id: Date.now().toString(),
                            relatedThreat: newThreatKey,
                            identifier: newThreatDetails.identifier,
                            threatDescription: newThreatDetails.threatDescription,
                            ttpDescription: newThreatDetails.ttpDescription,
                            comment: '', 
                        };
                        // Manually apply asset filtering for the new threat based on its default vulnerability
                        if (newThreatDetails.affectedAssetTypes && newThreatDetails.affectedAssetTypes.length > 0) {
                            const affected = newThreatDetails.affectedAssetTypes;
                            if (!affected.includes('software')) newThreatToAdd.software = '-';
                            if (!affected.includes('hardware')) newThreatToAdd.hardware = '-';
                            if (!affected.includes('informationResource')) newThreatToAdd.informationResource = '-';
                            if (!affected.includes('icsTool')) newThreatToAdd.icsTool = '-';
                        }
                        appendCurrentThreat(newThreatToAdd);
                    }}
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

      {error && !isLoading && ( 
        <Card className="border-destructive bg-destructive/10">
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <AlertTriangle className="mr-2 h-5 w-5" />
              Помилка генерації аналізу ШІ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive">{error}</p>
            <p className="text-sm text-muted-foreground mt-2">Звіт без аналізу ШІ доступний нижче. Ви можете спробувати згенерувати аналіз ШІ ще раз, відредагувавши дані та натиснувши "Створити новий звіт".</p>
          </CardContent>
        </Card>
      )}

      {reportGenerated && (
        <>
        <div className="flex justify-end gap-2 mb-4 print:hidden">
            <Button variant="outline" onClick={() => { setReportGenerated(false); setError(null); setAiAnalysisResult(null); setIsLoading(false); }}>
                Створити новий звіт / Редагувати
            </Button>
            <Button onClick={handlePrint} disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Printer className="mr-2 h-4 w-4" /> Роздрукувати/Зберегти PDF
            </Button>
        </div>

        <div style={{ display: "none" }}>
          <PrintableReport
            ref={reportPrintRef}
            currentProfileSummary={displayedCurrentProfile}
            targetProfileSummary={displayedTargetProfile}
            aiAnalysis={aiAnalysisResult}
          />
        </div>

        <Card className="p-6 print:shadow-none print:border-none" id="report-content-display">
          <CardHeader className="text-center print:pb-2">
            <h2 className="text-2xl font-headline text-primary">Звіт про безпеку "КіберСтраж"</h2>
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
            
            {(!isLoading && aiAnalysisResult) || (!isLoading && error && reportGenerated) ? (
              <>
                <section>
                  <h3 className="text-xl font-headline mb-2 border-b pb-1 flex items-center">
                    <Sparkles className="mr-2 h-5 w-5 text-yellow-500" />
                    Аналіз розривів (AI)
                  </h3>
                  {aiAnalysisResult?.gapAnalysis ? (
                    <div className="text-sm p-3 rounded-md border bg-muted/20">
                       <p className="whitespace-pre-wrap">{aiAnalysisResult.gapAnalysis}</p>
                    </div>
                  ) : (
                     <p className="text-sm text-muted-foreground p-3 rounded-md border bg-muted/20">Аналіз розривів не згенеровано через помилку або відсутність даних від ШІ.</p>
                  )}
                </section>

                <Separator className="my-6" />

                <section>
                  <h3 className="text-xl font-headline mb-2 border-b pb-1 flex items-center">
                    <Sparkles className="mr-2 h-5 w-5 text-yellow-500" />
                    Рекомендації (AI)
                  </h3>
                  {aiAnalysisResult?.recommendations && aiAnalysisResult.recommendations.length > 0 ? (
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
                    <p className="text-sm text-muted-foreground p-3 rounded-md border bg-muted/20">Рекомендації не згенеровано через помилку або відсутність даних від ШІ.</p>
                  )}
                </section>
              </>
            ) : null }


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
    

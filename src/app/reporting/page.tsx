
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

interface ThreatDetailValue {
  identifier: string;
  vulnerability: string;
  ttp: string;
  affectedAssetTypes: AssetCategoryKey[];
}

const threatDetailsMap: Record<string, ThreatDetailValue> = {
  // Ключ = "Загроза (конкретний ризик)"
  "Інфікування робочих станцій або серверів, втрата контролю над системою": {
    identifier: 'ID.AM-2',
    vulnerability: "Атака через шкідливі вкладення",
    ttp: "Відкриття вкладення, інфікування систем шкідливим ПЗ",
    affectedAssetTypes: ['software', 'hardware']
  },
  "Несанкціоноване виконання коду, крадіжка даних, порушення роботи сайту": {
    identifier: 'ID.AM-2',
    vulnerability: "Використання уразливого компонента CMS",
    ttp: "Експлуатація вразливості, запуск шкідливого коду",
    affectedAssetTypes: ['software']
  },
  "Втрата конфіденційної інформації, репутаційні й фінансові збитки": {
    identifier: 'ID.AM-3',
    vulnerability: "Витік даних",
    ttp: "Несанкціонований доступ, копіювання, передача інформації",
    affectedAssetTypes: ['informationResource']
  },
  "Несанкціонований доступ до систем і сервісів через викрадені паролі": { // Уточнено ключ для унікальності
    identifier: 'ID.AM-3',
    vulnerability: "Збереження паролів у відкритому вигляді",
    ttp: "Викрадення або витік паролів",
    affectedAssetTypes: ['informationResource', 'software']
  },
  "Порушення цілісності, витік даних, саботаж систем через недостатній контроль доступу": { // Уточнено
    identifier: 'ID.AM-3',
    vulnerability: "Недостатній контроль доступу",
    ttp: "Несанкціонований вхід, підміна прав користувачів",
    affectedAssetTypes: ['informationResource', 'software', 'hardware']
  },
  "Юридичні проблеми, втрата контролю над CRM через ліцензування": { // Уточнено
    identifier: 'ID.AM-2',
    vulnerability: "Незахищене ліцензування CRM",
    ttp: "Викрадення ліцензійних ключів, використання піратських копій",
    affectedAssetTypes: ['software']
  },
  "Викрадення персональних даних, порушення аутентифікації через доступ до бази користувачів": { // Уточнено
    identifier: 'ID.AM-3',
    vulnerability: "Несанкціонований доступ до бази користувачів",
    ttp: "Викрадення або модифікація даних користувачів",
    affectedAssetTypes: ['informationResource']
  },
  "Несанкціонований доступ, компрометація систем через обхід автентифікації": { // Уточнено
    identifier: 'ID.AM-2',
    vulnerability: "Обхід автентифікації",
    ttp: "Використання вразливостей для обходу перевірки ідентичності",
    affectedAssetTypes: ['software']
  },
  "Підвищений ризик інцидентів, внутрішні загрози через порушення політики": { // Уточнено
    identifier: 'ID.AM-5',
    vulnerability: "Порушення політики безпеки",
    ttp: "Несанкціоновані зміни, ігнорування правил",
    affectedAssetTypes: ['software', 'hardware', 'informationResource']
  },
  "Витік інформації, компрометація облікових даних через соціальну інженерію": { // Уточнено
    identifier: 'ID.AM-5',
    vulnerability: "Соціальна інженерія",
    ttp: "Обман співробітників для отримання доступу",
    affectedAssetTypes: ['informationResource']
  },
  "Крадіжка облікових даних, несанкціонований доступ через фішинг": { // Уточнено
    identifier: 'ID.AM-5',
    vulnerability: "Фішинг",
    ttp: "Розсилання підробних листів для отримання даних",
    affectedAssetTypes: ['informationResource']
  },
  "Компрометація користувацьких акаунтів, втручання у роботу CRM через фішинг-посилання": { // Уточнено
    identifier: 'ID.AM-2',
    vulnerability: "Фішинг-посилання у CRM",
    ttp: "Впровадження шкідливих посилань в CRM",
    affectedAssetTypes: ['software']
  },
  "Пошкодження систем, крадіжка даних, відмова у обслуговуванні через шкідливе ПЗ": { // Уточнено
    identifier: 'ID.AM-2',
    vulnerability: "Шкідливе програмне забезпечення",
    ttp: "Інсталяція, поширення шкідливих модулів",
    affectedAssetTypes: ['software', 'hardware']
  },
  "Недоступність сервісу для користувачів через DoS-атаку": { // Уточнено
    identifier: 'ID.AM-2',
    vulnerability: "DoS-атака на портал",
    ttp: "Перевантаження сервера запитами",
    affectedAssetTypes: ['software', 'hardware']
  },
  "Викрадення, модифікація або видалення даних у базі через SQL Injection": { // Уточнено
    identifier: 'ID.AM-2',
    vulnerability: "SQL Injection на сервері бази даних",
    ttp: "Вставка шкідливого SQL-коду",
    affectedAssetTypes: ['software', 'informationResource']
  },
  "Викрадення сесій, перенаправлення користувачів, викрадення даних через XSS": { // Уточнено
    identifier: 'ID.AM-2',
    vulnerability: "XSS у WordPress",
    ttp: "Впровадження шкідливого JavaScript-коду",
    affectedAssetTypes: ['software']
  },
  "Інша загроза (потребує ручного опису)": {
    identifier: 'N/A',
    vulnerability: "Опишіть вразливість...",
    ttp: "Опишіть можливі дії зловмисника...",
    affectedAssetTypes: []
  }
};

const threatOptions = Object.keys(threatDetailsMap).sort((a, b) => a.startsWith("Інша") ? 1 : b.startsWith("Інша") ? -1 : a.localeCompare(b)) as [string, ...string[]];

const baseAssetOptions = ["-", "Інше"] as const;

const singleCurrentProfileThreatSchema = z.object({
  id: z.string(),
  selectedRisk: z.string().min(1, "Необхідно обрати загрозу"), // Ключ з threatDetailsMap
  identifier: z.string().optional(),
  vulnerabilityDescription: z.string().min(1, "Опис вразливості обов'язковий"),
  ttpDescription: z.string().min(1, "Опис TTP обов'язковий"),
  implementationStatus: z.string().optional(),
  implementationLevel: z.string().optional(),
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

const defaultSelectedRiskKey = threatOptions.find(opt => !opt.startsWith("Інша")) || threatOptions[0];
const defaultRiskDetails = threatDetailsMap[defaultSelectedRiskKey] || threatDetailsMap["Інша загроза (потребує ручного опису)"];

const defaultThreatValues: SingleCurrentProfileThreatValues = {
  id: Date.now().toString(),
  selectedRisk: defaultSelectedRiskKey,
  identifier: defaultRiskDetails.identifier,
  vulnerabilityDescription: defaultRiskDetails.vulnerability,
  ttpDescription: defaultRiskDetails.ttp,
  implementationStatus: 'Реалізовано',
  implementationLevel: '3',
  software: '-',
  hardware: '-',
  informationResource: '-',
  icsTool: '-',
  comment: 'Загальні заходи захисту на рівні мережі та кінцевих точок впроваджені.',
};

const defaultTargetIdentifierValue = { id: Date.now().toString(), value: 'ID.AM-3.Target' };


const formatCurrentProfileDataToString = (data: SingleCurrentProfileThreatValues[]): string => {
  if (!data || data.length === 0) return "Поточний профіль безпеки: Інформація не надана\n";

  let summary = "Поточний профіль безпеки (виявлені загрози та їх деталі):\n\n";
  data.forEach((item, index) => {
    summary += `Загроза (Ризик) ${index + 1}: ${item.selectedRisk}\n`;
    if (item.identifier) summary += `  - Ідентифікатор: ${item.identifier}\n`;
    summary += `  - Вразливість: ${item.vulnerabilityDescription}\n`;
    summary += `  - Можливі дії зловмисника (TTP): ${item.ttpDescription}\n`;
    if (item.implementationStatus) summary += `  - Статус реалізації контрзаходів: ${item.implementationStatus}\n`;
    if (item.implementationLevel) summary += `  - Рівень впровадження контрзаходів: ${item.implementationLevel}\n`;
    if (item.software && item.software !== '-') summary += `  - Пов'язане програмне забезпечення (Актив): ${item.software}\n`;
    if (item.hardware && item.hardware !== '-') summary += `  - Пов'язане апаратне забезпечення (Актив): ${item.hardware}\n`;
    if (item.informationResource && item.informationResource !== '-') summary += `  - Пов'язаний інформаційний ресурс (Актив): ${item.informationResource}\n`;
    if (item.icsTool && item.icsTool !== '-') summary += `  - Пов'язаний засіб ІКЗ (Актив): ${item.icsTool}\n`;
    if (item.comment && item.comment.trim() !== '') summary += `  - Коментар: ${item.comment}\n`;
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

  const [softwareAssetOptions, setSoftwareAssetOptions] = useState<string[]>([...baseAssetOptions]);
  const [hardwareAssetOptions, setHardwareAssetOptions] = useState<string[]>([...baseAssetOptions]);
  const [informationResourceAssetOptions, setInformationResourceAssetOptions] = useState<string[]>([...baseAssetOptions]);
  const [icsToolAssetOptions, setIcsToolAssetOptions] = useState<string[]>([...baseAssetOptions]);

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

  const fetchAssetsForReport = useCallback(async () => {
    try {
      const assetsCollectionRef = collection(db, 'assets');
      const assetSnapshot = await getDocs(assetsCollectionRef);
      const assetsList = assetSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset));
      
      const sortAssets = (options: string[]) => options.sort((a, b) => {
        if (baseAssetOptions.includes(a as typeof baseAssetOptions[number])) {
          return baseAssetOptions.includes(b as typeof baseAssetOptions[number]) ? a.localeCompare(b) : -1;
        }
        return baseAssetOptions.includes(b as typeof baseAssetOptions[number]) ? 1 : a.localeCompare(b);
      });

      const sw = assetsList.filter(a => a.type === 'Програмне забезпечення').map(a => a.name);
      setSoftwareAssetOptions(sortAssets([...new Set([...baseAssetOptions, ...sw])]));

      const hw = assetsList.filter(a => a.type === 'Обладнання').map(a => a.name);
      setHardwareAssetOptions(sortAssets([...new Set([...baseAssetOptions, ...hw])]));

      const ir = assetsList.filter(a => a.type === 'Інформація').map(a => a.name);
      setInformationResourceAssetOptions(sortAssets([...new Set([...baseAssetOptions, ...ir])]));
      
      // For ICS tools, we might consider both hardware and software type assets that function as security tools.
      // This is a simplification; a more robust system might have a specific 'ICS Tool' asset type or tag.
      const ics = assetsList.filter(a => a.type === 'Програмне забезпечення' || a.type === 'Обладнання').map(a => a.name); 
      setIcsToolAssetOptions(sortAssets([...new Set([...baseAssetOptions, ...ics])]));

    } catch (error) {
      console.error("Error fetching assets for report: ", error);
      toast({ title: "Помилка", description: "Не вдалося завантажити активи для звітів.", variant: "destructive" });
    }
  }, [toast]);

  useEffect(() => {
    fetchAssetsForReport();
  }, [fetchAssetsForReport]);

  const currentProfileDetailsWatch = useWatch({ control: form.control, name: 'currentProfileDetails' });
  useEffect(() => {
    currentProfileDetailsWatch.forEach((threat, index) => {
      const pathPrefix = `currentProfileDetails.${index}` as const;
      if (form.getValues(`${pathPrefix}.software`) === undefined) form.setValue(`${pathPrefix}.software`, '-', { shouldValidate: false });
      if (form.getValues(`${pathPrefix}.hardware`) === undefined) form.setValue(`${pathPrefix}.hardware`, '-', { shouldValidate: false });
      if (form.getValues(`${pathPrefix}.informationResource`) === undefined) form.setValue(`${pathPrefix}.informationResource`, '-', { shouldValidate: false });
      if (form.getValues(`${pathPrefix}.icsTool`) === undefined) form.setValue(`${pathPrefix}.icsTool`, '-', { shouldValidate: false });

      const selectedRiskValue = form.getValues(`${pathPrefix}.selectedRisk`);
      if (selectedRiskValue) {
        const details = threatDetailsMap[selectedRiskValue];
        if (details?.affectedAssetTypes && details.affectedAssetTypes.length > 0) {
            const affected = details.affectedAssetTypes;
            if (!affected.includes('software') && form.getValues(`${pathPrefix}.software`) !== '-') form.setValue(`${pathPrefix}.software`, '-', { shouldDirty: true, shouldValidate: true });
            if (!affected.includes('hardware') && form.getValues(`${pathPrefix}.hardware`) !== '-') form.setValue(`${pathPrefix}.hardware`, '-', { shouldDirty: true, shouldValidate: true });
            if (!affected.includes('informationResource') && form.getValues(`${pathPrefix}.informationResource`) !== '-') form.setValue(`${pathPrefix}.informationResource`, '-', { shouldDirty: true, shouldValidate: true });
            if (!affected.includes('icsTool') && form.getValues(`${pathPrefix}.icsTool`) !== '-') form.setValue(`${pathPrefix}.icsTool`, '-', { shouldDirty: true, shouldValidate: true });
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

  const handleSelectedRiskChange = (selectedRiskKey: string, threatIndex: number) => {
    const details = threatDetailsMap[selectedRiskKey];
    const pathPrefix = `currentProfileDetails.${threatIndex}` as const;

    if (details) {
      form.setValue(`${pathPrefix}.identifier`, details.identifier, { shouldDirty: true });
      form.setValue(`${pathPrefix}.vulnerabilityDescription`, details.vulnerability, { shouldDirty: true });
      form.setValue(`${pathPrefix}.ttpDescription`, details.ttp, { shouldDirty: true });

      if (details.affectedAssetTypes && details.affectedAssetTypes.length > 0) {
        const affected = details.affectedAssetTypes;
        if (!affected.includes('software')) form.setValue(`${pathPrefix}.software`, '-', { shouldDirty: true });
        if (!affected.includes('hardware')) form.setValue(`${pathPrefix}.hardware`, '-', { shouldDirty: true });
        if (!affected.includes('informationResource')) form.setValue(`${pathPrefix}.informationResource`, '-', { shouldDirty: true });
        if (!affected.includes('icsTool')) form.setValue(`${pathPrefix}.icsTool`, '-', { shouldDirty: true });
      } else { // If affectedAssetTypes is empty (e.g. "Інша загроза"), don't clear assets
          // This allows manual selection for "Інша загроза"
      }
    }
  };

  const renderCurrentProfileThreatFields = (threatIndex: number) => {
    const pathPrefix = `currentProfileDetails.${threatIndex}` as const;
    const selectedRiskValue = form.watch(`${pathPrefix}.selectedRisk`);
    const isOtherThreat = selectedRiskValue === "Інша загроза (потребує ручного опису)";

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
      <h4 className="text-md font-semibold text-primary/90">Поточна Загроза (Ризик) #{threatIndex + 1}</h4>
      <FormField
        control={form.control}
        name={`${pathPrefix}.selectedRisk`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Оберіть Загрозу (Ризик)</FormLabel>
            <Select
              onValueChange={(value) => {
                field.onChange(value);
                handleSelectedRiskChange(value, threatIndex);
              }}
              defaultValue={field.value}
            >
              <FormControl><SelectTrigger><SelectValue placeholder="Оберіть загрозу (ризик) зі списку" /></SelectTrigger></FormControl>
              <SelectContent>
                {threatOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name={`${pathPrefix}.identifier`}
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
        name={`${pathPrefix}.vulnerabilityDescription`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Опис Вразливості</FormLabel>
            <FormControl><Textarea placeholder="Опис вразливості, що призводить до загрози..." {...field} className="min-h-[100px] font-code text-sm" readOnly={!isOtherThreat && !!threatDetailsMap[selectedRiskValue]?.vulnerability && threatDetailsMap[selectedRiskValue]?.vulnerability !== "Опишіть вразливість..."} /></FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name={`${pathPrefix}.ttpDescription`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Можливі дії зловмисника (TTP)</FormLabel>
            <FormControl><Textarea placeholder="Опис тактик, технік та процедур зловмисника..." {...field} className="min-h-[100px] font-code text-sm" readOnly={!isOtherThreat && !!threatDetailsMap[selectedRiskValue]?.ttp && threatDetailsMap[selectedRiskValue]?.ttp !== "Опишіть можливі дії зловмисника..."} /></FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
       <FormField
        control={form.control}
        name={`${pathPrefix}.software`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Програмне забезпечення (Актив)</FormLabel>
            <Select onValueChange={field.onChange} value={field.value || '-'} disabled={isOtherThreat ? false : !threatDetailsMap[selectedRiskValue]?.affectedAssetTypes.includes('software')}>
              <FormControl><SelectTrigger><SelectValue placeholder="Оберіть ПЗ з реєстру" /></SelectTrigger></FormControl>
              <SelectContent>
                {softwareAssetOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name={`${pathPrefix}.hardware`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Апаратне забезпечення (Актив)</FormLabel>
            <Select onValueChange={field.onChange} value={field.value || '-'} disabled={isOtherThreat ? false : !threatDetailsMap[selectedRiskValue]?.affectedAssetTypes.includes('hardware')}>
              <FormControl><SelectTrigger><SelectValue placeholder="Оберіть апаратне забезпечення з реєстру" /></SelectTrigger></FormControl>
              <SelectContent>
                {hardwareAssetOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name={`${pathPrefix}.informationResource`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Інформаційний ресурс (Актив)</FormLabel>
            <Select onValueChange={field.onChange} value={field.value || '-'} disabled={isOtherThreat ? false : !threatDetailsMap[selectedRiskValue]?.affectedAssetTypes.includes('informationResource')}>
              <FormControl><SelectTrigger><SelectValue placeholder="Оберіть інформаційний ресурс з реєстру" /></SelectTrigger></FormControl>
              <SelectContent>
                {informationResourceAssetOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name={`${pathPrefix}.icsTool`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Засіб ІКЗ (Актив)</FormLabel>
            <Select onValueChange={field.onChange} value={field.value || '-'} disabled={isOtherThreat ? false : !threatDetailsMap[selectedRiskValue]?.affectedAssetTypes.includes('icsTool')}>
              <FormControl><SelectTrigger><SelectValue placeholder="Оберіть засіб ІКЗ з реєстру" /></SelectTrigger></FormControl>
              <SelectContent>
                {icsToolAssetOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name={`${pathPrefix}.implementationStatus`}
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
        name={`${pathPrefix}.implementationLevel`}
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
        name={`${pathPrefix}.comment`}
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
        Створіть звіт, обравши Загрозу (Ризик), що автоматично заповнить Вразливість та TTP. 
        Активи підтягуються з Реєстру активів. Нерелевантні типи активів будуть автоматично очищені (встановлені в "-") або деактивовані.
        Ви можете редагувати авто-заповнені поля Вразливості та ТТР.
      </CardDescription>

      {!reportGenerated ? (
        <Card>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleGenerateReport)}>
              <CardHeader>
                <CardTitle>Створити звіт про безпеку</CardTitle>
                <CardDescription>Заповніть деталі для поточного та цільового профілів. Оберіть "Загрозу (Ризик)" для автоматичного заповнення полів "Ідентифікатор", "Опис Вразливості" та "Опис ТТР".</CardDescription>
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
                        const newRiskKey = threatOptions.find(opt => !opt.startsWith("Інша")) || threatOptions[0];
                        const newRiskDetails = threatDetailsMap[newRiskKey] || threatDetailsMap["Інша загроза (потребує ручного опису)"];
                        const newThreatToAdd: SingleCurrentProfileThreatValues = {
                            ...defaultThreatValues, 
                            id: Date.now().toString(),
                            selectedRisk: newRiskKey,
                            identifier: newRiskDetails.identifier,
                            vulnerabilityDescription: newRiskDetails.vulnerability,
                            ttpDescription: newRiskDetails.ttp,
                            comment: '', 
                        };
                        
                        if (newRiskDetails.affectedAssetTypes && newRiskDetails.affectedAssetTypes.length > 0) {
                            const affected = newRiskDetails.affectedAssetTypes;
                            newThreatToAdd.software = affected.includes('software') ? (softwareAssetOptions.length > 2 ? softwareAssetOptions.find(o => o !== '-' && o !== 'Інше') || '-' : '-') : '-';
                            newThreatToAdd.hardware = affected.includes('hardware') ? (hardwareAssetOptions.length > 2 ? hardwareAssetOptions.find(o => o !== '-' && o !== 'Інше') || '-' : '-') : '-';
                            newThreatToAdd.informationResource = affected.includes('informationResource') ? (informationResourceAssetOptions.length > 2 ? informationResourceAssetOptions.find(o => o !== '-' && o !== 'Інше') || '-' : '-') : '-';
                            newThreatToAdd.icsTool = affected.includes('icsTool') ? (icsToolAssetOptions.length > 2 ? icsToolAssetOptions.find(o => o !== '-' && o !== 'Інше') || '-' : '-') : '-';
                        } else { // For "Інша загроза" or if no affected types, default to '-'
                            newThreatToAdd.software = '-';
                            newThreatToAdd.hardware = '-';
                            newThreatToAdd.informationResource = '-';
                            newThreatToAdd.icsTool = '-';
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
            <Button variant="outline" onClick={() => { setReportGenerated(false); setError(null); setAiAnalysisResult(null); setIsLoading(false); fetchAssetsForReport(); }}>
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
    

    
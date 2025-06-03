
"use client";

import * as React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
// Removed: import { analyzeSecurityGaps, type GapAnalysisInput, type GapAnalysisOutput } from '@/ai/flows/gap-analyzer-flow';
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
import { Loader2, FileText, Printer, AlertTriangle, PlusCircle, Trash2 } from 'lucide-react'; // Removed Sparkles
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useReactToPrint } from 'react-to-print';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';


const implementationStatusOptions = ["Реалізовано", "Не реалізовано", "Частково реалізовано", "Не застосовується"] as const;
const implementationLevelOptions = ["1", "2", "3", "4"] as const;

type AssetCategoryKey = 'software' | 'hardware' | 'informationResource' | 'icsTool';

interface ThreatDetailValue {
  identifier: string;
  vulnerability: string;
  ttp: string;
  affectedAssetTypes: AssetCategoryKey[];
}

// Key: "Загроза (конкретний ризик)"
const threatDetailsMap: Record<string, ThreatDetailValue> = {
  "Інфікування робочих станцій або серверів, втрата контролю над системою": {
    identifier: 'ID.AM-2', // Relates to software/hardware systems
    vulnerability: "Атака через шкідливі вкладення",
    ttp: "Відкриття вкладення, інфікування систем шкідливим ПЗ",
    affectedAssetTypes: ['software', 'hardware']
  },
  "Несанкціоноване виконання коду, крадіжка даних, порушення роботи сайту": {
    identifier: 'ID.AM-2', // Relates to software (CMS)
    vulnerability: "Використання уразливого компонента CMS",
    ttp: "Експлуатація вразливості, запуск шкідливого коду",
    affectedAssetTypes: ['software']
  },
  "Втрата конфіденційної інформації, репутаційні й фінансові збитки": {
    identifier: 'ID.AM-3', // Relates to data
    vulnerability: "Витік даних",
    ttp: "Несанкціонований доступ, копіювання, передача інформації",
    affectedAssetTypes: ['informationResource']
  },
  "Несанкціонований доступ до систем і сервісів через викрадені паролі": {
    identifier: 'ID.AM-3', // Relates to access, data protection
    vulnerability: "Збереження паролів у відкритому вигляді",
    ttp: "Викрадення або витік паролів",
    affectedAssetTypes: ['informationResource', 'software']
  },
  "Порушення цілісності, витік даних, саботаж систем через недостатній контроль доступу": {
    identifier: 'ID.AM-3', // Access control
    vulnerability: "Недостатній контроль доступу",
    ttp: "Несанкціонований вхід, підміна прав користувачів",
    affectedAssetTypes: ['informationResource', 'software', 'hardware']
  },
  "Юридичні проблеми, втрата контролю над CRM через ліцензування": {
    identifier: 'ID.AM-2', // Software licensing
    vulnerability: "Незахищене ліцензування CRM",
    ttp: "Викрадення ліцензійних ключів, використання піратських копій",
    affectedAssetTypes: ['software']
  },
  "Викрадення персональних даних, порушення аутентифікації через доступ до бази користувачів": {
    identifier: 'ID.AM-3', // Data asset
    vulnerability: "Несанкціонований доступ до бази користувачів",
    ttp: "Викрадення або модифікація даних користувачів",
    affectedAssetTypes: ['informationResource']
  },
  "Несанкціонований доступ, компрометація систем через обхід автентифікації": {
    identifier: 'ID.AM-2', // Authentication mechanism - often software
    vulnerability: "Обхід автентифікації",
    ttp: "Використання вразливостей для обходу перевірки ідентичності",
    affectedAssetTypes: ['software']
  },
  "Підвищений ризик інцидентів, внутрішні загрози через порушення політики": {
    identifier: 'ID.AM-5', // Organizational policy
    vulnerability: "Порушення політики безпеки",
    ttp: "Несанкціоновані зміни, ігнорування правил",
    affectedAssetTypes: ['software', 'hardware', 'informationResource'] // Can affect all
  },
  "Витік інформації, компрометація облікових даних через соціальну інженерію": {
    identifier: 'ID.AM-5', // Human factor
    vulnerability: "Соціальна інженерія",
    ttp: "Обман співробітників для отримання доступу",
    affectedAssetTypes: ['informationResource']
  },
  "Крадіжка облікових даних, несанкціонований доступ через фішинг": {
    identifier: 'ID.AM-5', // Human factor, often targets credentials for info systems
    vulnerability: "Фішинг",
    ttp: "Розсилання підробних листів для отримання даних",
    affectedAssetTypes: ['informationResource', 'software']
  },
  "Компрометація користувацьких акаунтів, втручання у роботу CRM через фішинг-посилання": {
    identifier: 'ID.AM-2', // Software (CRM) specific
    vulnerability: "Фішинг-посилання у CRM",
    ttp: "Впровадження шкідливих посилань в CRM",
    affectedAssetTypes: ['software']
  },
  "Пошкодження систем, крадіжка даних, відмова у обслуговуванні через шкідливе ПЗ": {
    identifier: 'ID.AM-2', // Malware affects software/hardware
    vulnerability: "Шкідливе програмне забезпечення",
    ttp: "Інсталяція, поширення шкідливих модулів",
    affectedAssetTypes: ['software', 'hardware']
  },
  "Недоступність сервісу для користувачів через DoS-атаку": {
    identifier: 'ID.AM-2', // Affects availability of software/hardware services
    vulnerability: "DoS-атака на портал",
    ttp: "Перевантаження сервера запитами",
    affectedAssetTypes: ['software', 'hardware']
  },
  "Викрадення, модифікація або видалення даних у базі через SQL Injection": {
    identifier: 'ID.AM-2', // Software (database server) and data itself
    vulnerability: "SQL Injection на сервері бази даних",
    ttp: "Вставка шкідливого SQL-коду",
    affectedAssetTypes: ['software', 'informationResource']
  },
  "Збої, відмова у роботі, втручання у цілісність і конфіденційність через XSS": { // Updated Threat for XSS
    identifier: 'ID.AM-2', // Software (WordPress)
    vulnerability: "XSS у WordPress",
    ttp: "Впровадження шкідливого JavaScript-коду",
    affectedAssetTypes: ['software']
  },
  "Інша загроза (потребує ручного опису)": {
    identifier: 'N/A',
    vulnerability: "Опишіть вразливість...",
    ttp: "Опишіть можливі дії зловмисника...",
    affectedAssetTypes: [] // Allows all asset types to be selected manually
  }
};

const threatOptions = Object.keys(threatDetailsMap).sort((a, b) => a.startsWith("Інша") ? 1 : b.startsWith("Інша") ? -1 : a.localeCompare(b)) as [string, ...string[]];

const baseAssetOptions = ["-", "Інше"] as const;

const icsToolOptionsList = [
  { value: "-", label: "-" },
  { value: "Інший засіб ІКЗ", label: "Інший засіб ІКЗ" },
  { value: "Microsoft Active Directory, Okta", label: "Система управління доступом (IAM) (Microsoft Active Directory, Okta)" },
  { value: "OpenSSL, Thales Luna HSM", label: "Криптографічні засоби (OpenSSL, Thales Luna HSM)" },
  { value: "Kaspersky Endpoint Security, Symantec Endpoint Protection", label: "Антивірусні системи (Kaspersky Endpoint Security, Symantec Endpoint Protection)" },
  { value: "Cisco ASA, Fortinet FortiGate, pfSense", label: "Мережеві міжмережеві екрани (Firewall) (Cisco ASA, Fortinet FortiGate, pfSense)" },
  { value: "Snort, Suricata", label: "Системи виявлення і запобігання вторгненням (IDS/IPS) (Snort, Suricata)" },
  { value: "Splunk, IBM QRadar, ELK Stack", label: "Системи централізованого логування (SIEM) (Splunk, IBM QRadar, ELK Stack)" },
  { value: "Veeam Backup & Replication, Acronis True Image", label: "Засоби резервного копіювання (Veeam Backup & Replication, Acronis True Image)" },
  { value: "HID Global, Honeywell Access Control", label: "Системи контролю фізичного доступу (HID Global, Honeywell Access Control)" },
  { value: "Microsoft WSUS, ManageEngine Patch Manager", label: "Системи управління патчами (Microsoft WSUS, ManageEngine Patch Manager)" },
];


const singleCurrentProfileThreatSchema = z.object({
  id: z.string(),
  selectedRisk: z.string().min(1, "Необхідно обрати загрозу"), // Key from threatDetailsMap, now "Загроза"
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
  appliesToIcsTool: z.boolean().optional().default(false), // Keep this for target profile flexibility
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
  comment: '',
};

const defaultTargetIdentifierValue = { id: Date.now().toString(), value: 'ID.AM-3.Target' };


const PrintableReport = React.forwardRef<HTMLDivElement, {
  currentProfileData: ReportPageFormValues['currentProfileDetails'];
  targetProfileData: ReportPageFormValues['targetProfileDetails'];
}>(({ currentProfileData, targetProfileData }, ref) => {
  return (
    <div ref={ref} className="p-8 print:p-4 font-sans">
      <header className="text-center mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">Звіт про безпеку "КіберСтраж"</h1>
        <p className="text-sm text-muted-foreground">Згенеровано: {new Date().toLocaleDateString('uk-UA', { year: 'numeric', month: 'long', day: 'numeric' })} {new Date().toLocaleTimeString('uk-UA')}</p>
      </header>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-3 border-b-2 border-primary pb-2">1. Поточний профіль безпеки</h2>
        {currentProfileData && currentProfileData.length > 0 ? (
          <Table className="text-xs">
            <TableHeader>
              <TableRow>
                <TableHead>Загроза</TableHead>
                <TableHead>Вразливість</TableHead>
                <TableHead>ТТП</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>ПЗ</TableHead>
                <TableHead>Обладнання</TableHead>
                <TableHead>Інфо.Рес.</TableHead>
                <TableHead>Засіб ІКЗ</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Рівень</TableHead>
                <TableHead>Коментар</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentProfileData.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="max-w-[150px] break-words">{item.selectedRisk}</TableCell>
                  <TableCell className="max-w-[150px] break-words">{item.vulnerabilityDescription}</TableCell>
                  <TableCell className="max-w-[150px] break-words">{item.ttpDescription}</TableCell>
                  <TableCell>{item.identifier}</TableCell>
                  <TableCell>{item.software}</TableCell>
                  <TableCell>{item.hardware}</TableCell>
                  <TableCell>{item.informationResource}</TableCell>
                  <TableCell>{icsToolOptionsList.find(opt => opt.value === item.icsTool)?.label || item.icsTool}</TableCell>
                  <TableCell>{item.implementationStatus}</TableCell>
                  <TableCell>{item.implementationLevel}</TableCell>
                  <TableCell className="max-w-[150px] break-words">{item.comment}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : <p className="text-sm text-muted-foreground">Інформація не надана.</p>}
      </section>

      <section className="mb-8 page-break-before">
        <h2 className="text-2xl font-semibold mb-3 border-b-2 border-primary pb-2">2. Цільовий профіль безпеки</h2>
         {targetProfileData ? (
            <Table className="text-xs">
                 <TableHeader>
                    <TableRow>
                        <TableHead>Цільові Ідентифікатори</TableHead>
                        <TableHead>Бажаний рівень впровадження</TableHead>
                        <TableHead>Застосовується до ПЗ</TableHead>
                        <TableHead>Застосовується до Обладнання</TableHead>
                        <TableHead>Застосовується до Інфо.Ресурсів</TableHead>
                        <TableHead>Застосовується до Засобів ІКЗ</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow>
                        <TableCell>{targetProfileData.identifiers.map(id => id.value).join(', ')}</TableCell>
                        <TableCell>{targetProfileData.implementationLevel}</TableCell>
                        <TableCell>{targetProfileData.appliesToSoftware ? 'Так' : 'Ні'}</TableCell>
                        <TableCell>{targetProfileData.appliesToHardware ? 'Так' : 'Ні'}</TableCell>
                        <TableCell>{targetProfileData.appliesToInformationResource ? 'Так' : 'Ні'}</TableCell>
                        <TableCell>{targetProfileData.appliesToIcsTool ? 'Так' : 'Ні'}</TableCell>
                    </TableRow>
                </TableBody>
            </Table>
         ) : <p className="text-sm text-muted-foreground">Інформація не надана.</p>}
      </section>
      
      <section className="mb-8 page-break-before">
        <h2 className="text-2xl font-semibold mb-3 border-b-2 border-primary pb-2">3. Аналіз Розривів та Рекомендації</h2>
        <div className="text-sm bg-gray-100 dark:bg-card p-4 rounded-md">
            <p className="whitespace-pre-wrap">
            На основі порівняння Поточного та Цільового профілів безпеки, визначте необхідні заходи для досягнення цілей.
            Цей розділ призначений для ручного заповнення або документування стратегії покращення.
            </p>
            <p className="mt-2 whitespace-pre-wrap">
            Наприклад:
            Для досягнення ідентифікатора(ів) [{targetProfileData?.identifiers.map(id => id.value).join(', ') || 'Цільові Ідентифікатори'}]:
            - Необхідно впровадити/покращити наступні засоби ІКЗ: [Перелік засобів]
            - Необхідно усунути/мінімізувати наступні загрози: [Перелік загроз з Поточного профілю, що не відповідають цілям]
            - Необхідно застосувати додаткові контролі до активів: [Перелік активів та контролів]
            </p>
        </div>
      </section>

       <footer className="mt-12 pt-4 border-t text-center text-xs text-muted-foreground">
        КіберСтраж - Захист вашої інфраструктури
      </footer>
    </div>
  );
});
PrintableReport.displayName = 'PrintableReport';


export default function ReportingPage() {
  const [reportGenerated, setReportGenerated] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  
  const [currentProfileForDisplay, setCurrentProfileForDisplay] = useState<ReportPageFormValues['currentProfileDetails'] | null>(null);
  const [targetProfileForDisplay, setTargetProfileForDisplay] = useState<ReportPageFormValues['targetProfileDetails'] | null>(null);

  const [softwareAssetOptions, setSoftwareAssetOptions] = useState<string[]>([...baseAssetOptions]);
  const [hardwareAssetOptions, setHardwareAssetOptions] = useState<string[]>([...baseAssetOptions]);
  const [informationResourceAssetOptions, setInformationResourceAssetOptions] = useState<string[]>([...baseAssetOptions]);
  // ICS Tool options are static, defined in icsToolOptionsList

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
      
    } catch (error) {
      console.error("Error fetching assets for report: ", error);
      toast({ title: "Помилка", description: "Не вдалося завантажити активи для звітів.", variant: "destructive" });
    }
  }, [toast]);

  useEffect(() => {
    fetchAssetsForReport();
  }, [fetchAssetsForReport]);

  const getFirstAvailableAsset = (options: string[]): string => {
    return options.find(opt => !baseAssetOptions.includes(opt as any)) || '-';
  };

  const handleSelectedRiskChange = (selectedRiskKey: string, threatIndex: number) => {
    const details = threatDetailsMap[selectedRiskKey];
    const pathPrefix = `currentProfileDetails.${threatIndex}` as const;

    if (details) {
      form.setValue(`${pathPrefix}.identifier`, details.identifier, { shouldDirty: true });
      form.setValue(`${pathPrefix}.vulnerabilityDescription`, details.vulnerability, { shouldDirty: true });
      form.setValue(`${pathPrefix}.ttpDescription`, details.ttp, { shouldDirty: true });

      const affected = details.affectedAssetTypes;
      const isOther = selectedRiskKey === "Інша загроза (потребує ручного опису)";

      if (!isOther && affected.length > 0) {
        form.setValue(`${pathPrefix}.software`, affected.includes('software') ? getFirstAvailableAsset(softwareAssetOptions) : '-', { shouldDirty: true });
        form.setValue(`${pathPrefix}.hardware`, affected.includes('hardware') ? getFirstAvailableAsset(hardwareAssetOptions) : '-', { shouldDirty: true });
        form.setValue(`${pathPrefix}.informationResource`, affected.includes('informationResource') ? getFirstAvailableAsset(informationResourceAssetOptions) : '-', { shouldDirty: true });
        // ICS Tool is manually selected, not auto-set based on threat's affectedAssetTypes
        // form.setValue(`${pathPrefix}.icsTool`, affected.includes('icsTool') ? (icsToolOptionsList.length > 2 ? icsToolOptionsList[2].value : '-') : '-', { shouldDirty: true });
      } else if (isOther) {
        // For "Інша загроза", allow user to select any asset, don't auto-clear.
        // Default to '-' if not already set or if previous threat cleared them.
        if (!form.getValues(`${pathPrefix}.software`)) form.setValue(`${pathPrefix}.software`, '-', { shouldDirty: true });
        if (!form.getValues(`${pathPrefix}.hardware`)) form.setValue(`${pathPrefix}.hardware`, '-', { shouldDirty: true });
        if (!form.getValues(`${pathPrefix}.informationResource`)) form.setValue(`${pathPrefix}.informationResource`, '-', { shouldDirty: true });
      }
    }
  };
  
  const handleGenerateReport = async (values: ReportPageFormValues) => {
    setIsGeneratingReport(true);
    setCurrentProfileForDisplay(values.currentProfileDetails);
    setTargetProfileForDisplay(values.targetProfileDetails);
    setReportGenerated(true);
    setIsGeneratingReport(false);
    toast({ title: "Успіх", description: "Звіт успішно згенеровано." });
  };


  const renderCurrentProfileThreatFields = (threatIndex: number) => {
    const pathPrefix = `currentProfileDetails.${threatIndex}` as const;
    const selectedRiskValue = form.watch(`${pathPrefix}.selectedRisk`);
    const isOtherThreat = selectedRiskValue === "Інша загроза (потребує ручного опису)";
    const currentThreatDetails = threatDetailsMap[selectedRiskValue];
    const affectedForCurrentThreat = currentThreatDetails?.affectedAssetTypes || [];

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
        name={`${pathPrefix}.selectedRisk`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Оберіть загрозу</FormLabel>
            <Select
              onValueChange={(value) => {
                field.onChange(value);
                handleSelectedRiskChange(value, threatIndex);
              }}
              defaultValue={field.value}
            >
              <FormControl><SelectTrigger><SelectValue placeholder="Оберіть загрозу зі списку" /></SelectTrigger></FormControl>
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
            <Select onValueChange={field.onChange} value={field.value || '-'} disabled={!isOtherThreat && !affectedForCurrentThreat.includes('software')}>
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
            <Select onValueChange={field.onChange} value={field.value || '-'} disabled={!isOtherThreat && !affectedForCurrentThreat.includes('hardware')}>
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
            <Select onValueChange={field.onChange} value={field.value || '-'} disabled={!isOtherThreat && !affectedForCurrentThreat.includes('informationResource')}>
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
            <FormLabel>Засіб ІКЗ</FormLabel>
            <Select onValueChange={field.onChange} value={field.value || '-'}>
              <FormControl><SelectTrigger><SelectValue placeholder="Оберіть засіб ІКЗ" /></SelectTrigger></FormControl>
              <SelectContent>
                {icsToolOptionsList.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
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
        Створіть звіт, обравши Загрозу, що автоматично заповнить Вразливість, ТТП та Ідентифікатор. 
        Активи підтягуються з Реєстру активів. Нерелевантні типи активів будуть автоматично встановлені в "-" або деактивовані для вибору, окрім сценарію "Інша загроза".
        Засіб ІКЗ обирається зі списку. Поля Вразливості, ТТП та Коментар можна редагувати вручну.
      </CardDescription>

      {!reportGenerated ? (
        <Card>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleGenerateReport)}>
              <CardHeader>
                <CardTitle>Створити звіт про безпеку</CardTitle>
                <CardDescription>Заповніть деталі для поточного та цільового профілів. Оберіть "Загрозу" для автоматичного заповнення пов'язаних полів.</CardDescription>
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
                        const affectedForNew = newRiskDetails.affectedAssetTypes;
                        const isOtherNew = newRiskKey === "Інша загроза (потребує ручного опису)";
                        
                        const newThreatToAdd: SingleCurrentProfileThreatValues = {
                            ...defaultThreatValues, 
                            id: Date.now().toString(),
                            selectedRisk: newRiskKey,
                            identifier: newRiskDetails.identifier,
                            vulnerabilityDescription: newRiskDetails.vulnerability,
                            ttpDescription: newRiskDetails.ttp,
                            comment: '', 
                            software: (!isOtherNew && affectedForNew.includes('software')) ? getFirstAvailableAsset(softwareAssetOptions) : '-',
                            hardware: (!isOtherNew && affectedForNew.includes('hardware')) ? getFirstAvailableAsset(hardwareAssetOptions) : '-',
                            informationResource: (!isOtherNew && affectedForNew.includes('informationResource')) ? getFirstAvailableAsset(informationResourceAssetOptions) : '-',
                            icsTool: '-', // ICS Tool is always manual
                        };
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
                <Button type="submit" disabled={isGeneratingReport} className="w-full sm:w-auto">
                  {isGeneratingReport ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Генерація звіту...
                    </>
                  ) : (
                    <>
                    <FileText className="mr-2 h-4 w-4" /> Створити звіт
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

      {reportGenerated && (
        <>
        <div className="flex justify-end gap-2 mb-4 print:hidden">
            <Button variant="outline" onClick={() => { setReportGenerated(false); setCurrentProfileForDisplay(null); setTargetProfileForDisplay(null); fetchAssetsForReport(); form.reset(); }}>
                Створити новий звіт / Редагувати
            </Button>
            <Button onClick={handlePrint} disabled={isGeneratingReport}>
                {isGeneratingReport && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Printer className="mr-2 h-4 w-4" /> Роздрукувати/Зберегти PDF
            </Button>
        </div>

        <div style={{ display: "none" }}>
          <PrintableReport
            ref={reportPrintRef}
            currentProfileData={currentProfileForDisplay || []}
            targetProfileData={targetProfileForDisplay!}
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
              <ScrollArea className="h-auto max-h-[400px] w-full rounded-md border p-0 print:h-auto print:border-none print:p-0">
                {currentProfileForDisplay && currentProfileForDisplay.length > 0 ? (
                 <Table className="text-xs">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[120px]">Загроза</TableHead>
                        <TableHead className="min-w-[120px]">Вразливість</TableHead>
                        <TableHead className="min-w-[120px]">ТТП</TableHead>
                        <TableHead>ID</TableHead>
                        <TableHead>ПЗ</TableHead>
                        <TableHead>Обладнання</TableHead>
                        <TableHead>Інфо.Рес.</TableHead>
                        <TableHead className="min-w-[120px]">Засіб ІКЗ</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead>Рівень</TableHead>
                        <TableHead className="min-w-[120px]">Коментар</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentProfileForDisplay.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="break-words">{item.selectedRisk}</TableCell>
                          <TableCell className="break-words">{item.vulnerabilityDescription}</TableCell>
                          <TableCell className="break-words">{item.ttpDescription}</TableCell>
                          <TableCell>{item.identifier}</TableCell>
                          <TableCell>{item.software}</TableCell>
                          <TableCell>{item.hardware}</TableCell>
                          <TableCell>{item.informationResource}</TableCell>
                          <TableCell className="break-words">{icsToolOptionsList.find(opt => opt.value === item.icsTool)?.label || item.icsTool}</TableCell>
                          <TableCell>{item.implementationStatus}</TableCell>
                          <TableCell>{item.implementationLevel}</TableCell>
                          <TableCell className="break-words">{item.comment}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : <p className="text-sm text-muted-foreground p-3">Інформація не надана.</p>}
              </ScrollArea>
            </section>

            <Separator className="my-6" />

            <section>
              <h3 className="text-xl font-headline mb-2 border-b pb-1">Цільовий профіль безпеки</h3>
              <ScrollArea className="h-auto max-h-[200px] w-full rounded-md border p-0 print:h-auto print:border-none print:p-0">
                {targetProfileForDisplay ? (
                    <Table className="text-xs">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Цільові Ідентифікатори</TableHead>
                                <TableHead>Бажаний рівень впровадження</TableHead>
                                <TableHead>Застос. до ПЗ</TableHead>
                                <TableHead>Застос. до Обладнання</TableHead>
                                <TableHead>Застос. до Інфо.Ресурсів</TableHead>
                                <TableHead>Застос. до Засобів ІКЗ</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell>{targetProfileForDisplay.identifiers.map(id => id.value).join(', ')}</TableCell>
                                <TableCell>{targetProfileForDisplay.implementationLevel}</TableCell>
                                <TableCell>{targetProfileForDisplay.appliesToSoftware ? 'Так' : 'Ні'}</TableCell>
                                <TableCell>{targetProfileForDisplay.appliesToHardware ? 'Так' : 'Ні'}</TableCell>
                                <TableCell>{targetProfileForDisplay.appliesToInformationResource ? 'Так' : 'Ні'}</TableCell>
                                <TableCell>{targetProfileForDisplay.appliesToIcsTool ? 'Так' : 'Ні'}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                ) : <p className="text-sm text-muted-foreground p-3">Інформація не надана.</p>}
              </ScrollArea>
            </section>

            <Separator className="my-6" />
            
            <section>
              <h3 className="text-xl font-headline mb-2 border-b pb-1">Аналіз Розривів та Рекомендації</h3>
                <div className="text-sm p-3 rounded-md border bg-muted/20">
                    <p className="whitespace-pre-wrap">
                    На основі порівняння Поточного та Цільового профілів безпеки, визначте необхідні заходи для досягнення цілей.
                    Цей розділ призначений для ручного заповнення або документування стратегії покращення.
                    </p>
                    <p className="mt-2 whitespace-pre-wrap">
                    Наприклад:
                    Для досягнення ідентифікатора(ів) [{targetProfileForDisplay?.identifiers.map(id => id.value).join(', ') || 'Цільові Ідентифікатори'}]:
                    - Необхідно впровадити/покращити наступні засоби ІКЗ: [Перелік засобів]
                    - Необхідно усунути/мінімізувати наступні загрози: [Перелік загроз з Поточного профілю, що не відповідають цілям]
                    - Необхідно застосувати додаткові контролі до активів: [Перелік активів та контролів]
                    </p>
                </div>
            </section>
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
    

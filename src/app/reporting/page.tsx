
"use client";

import * as React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import type { Asset } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, FileText, Download, PlusCircle, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';


const implementationStatusOptions = ["Реалізовано", "Не реалізовано", "Частково реалізовано", "Не застосовується"] as const;
const implementationLevelOptions = ["1", "2", "3", "4"] as const;

type AssetCategoryKey = 'software' | 'hardware' | 'informationResource' | 'icsTool';


const threatDetailsMap: Record<string, { identifier: string; vulnerability: string; ttp: string; affectedAssetTypes: AssetCategoryKey[] }> = {
  "Викрадення персональних та державних даних": {
    identifier: "ID.AM-3",
    vulnerability: "CVE-2020-0796 (SMBGhost)",
    ttp: "Використання експлойта для обходу автентифікації та доступу до файлової системи.",
    affectedAssetTypes: ["software", "informationResource"],
  },
  "Несанкціоноване змінення інформації у базі даних": {
    identifier: "ID.AM-3",
    vulnerability: "CVE-2019-8451 (Microsoft SQL Server)",
    ttp: "Використання автоматизованих скриптів для масового виконання SQL-ін'єкцій.",
    affectedAssetTypes: ["software", "informationResource"],
  },
  "Викрадення сесій та облікових даних користувачів": {
    identifier: "ID.AM-3",
    vulnerability: "CVE-2018-1000525 (Drupal XSS)",
    ttp: "Перехоплення НТТР-трафіку для отримання сесійних токенів.",
    affectedAssetTypes: ["software", "informationResource"],
  },
  "Отримання прав адміністратора": {
    identifier: "ID.AM-2",
    vulnerability: "CVE-2020-0601 (Windows CryptoAPI)",
    ttp: "Виконання локального експлойта для підвищення привілеїв.",
    affectedAssetTypes: ["software", "hardware"],
  },
  "Перенаправлення користувачів на підроблений сайт": {
    identifier: "ID.AM-5",
    vulnerability: "CVE-2021-21972 (VMware vCenter)",
    ttp: "Фішинг, створення підроблених сайтів, збір облікових даних користувачів.",
    affectedAssetTypes: ["software"],
  },
  "Відмова в обслуговуванні через блокування DNS": {
    identifier: "ID.AM-1",
    vulnerability: "CVE-2016-5696 (Linux Kernel TCP Spoofing)",
    ttp: "Відправлення спеціально сформованих НТТР-запитів для запуску шкідливого коду.",
    affectedAssetTypes: ["hardware", "software"],
  },
  "Виконання довільного коду через RCE": {
    identifier: "ID.AM-2",
    vulnerability: "CVE-2017-0144 (EternalBlue SMBv1)",
    ttp: "Віддалене виконання коду, встановлення бекдорів, контроль над сервером.",
    affectedAssetTypes: ["software", "hardware"],
  },
  "Фальсифікація результатів експертизи": {
    identifier: "ID.AM-3",
    vulnerability: "CVE-2019-0708 (RDP BlueKeep)",
    ttp: "Впровадження фальшивих результатів через АРІ системи.",
    affectedAssetTypes: ["software", "informationResource"],
  },
  "Повторні запити і підміна даних заяв": {
    identifier: "ID.AM-3",
    vulnerability: "CVE-2020-1472 (Netlogon Elevation of Privilege)",
    ttp: "Використання автоматизованих ботів для масового подання фальшивих заяв.",
    affectedAssetTypes: ["software", "informationResource"],
  },
  "Викрадення сесійних токенів": {
    identifier: "ID.AM-3",
    vulnerability: "CVE-2019-11043 (PHP-FPM)",
    ttp: "Викрадення токенів через впровадження XSS-скриптів.",
    affectedAssetTypes: ["software", "informationResource"],
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

const identifierRecommendations: Record<string, { title: string; measures: string[] }> = {
  "ID.AM-1": {
    title: "Фізичні пристрої і системи ідентифіковані",
    measures: [
      "Впровадження централізованої системи управління інвентаризацією ІТ-активів (наприклад, CMDB, ITAM)",
      "Впровадження систем контролю доступу до фізичних приміщень (баджі, біометрія)",
      "Встановлення систем моніторингу і відеоспостереження",
      "Використання систем автоматичного виявлення і відстеження пристроїв у мережі (наприклад, NAC — Network Access Control)",
      "Регулярні аудити інвентаризації активів",
      "Обмеження фізичного доступу до серверних і робочих станцій",
    ],
  },
  "ID.AM-2": {
    title: "Програмне забезпечення ідентифіковане",
    measures: [
      "Ведення актуального реєстру встановленого програмного забезпечення (Software Asset Management)",
      "Використання систем виявлення незатвердженого ПЗ (Whitelisting, Blacklisting)",
      "Використання систем централізованого управління оновленнями (наприклад, WSUS, SCCM)",
      "Впровадження політик безпеки, що забороняють встановлення ПЗ без затвердження",
      "Регулярні сканування на наявність вразливостей в ПЗ (Vulnerability Scanning)",
      "Впровадження процесів управління змінами (Change Management)",
    ],
  },
  "ID.AM-3": {
    title: "Логічні інтерфейси мережі і систем ідентифіковані і документовані",
    measures: [
      "Ведення мережевої документації (Network Diagrams, IP-адресація, VLAN, маршрутизація)",
      "Використання систем моніторингу мережевого трафіку (наприклад, IDS/IPS, NetFlow)",
      "Впровадження автоматизованих систем управління конфігурацією мережевого обладнання (Network Configuration Management)",
      "Застосування систем контролю доступу до мережі (NAP, NAC)",
      "Регулярне проведення аудиту і верифікації мережевої інфраструктури",
      "Впровадження систем контролю і логування мережевих подій",
    ],
  },
  "ID.AM-5": {
    title: "Визначені властивості конфіденційності, цілісності, доступності активів",
    measures: [
      "Розробка та впровадження політик безпеки інформації (Information Security Policies)",
      "Визначення категорій інформації за рівнем конфіденційності",
      "Впровадження засобів захисту даних (шифрування, контроль доступу, DLP — Data Loss Prevention)",
      "Резервне копіювання і відновлення даних (Backup & Recovery)",
      "Впровадження засобів забезпечення цілісності (контрольні суми, цифрові підписи)",
      "Забезпечення доступності за допомогою систем відмовостійкості, балансування навантаження, моніторингу",
      "Регулярне тестування безпеки (penetration testing, vulnerability assessment)",
    ],
  },
};


const singleCurrentProfileThreatSchema = z.object({
  id: z.string(),
  selectedRisk: z.string().min(1, "Необхідно обрати загрозу"),
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
  comment: '',
};

const defaultTargetIdentifierValue = { id: Date.now().toString(), value: 'ID.AM-3.Target' };

const renderRecommendationsSection = (
    currentProfileData: ReportPageFormValues['currentProfileDetails'],
    targetProfileData: ReportPageFormValues['targetProfileDetails']
) => {
    if (!targetProfileData || targetProfileData.identifiers.length === 0) {
        return <p className="text-sm text-black">Цільові ідентифікатори не вказані.</p>;
    }

    return targetProfileData.identifiers.map(targetIdObj => {
        const baseId = targetIdObj.value.replace(/\.Target$/, '').trim();
        const recommendation = identifierRecommendations[baseId];
        const relevantCurrentThreats = currentProfileData.filter(
            threat => threat.identifier === baseId
        );

        return (
            <div key={targetIdObj.id} className="mb-6 p-4 border rounded-md border-black bg-white">
                <h4 className="text-lg font-semibold mb-2 text-black">
                    Рекомендації для досягнення: {targetIdObj.value}
                </h4>
                {recommendation ? (
                    <>
                        <p className="font-medium mb-1 text-black"><strong>Рекомендовані засоби та заходи:</strong></p>
                        <ul className="list-disc list-inside text-sm space-y-1 mb-3 text-black">
                            {recommendation.measures.map((measure, index) => (
                                <li key={index}>{measure}</li>
                            ))}
                        </ul>
                    </>
                ) : (
                    <p className="text-sm mb-3 text-black">
                        Для ідентифікатора "{targetIdObj.value}" немає попередньо визначених рекомендацій.
                    </p>
                )}

                {relevantCurrentThreats.length > 0 && (
                    <>
                        <p className="mb-1 text-black"><strong>Пов'язані загрози з поточного профілю, що потребують уваги для досягнення "{baseId}":</strong></p>
                        <ul className="list-disc list-inside text-sm space-y-1 text-black">
                            {relevantCurrentThreats.map(threat => {
                                const affectedAssetsList = [
                                    threat.software && threat.software !== '-' && `ПЗ: ${threat.software}`,
                                    threat.hardware && threat.hardware !== '-' && `Обладнання: ${threat.hardware}`,
                                    threat.informationResource && threat.informationResource !== '-' && `Інформаційний ресурс: ${threat.informationResource}`,
                                    threat.icsTool && icsToolOptionsList.find(opt => opt.value === threat.icsTool)?.label || threat.icsTool,
                                ].filter(Boolean);
                                
                                const affectedAssetsString = affectedAssetsList.length > 0 ? ` Активи: ${affectedAssetsList.join('; ')}.` : ' Активи не вказані або нерелевантні.';

                                return (
                                    <li key={threat.id}>
                                        Загроза: "{threat.selectedRisk}" (Вразливість: {threat.vulnerabilityDescription}).
                                        {affectedAssetsString}
                                    </li>
                                );
                            })}
                        </ul>
                    </>
                )}
                {relevantCurrentThreats.length === 0 && recommendation && (
                    <p className="text-sm text-black">
                        Загроз з поточного профілю, що прямо відповідають ідентифікатору "{baseId}", не знайдено. Перегляньте загальний список загроз.
                    </p>
                )}
                 {!recommendation && relevantCurrentThreats.length === 0 && (
                    <p className="text-sm text-black">
                        Для цього цільового ідентифікатора не визначено ані специфічних рекомендацій, ані пов'язаних поточних загроз.
                    </p>
                )}
            </div>
        );
    });
};


const PrintableReport = React.forwardRef<HTMLDivElement, {
  currentProfileData: ReportPageFormValues['currentProfileDetails'];
  targetProfileData: ReportPageFormValues['targetProfileDetails'];
}>(({ currentProfileData, targetProfileData }, ref) => {
  return (
    <div ref={ref} className="p-8 font-sans bg-white text-black">
      <header className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2 text-black">Звіт про безпеку "КіберСтраж"</h1>
        <p className="text-sm text-black">Згенеровано: {new Date().toLocaleDateString('uk-UA', { year: 'numeric', month: 'long', day: 'numeric' })} {new Date().toLocaleTimeString('uk-UA')}</p>
      </header>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-3 border-b-2 border-black pb-2 text-black">1. Поточний профіль безпеки</h2>
        {currentProfileData && currentProfileData.length > 0 ? (
          <Table className="text-xs">
            <TableHeader>
              <TableRow>
                <TableHead className="text-black border-black border">Загроза</TableHead>
                <TableHead className="text-black border-black border">Вразливість</TableHead>
                <TableHead className="text-black border-black border">ТТП</TableHead>
                <TableHead className="text-black border-black border">ID</TableHead>
                <TableHead className="text-black border-black border">ПЗ</TableHead>
                <TableHead className="text-black border-black border">Обладнання</TableHead>
                <TableHead className="text-black border-black border">Інфо.Рес.</TableHead>
                <TableHead className="text-black border-black border">Засіб ІКЗ</TableHead>
                <TableHead className="text-black border-black border">Статус</TableHead>
                <TableHead className="text-black border-black border">Рівень</TableHead>
                <TableHead className="text-black border-black border">Коментар</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentProfileData.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="max-w-[120px] break-words text-black border-black border">{item.selectedRisk}</TableCell>
                  <TableCell className="max-w-[120px] break-words text-black border-black border">{item.vulnerabilityDescription}</TableCell>
                  <TableCell className="max-w-[120px] break-words text-black border-black border">{item.ttpDescription}</TableCell>
                  <TableCell className="text-black border-black border">{item.identifier}</TableCell>
                  <TableCell className="text-black border-black border">{item.software}</TableCell>
                  <TableCell className="text-black border-black border">{item.hardware}</TableCell>
                  <TableCell className="text-black border-black border">{item.informationResource}</TableCell>
                  <TableCell className="max-w-[100px] break-words text-black border-black border">{icsToolOptionsList.find(opt => opt.value === item.icsTool)?.label || item.icsTool}</TableCell>
                  <TableCell className="text-black border-black border">{item.implementationStatus}</TableCell>
                  <TableCell className="text-black border-black border">{item.implementationLevel}</TableCell>
                  <TableCell className="max-w-[120px] break-words text-black border-black border">{item.comment}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : <p className="text-sm text-black">Інформація не надана.</p>}
      </section>

      <section className="mb-8 page-break-before">
        <h2 className="text-2xl font-semibold mb-3 border-b-2 border-black pb-2 text-black">2. Цільовий профіль безпеки</h2>
         {targetProfileData ? (
            <Table className="text-xs">
                 <TableHeader>
                    <TableRow>
                        <TableHead className="text-black border-black border">Цільові Ідентифікатори</TableHead>
                        <TableHead className="text-black border-black border">Бажаний рівень впровадження</TableHead>
                        <TableHead className="text-black border-black border">Застосовується до ПЗ</TableHead>
                        <TableHead className="text-black border-black border">Застосовується до Обладнання</TableHead>
                        <TableHead className="text-black border-black border">Застосовується до Інфо.Ресурсів</TableHead>
                        <TableHead className="text-black border-black border">Застосовується до Засобів ІКЗ</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow>
                        <TableCell className="text-black border-black border">{targetProfileData.identifiers.map(id => id.value).join(', ')}</TableCell>
                        <TableCell className="text-black border-black border">{targetProfileData.implementationLevel}</TableCell>
                        <TableCell className="text-black border-black border">{targetProfileData.appliesToSoftware ? 'Так' : 'Ні'}</TableCell>
                        <TableCell className="text-black border-black border">{targetProfileData.appliesToHardware ? 'Так' : 'Ні'}</TableCell>
                        <TableCell className="text-black border-black border">{targetProfileData.appliesToInformationResource ? 'Так' : 'Ні'}</TableCell>
                        <TableCell className="text-black border-black border">{targetProfileData.appliesToIcsTool ? 'Так' : 'Ні'}</TableCell>
                    </TableRow>
                </TableBody>
            </Table>
         ) : <p className="text-sm text-black">Інформація не надана.</p>}
      </section>
      
      <section className="mb-8 page-break-before">
        <h2 className="text-2xl font-semibold mb-3 border-b-2 border-black pb-2 text-black">3. Аналіз Розривів та Рекомендації</h2>
        {renderRecommendationsSection(currentProfileData, targetProfileData)}
      </section>
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

  const { toast } = useToast();
  const reportPrintRef = useRef<HTMLDivElement>(null);

  const handleDirectDownloadPdf = async () => {
    const element = reportPrintRef.current;
    if (!element) {
      toast({ title: "Помилка", description: "Не вдалося знайти контент звіту для завантаження.", variant: "destructive" });
      return;
    }
    setIsGeneratingReport(true);
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4', true);
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const ratio = canvasWidth / canvasHeight;
      
      let imgHeight = pdfWidth / ratio;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = -imgHeight + heightLeft + (imgHeight - pdfHeight);
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pdfHeight;
      }
      
      pdf.save(`Звіт_КіберСтраж_${new Date().toISOString().split('T')[0]}.pdf`);
      toast({ title: "Успіх", description: "PDF звіт завантажено." });
    } catch (error) {
      console.error("Error generating PDF: ", error);
      toast({ title: "Помилка", description: "Не вдалося згенерувати PDF.", variant: "destructive" });
    } finally {
      setIsGeneratingReport(false);
    }
  };

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


 const getFirstAvailableAsset = (assetOptions: string[]): string => {
    const firstRealAsset = assetOptions.find(opt => !baseAssetOptions.includes(opt as any));
    return firstRealAsset || '-';
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
      
      const autoSelectOrDash = (assetType: AssetCategoryKey, options: string[]) => {
        if (!isOther && !affected.includes(assetType)) {
          return '-';
        }
        return getFirstAvailableAsset(options);
      };

      form.setValue(`${pathPrefix}.software`, autoSelectOrDash('software', softwareAssetOptions), { shouldDirty: true });
      form.setValue(`${pathPrefix}.hardware`, autoSelectOrDash('hardware', hardwareAssetOptions), { shouldDirty: true });
      form.setValue(`${pathPrefix}.informationResource`, autoSelectOrDash('informationResource', informationResourceAssetOptions), { shouldDirty: true });
      
      // Don't auto-select ICS tool, let user choose.
      if (!isOther && !affected.includes('icsTool')) {
        form.setValue(`${pathPrefix}.icsTool`, '-', { shouldDirty: true });
      }

    } else { 
        form.setValue(`${pathPrefix}.identifier`, 'N/A', { shouldDirty: true });
        form.setValue(`${pathPrefix}.vulnerabilityDescription`, '', { shouldDirty: true });
        form.setValue(`${pathPrefix}.ttpDescription`, '', { shouldDirty: true });
        form.setValue(`${pathPrefix}.software`, '-', { shouldDirty: true });
        form.setValue(`${pathPrefix}.hardware`, '-', { shouldDirty: true });
        form.setValue(`${pathPrefix}.informationResource`, '-', { shouldDirty: true });
        form.setValue(`${pathPrefix}.icsTool`, '-', { shouldDirty: true });
    }
  };
  
  const handleGenerateReport = async (values: ReportPageFormValues) => {
    setIsGeneratingReport(true);
    setCurrentProfileForDisplay(values.currentProfileDetails);
    setTargetProfileForDisplay(values.targetProfileDetails);
    setReportGenerated(true);
    setIsGeneratingReport(false);
    toast({ title: "Успіх", description: "Звіт успішно згенеровано. Натисніть 'Завантажити PDF'." });
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
        Активи (ПЗ, Обладнання, Інфо.Ресурс) підтягуються з Реєстру активів і можуть бути автоматично обрані або деактивовані для вибору, якщо нерелевантні для обраної загрози.
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
                        
                        const getAsset = (assetType: AssetCategoryKey, options: string[]) => {
                           if (!newRiskDetails.affectedAssetTypes.includes(assetType)) return '-';
                           return getFirstAvailableAsset(options);
                        }

                        const newThreatToAdd: SingleCurrentProfileThreatValues = {
                            id: Date.now().toString(),
                            selectedRisk: newRiskKey,
                            identifier: newRiskDetails.identifier,
                            vulnerabilityDescription: newRiskDetails.vulnerability,
                            ttpDescription: newRiskDetails.ttp,
                            implementationStatus: 'Реалізовано',
                            implementationLevel: '3',
                            software: getAsset('software', softwareAssetOptions),
                            hardware: getAsset('hardware', hardwareAssetOptions),
                            informationResource: getAsset('informationResource', informationResourceAssetOptions),
                            icsTool: '-', 
                            comment: '', 
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
                  Примітка: Для отримання PDF, після генерації звіту натисніть "Завантажити PDF".
                </p>
              </CardFooter>
            </form>
          </Form>
        </Card>
      ) : null}

      {reportGenerated && currentProfileForDisplay && targetProfileForDisplay && (
        <>
        <div className="flex justify-end gap-2 mb-4 print:hidden">
            <Button variant="outline" onClick={() => { setReportGenerated(false); setCurrentProfileForDisplay(null); setTargetProfileForDisplay(null); fetchAssetsForReport(); form.reset({ currentProfileDetails: [defaultThreatValues], targetProfileDetails: { identifiers: [defaultTargetIdentifierValue], implementationLevel: '4', appliesToSoftware: true, appliesToHardware: true, appliesToInformationResource: true, appliesToIcsTool: true } }); }}>
                Створити новий звіт / Редагувати
            </Button>
            <Button onClick={handleDirectDownloadPdf} disabled={isGeneratingReport}>
                {isGeneratingReport && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Download className="mr-2 h-4 w-4" /> Завантажити PDF 
            </Button>
        </div>

        <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: '210mm' }}> 
          <PrintableReport
            ref={reportPrintRef}
            currentProfileData={currentProfileForDisplay}
            targetProfileData={targetProfileForDisplay}
          />
        </div>

        <Card className="p-6 print:shadow-none print:border-none" id="report-content-display">
          <CardHeader className="text-center print:pb-2">
            <h2 className="text-2xl font-headline text-primary print:text-xl print:text-black">Звіт про безпеку "КіберСтраж"</h2>
            <CardDescription className="print:text-xs print:text-gray-500">Згенеровано: {new Date().toLocaleDateString('uk-UA')} {new Date().toLocaleTimeString('uk-UA')}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <section>
              <h3 className="text-xl font-headline mb-2 border-b pb-1 print:text-lg print:border-gray-400 print:text-black">Поточний профіль безпеки</h3>
              <ScrollArea className="h-auto max-h-[400px] w-full rounded-md border p-0 print:h-auto print:max-h-none print:border-none print:p-0">
                {currentProfileForDisplay && currentProfileForDisplay.length > 0 ? (
                 <Table className="text-xs print:text-[9px]">
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
                ) : <p className="text-sm text-muted-foreground p-3 print:text-gray-500">Інформація не надана.</p>}
              </ScrollArea>
            </section>

            <Separator className="my-6 print:my-3" />

            <section>
              <h3 className="text-xl font-headline mb-2 border-b pb-1 print:text-lg print:border-gray-400 print:text-black">Цільовий профіль безпеки</h3>
              <ScrollArea className="h-auto max-h-[200px] w-full rounded-md border p-0 print:h-auto print:max-h-none print:border-none print:p-0">
                {targetProfileForDisplay ? (
                    <Table className="text-xs print:text-[9px]">
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
                ) : <p className="text-sm text-muted-foreground p-3 print:text-gray-500">Інформація не надана.</p>}
              </ScrollArea>
            </section>

            <Separator className="my-6 print:my-3" />
            
            <section className="print:break-before-page">
              <h3 className="text-xl font-headline mb-2 border-b pb-1 print:text-lg print:border-gray-400 print:text-black">Аналіз Розривів та Рекомендації</h3>
                <div className="text-sm">
                    {renderRecommendationsSection(currentProfileForDisplay, targetProfileForDisplay)}
                </div>
            </section>
          </CardContent>
          <CardFooter className="print:hidden">
            
          </CardFooter>
        </Card>
        </>
      )}
    </div>
  );
}
    

    

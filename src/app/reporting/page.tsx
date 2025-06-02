
"use client";

import { useState, useEffect } from 'react';
import { getSecurityRecommendations, SecurityRecommendationsInput, SecurityRecommendationsOutput } from '@/ai/flows/security-advisor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, FileText, Printer, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

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
  "Несанкціонований доступ до бази користувачів": { // Updated from "Несанкціонований доступ до даних"
    identifier: 'ID.AM-3', software: 'Власна CRM система', hardware: 'Пошта сервер', informationResource: 'База даних клієнтів', icsTool: 'WAF ModSecurity',
  },
  "Шкідливе програмне забезпечення": {
    identifier: 'ID.AM-1', software: 'Антивірусне ПЗ', hardware: 'Робочі станції', informationResource: '-', icsTool: 'Система виявлення вторгнень (IDS)',
  },
  "Фішинг": {
    identifier: 'ID.AM-2', software: '-', hardware: '-', informationResource: 'Облікові дані користувачів', icsTool: 'Фільтр електронної пошти',
  },
  "DoS-атака на портал": { // Updated from "Відмова в обслуговуванні (DoS/DDoS)"
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


const currentProfileDetailsSchema = z.object({
  identifier: z.string().optional(),
  implementationStatus: z.string().optional(),
  implementationLevel: z.string().optional(),
  comment: z.string().optional(),
  relatedThreat: z.string().optional(),
  threatDescription: z.string().optional(),
  ttpDescription: z.string().optional(),
  software: z.string().optional(),
  hardware: z.string().optional(),
  informationResource: z.string().optional(),
  icsTool: z.string().optional(),
});

const targetProfileDetailsSchema = z.object({
  identifier: z.string().optional(),
  implementationLevel: z.string().optional(),
  appliesToSoftware: z.boolean().optional().default(false),
  appliesToHardware: z.boolean().optional().default(false),
  appliesToInformationResource: z.boolean().optional().default(false),
  appliesToIcsTool: z.boolean().optional().default(false),
});

const reportPageFormSchema = z.object({
  currentProfileDetails: currentProfileDetailsSchema,
  targetProfileDetails: targetProfileDetailsSchema,
});

type ReportPageFormValues = z.infer<typeof reportPageFormSchema>;

const formatCurrentProfileDataToString = (data: z.infer<typeof currentProfileDetailsSchema>): string => {
  let summary = `Поточний профіль безпеки:\n`;
  if (data.identifier) summary += `- Ідентифікатор: ${data.identifier}\n`;
  if (data.implementationStatus) summary += `- Статус реалізації: ${data.implementationStatus}\n`;
  if (data.implementationLevel) summary += `- Рівень впровадження: ${data.implementationLevel}\n`;
  if (data.relatedThreat) summary += `- Пов'язана загроза: ${data.relatedThreat}\n`;
  if (data.software && data.software !== '-') summary += `- Програмне забезпечення: ${data.software}\n`;
  if (data.hardware && data.hardware !== '-') summary += `- Апаратне забезпечення: ${data.hardware}\n`;
  if (data.informationResource && data.informationResource !== '-') summary += `- Інформаційний ресурс: ${data.informationResource}\n`;
  if (data.icsTool && data.icsTool !== '-') summary += `- Засіб ІКЗ: ${data.icsTool}\n`;
  if (data.threatDescription) summary += `- Опис загрози: ${data.threatDescription}\n`;
  if (data.ttpDescription) summary += `- Опис ТТР: ${data.ttpDescription}\n`;
  if (data.comment && data.comment.trim() !== '') summary += `- Загальний коментар / Додаткова інформація:\n${data.comment.split('\n').map(line => `  ${line}`).join('\n')}\n`;
  
  if (summary.trim() === `Поточний профіль безпеки:`) {
    summary += "- Інформація не надана\n";
  }
  return summary.trim();
};

const formatTargetProfileDataToString = (data: z.infer<typeof targetProfileDetailsSchema>): string => {
  let summary = `Цільовий профіль безпеки:\n`;
  if (data.identifier) summary += `- Ідентифікатор: ${data.identifier}\n`;
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
        implementationLevel: '3',
        relatedThreat: 'Несанкціонований доступ до бази користувачів',
        software: 'Власна CRM система',
        hardware: 'Пошта сервер',
        informationResource: 'База даних клієнтів',
        icsTool: 'WAF ModSecurity',
        threatDescription: 'Недостатній контроль доступу до баз даних користувачів.',
        ttpDescription: 'OWASP A5 - Broken Access Control: відсутність або обхід обмежень на доступ до об\'єктів.',
        comment: 'Кінцеві точки мають базовий антивірус, але немає рішення EDR.\nПравила брандмауера керуються вручну та рідко оновлюються.\nНавчання співробітників з безпеки востаннє проводилося 2 роки тому.\nБагатофакторна автентифікація застосовується лише для облікових записів адміністраторів.',
      },
      targetProfileDetails: {
        identifier: 'ID.AM-3 Target',
        implementationLevel: '4',
        appliesToSoftware: true,
        appliesToHardware: true,
        appliesToInformationResource: true,
        appliesToIcsTool: true,
      },
    },
  });

  const currentRelatedThreat = useWatch({
    control: form.control,
    name: 'currentProfileDetails.relatedThreat',
  });

  useEffect(() => {
    if (currentRelatedThreat) {
      const config = threatConfigurations[currentRelatedThreat] || threatConfigurations["Інше"];
      form.setValue('currentProfileDetails.identifier', config.identifier);
      form.setValue('currentProfileDetails.software', config.software);
      form.setValue('currentProfileDetails.hardware', config.hardware);
      form.setValue('currentProfileDetails.informationResource', config.informationResource);
      form.setValue('currentProfileDetails.icsTool', config.icsTool);
    }
  }, [currentRelatedThreat, form]);

  const handleGenerateReport = async (values: ReportPageFormValues) => {
    setIsLoading(true);
    setError(null);
    setRecommendations(null);
    setReportGenerated(false);

    const currentProfileString = formatCurrentProfileDataToString(values.currentProfileDetails);
    const targetProfileString = formatTargetProfileDataToString(values.targetProfileDetails);
    
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

  const renderCurrentProfileFields = () => (
    <div className="space-y-4 p-4 border rounded-md bg-card shadow-sm">
      <h3 className="text-lg font-medium text-primary">Поточний профіль безпеки</h3>
      <FormField
        control={form.control}
        name="currentProfileDetails.relatedThreat"
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
        name="currentProfileDetails.identifier"
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
        name="currentProfileDetails.software"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Програмне забезпечення</FormLabel>
            <Select onValueChange={field.onChange} value={field.value || '-'}>
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
        name="currentProfileDetails.hardware"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Апаратне забезпечення</FormLabel>
            <Select onValueChange={field.onChange} value={field.value || '-'}>
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
        name="currentProfileDetails.informationResource"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Інформаційний ресурс</FormLabel>
            <Select onValueChange={field.onChange} value={field.value || '-'}>
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
        name="currentProfileDetails.icsTool"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Засіб ІКЗ</FormLabel>
            <Select onValueChange={field.onChange} value={field.value || '-'}>
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
        name="currentProfileDetails.implementationStatus"
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
        name="currentProfileDetails.implementationLevel"
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
        name="currentProfileDetails.threatDescription"
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
        name="currentProfileDetails.ttpDescription"
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
        name="currentProfileDetails.comment"
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

  const renderTargetProfileFields = () => (
    <div className="space-y-4 p-4 border rounded-md bg-card shadow-sm">
      <h3 className="text-lg font-medium text-primary">Цільовий профіль безпеки</h3>
      <FormField
        control={form.control}
        name="targetProfileDetails.identifier"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Ідентифікатор (напр., ID.AM-3 Target)</FormLabel>
            <FormControl><Input placeholder="Введіть ідентифікатор..." {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
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
                {renderCurrentProfileFields()}
                {renderTargetProfileFields()}
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
    

    

"use client";

import { useState, useEffect, useCallback } from 'react';
import type { Asset, Weakness } from '@/lib/types';
import { weaknessSeverities } from '@/lib/types'; // Removed assetTypes as it's not directly used here anymore
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { PlusCircle, Edit3, Trash2, ShieldAlert, ListChecks, Server, Laptop, Database, Loader2 } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, arrayUnion, arrayRemove, writeBatch } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";

const displayCategoryMap = {
  'Апаратні засоби': 'Обладнання',
  'Програмне забезпечення': 'Програмне забезпечення',
  'Інформаційні ресурси': 'Інформація',
} as const;
type DisplayCategoryKey = keyof typeof displayCategoryMap;
const categoryKeys = Object.keys(displayCategoryMap) as DisplayCategoryKey[];

const assetFormSchema = z.object({
  name: z.string().min(1, "Назва обов'язкова"),
  type: z.enum(Object.values(displayCategoryMap) as [Asset['type'], ...Asset['type'][]]),
  description: z.string().min(1, "Опис обов'язковий"),
});

const weaknessFormSchema = z.object({
  description: z.string().min(1, "Опис обов'язковий"),
  severity: z.enum(weaknessSeverities),
});

const categoryIcons: Record<DisplayCategoryKey, React.ElementType> = {
  'Апаратні засоби': Server,
  'Програмне забезпечення': Laptop,
  'Інформаційні ресурси': Database,
};

const seedInitialAssets = async () => {
  const batch = writeBatch(db);
  const assetsCollectionRef = collection(db, 'assets');

  const initialAssetsData: Omit<Asset, 'id'>[] = [
    // Активи програмного забезпечення (Software Assets)
    {
      name: "Операційна система Windows Server",
      type: "Програмне забезпечення",
      description: "ОС для серверів, що забезпечує роботу корпоративних сервісів та додатків.",
      weaknesses: [
        { id: "seed_w_ps_1", assetId: "AUTO_ID", description: "Невчасне встановлення критичних оновлень безпеки ОС.", severity: "Висока" }
      ]
    },
    {
      name: "Антивірусне ПЗ Avast",
      type: "Програмне забезпечення",
      description: "Програмне забезпечення для захисту від вірусів, шпигунського ПЗ та інших шкідливих програм.",
      weaknesses: [
        { id: "seed_w_ps_2", assetId: "AUTO_ID", description: "Використання застарілих баз вірусних сигнатур, що знижує ефективність виявлення нових загроз.", severity: "Середня" }
      ]
    },
    {
      name: "Система управління базами даних PostgreSQL",
      type: "Програмне забезпечення",
      description: "Реляційна СУБД для зберігання, управління та доступу до корпоративних даних.",
      weaknesses: [
        { id: "seed_w_ps_3", assetId: "AUTO_ID", description: "Пароль за замовчуванням для облікового запису адміністратора бази даних не змінено.", severity: "Критична" }
      ]
    },
    {
      name: "Веб-сервер Nginx",
      type: "Програмне забезпечення",
      description: "Високопродуктивний веб-сервер та зворотний проксі-сервер для розгортання веб-додатків.",
      weaknesses: [
        { id: "seed_w_ps_4", assetId: "AUTO_ID", description: "Не налаштовано HTTPS, що призводить до передачі трафіку у відкритому вигляді.", severity: "Висока" }
      ]
    },
    {
      name: "Система моніторингу Wazuh",
      type: "Програмне забезпечення",
      description: "Open-source платформа для моніторингу безпеки, виявлення вторгнень та аналізу логів.",
      weaknesses: [
        { id: "seed_w_ps_5", assetId: "AUTO_ID", description: "Відсутність налаштованих сповіщень для критичних подій безпеки, виявлених системою.", severity: "Середня" }
      ]
    },

    // Активи апаратного забезпечення (Hardware Assets)
    {
      name: "Сервер Dell PowerEdge R740",
      type: "Обладнання",
      description: "Фізичний сервер, призначений для обробки корпоративних додатків та зберігання даних.",
      weaknesses: [
        { id: "seed_w_az_1", assetId: "AUTO_ID", description: "Фізичний доступ до серверної кімнати недостатньо обмежений та контрольований.", severity: "Висока" }
      ]
    },
    {
      name: "Маршрутизатор Cisco ISR 4451",
      type: "Обладнання",
      description: "Мережевий пристрій для маршрутизації трафіку між різними сегментами мережі та до Інтернету.",
      weaknesses: [
        { id: "seed_w_az_2", assetId: "AUTO_ID", description: "Стандартні облікові дані (логін/пароль) для доступу до інтерфейсу керування маршрутизатором не змінені.", severity: "Критична" }
      ]
    },
    {
      name: "Робоча станція Dell OptiPlex 7080",
      type: "Обладнання",
      description: "Персональний комп'ютер, що використовується співробітником для виконання робочих завдань.",
      weaknesses: [
        { id: "seed_w_az_3", assetId: "AUTO_ID", description: "Відсутність шифрування жорсткого диска на робочій станції, що містить конфіденційну інформацію.", severity: "Середня" }
      ]
    },
    {
      name: "Мережевий комутатор HP Aruba 2930F",
      type: "Обладнання",
      description: "Комутатор для об'єднання пристроїв у локальній мережі та забезпечення передачі даних між ними.",
      weaknesses: [
        { id: "seed_w_az_4", assetId: "AUTO_ID", description: "Невикористані фізичні порти комутатора не вимкнені, що створює потенційні точки несанкціонованого підключення.", severity: "Низька" }
      ]
    },
    {
      name: "Система безперебійного живлення APC Smart-UPS",
      type: "Обладнання",
      description: "Джерело безперебійного живлення для забезпечення стабільної роботи серверів під час відключень електроенергії.",
      weaknesses: [
        { id: "seed_w_az_5", assetId: "AUTO_ID", description: "Відсутність регулярного тестування стану батарей та працездатності системи UPS.", severity: "Середня" }
      ]
    },

    // Активи інформаційних ресурсів (Information Assets)
    {
      name: "База клієнтських даних CRM",
      type: "Інформація",
      description: "Структурована інформація про клієнтів організації, їхні контакти, історію взаємодій та замовлень.",
      weaknesses: [
        { id: "seed_w_ir_1", assetId: "AUTO_ID", description: "Відсутність шифрування конфіденційних персональних даних клієнтів у базі даних CRM.", severity: "Висока" }
      ]
    },
    {
      name: "Шаблони офіційних документів",
      type: "Інформація",
      description: "Стандартні шаблони для створення офіційних документів компанії (договори, звіти, накази тощо).",
      weaknesses: [
        { id: "seed_w_ir_2", assetId: "AUTO_ID", description: "Відсутність контролю версій та аудиту змін для офіційних шаблонів документів.", severity: "Середня" }
      ]
    },
    {
      name: "Журнали фізичного доступу до приміщень",
      type: "Інформація",
      description: "Записи про фізичний доступ співробітників та відвідувачів до контрольованих приміщень компанії.",
      weaknesses: [
        { id: "seed_w_ir_3", assetId: "AUTO_ID", description: "Зберігання паперових журналів фізичного доступу в незахищеному місці, доступному для сторонніх осіб.", severity: "Середня" }
      ]
    },
    {
      name: "Цифрові облікові дані доступу",
      type: "Інформація",
      description: "Набори логінів, паролів, токенів та сертифікатів, що використовуються для автентифікації в корпоративних системах.",
      weaknesses: [
        { id: "seed_w_ir_4", assetId: "AUTO_ID", description: "Використання слабких або стандартних паролів для облікових записів з адміністративними привілеями.", severity: "Критична" }
      ]
    },
    {
      name: "Журнали аудиту доступу до систем",
      type: "Інформація",
      description: "Лог-файли, що фіксують події підключення користувачів, їхні дії та спроби доступу в інформаційних системах.",
      weaknesses: [
        { id: "seed_w_ir_5", assetId: "AUTO_ID", description: "Журнали доступу не агрегуються централізовано та не аналізуються регулярно на предмет підозрілої активності.", severity: "Середня" }
      ]
    }
  ];


  initialAssetsData.forEach(assetData => {
    const assetRef = doc(collection(db, 'assets')); 
    
    const weaknessesWithActualAssetId = assetData.weaknesses?.map(w => ({
      ...w,
      assetId: assetRef.id 
    })) || [];

    batch.set(assetRef, { ...assetData, weaknesses: weaknessesWithActualAssetId });
  });

  try {
    await batch.commit();
    console.log("Initial assets seeded successfully with new user-provided data.");
    return true; 
  } catch (error) {
    console.error("Error seeding initial assets: ", error);
    return false; 
  }
};


export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(true);
  const [isSubmittingAsset, setIsSubmittingAsset] = useState(false);
  const [isSubmittingWeakness, setIsSubmittingWeakness] = useState(false);
  const [isAssetDialogOpen, setIsAssetDialogOpen] = useState(false);
  const [isWeaknessDialogOpen, setIsWeaknessDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [editingWeakness, setEditingWeakness] = useState<Weakness | null>(null);
  const [assetToManageWeakness, setAssetToManageWeakness] = useState<Asset | null>(null);
  const [currentCategory, setCurrentCategory] = useState<DisplayCategoryKey>(categoryKeys[0]);
  const { toast } = useToast();

  const assetForm = useForm<z.infer<typeof assetFormSchema>>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: { name: "", type: displayCategoryMap[currentCategory], description: "" },
  });

  const weaknessForm = useForm<z.infer<typeof weaknessFormSchema>>({
    resolver: zodResolver(weaknessFormSchema),
    defaultValues: { description: "", severity: "Середня" },
  });

  const fetchAssets = useCallback(async (forceRefresh = false) => {
    setIsLoadingAssets(true);
    try {
      const assetsCollectionRef = collection(db, 'assets');
      const assetSnapshot = await getDocs(assetsCollectionRef);
      
      if (assetSnapshot.empty && !forceRefresh) { 
        const seeded = await seedInitialAssets();
        if (seeded) {
          const newSnapshot = await getDocs(assetsCollectionRef);
          const assetsList = newSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset));
          setAssets(assetsList);
          toast({ title: "Вітаємо!", description: "Додано нові приклади активів згідно вашого запиту." });
        } else {
           setAssets([]); 
        }
      } else {
        const assetsList = assetSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset));
        setAssets(assetsList);
      }
    } catch (error) {
      console.error("Error fetching assets: ", error);
      toast({ title: "Помилка", description: "Не вдалося завантажити активи.", variant: "destructive" });
    } finally {
      setIsLoadingAssets(false);
    }
  }, [toast]); 

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  useEffect(() => {
    if (!editingAsset) {
      assetForm.reset({ name: "", type: displayCategoryMap[currentCategory], description: "" });
    } else {
      assetForm.reset(editingAsset); 
    }
  }, [editingAsset, assetForm, currentCategory]);


  useEffect(() => {
    if (editingWeakness) {
      weaknessForm.reset(editingWeakness);
    } else {
      weaknessForm.reset({ description: "", severity: "Середня" });
    }
  }, [editingWeakness, weaknessForm]);

  const handleAssetSubmit = async (values: z.infer<typeof assetFormSchema>) => {
    setIsSubmittingAsset(true);
    try {
      if (editingAsset) {
        const assetDocRef = doc(db, "assets", editingAsset.id);
        await updateDoc(assetDocRef, values);
        toast({ title: "Успіх", description: "Актив оновлено." });
      } else {
        await addDoc(collection(db, "assets"), { ...values, weaknesses: [] });
        toast({ title: "Успіх", description: "Актив додано." });
      }
      await fetchAssets(true); 
      setIsAssetDialogOpen(false);
      setEditingAsset(null);
    } catch (error) {
      console.error("Error submitting asset: ", error);
      toast({ title: "Помилка", description: "Не вдалося зберегти актив.", variant: "destructive" });
    } finally {
      setIsSubmittingAsset(false);
    }
  };

  const handleWeaknessSubmit = async (values: z.infer<typeof weaknessFormSchema>) => {
    if (!assetToManageWeakness) return;
    setIsSubmittingWeakness(true);
    
    try {
      const assetDocRef = doc(db, "assets", assetToManageWeakness.id);
      if (editingWeakness) { 
        const weaknessToRemove = assetToManageWeakness.weaknesses?.find(w => w.id === editingWeakness.id);
        if (weaknessToRemove) {
            await updateDoc(assetDocRef, { weaknesses: arrayRemove(weaknessToRemove) });
        }
        const updatedWeakness = { ...editingWeakness, ...values }; 
        await updateDoc(assetDocRef, { weaknesses: arrayUnion(updatedWeakness) });
        toast({ title: "Успіх", description: "Вразливість оновлено." });
      } else { 
        const newWeakness: Weakness = { 
            ...values, 
            id: doc(collection(db, 'weakness_ids')).id, 
            assetId: assetToManageWeakness.id 
        };
        await updateDoc(assetDocRef, { weaknesses: arrayUnion(newWeakness) });
        toast({ title: "Успіх", description: "Вразливість додано." });
      }
      await fetchAssets(true); 
      setIsWeaknessDialogOpen(false);
      setEditingWeakness(null);
      setAssetToManageWeakness(null); 
    } catch (error) {
      console.error("Error submitting weakness: ", error);
      toast({ title: "Помилка", description: "Не вдалося зберегти вразливість.", variant: "destructive" });
    } finally {
      setIsSubmittingWeakness(false);
    }
  };

  const openAddAssetDialog = () => {
    setEditingAsset(null);
    assetForm.reset({ name: "", type: displayCategoryMap[currentCategory], description: "" });
    setIsAssetDialogOpen(true);
  };

  const openEditAssetDialog = (asset: Asset) => {
    setEditingAsset(asset);
    assetForm.reset(asset); 
    setIsAssetDialogOpen(true);
  };

  const deleteAsset = async (assetId: string) => {
    const assetToDelete = assets.find(a => a.id === assetId);
    if (!confirm(\`Ви впевнені, що хочете видалити актив "\${assetToDelete?.name || assetId}"? Цю дію не можна буде скасувати.\`)) return;
    try {
      await deleteDoc(doc(db, "assets", assetId));
      toast({ title: "Успіх", description: \`Актив "\${assetToDelete?.name || assetId}" видалено.\` });
      await fetchAssets(true);
    } catch (error) {
      console.error("Error deleting asset: ", error);
      toast({ title: "Помилка", description: "Не вдалося видалити актив.", variant: "destructive" });
    }
  };
  
  const openAddWeaknessDialog = (asset: Asset) => {
    setAssetToManageWeakness(asset);
    setEditingWeakness(null);
    weaknessForm.reset({ description: "", severity: "Середня" });
    setIsWeaknessDialogOpen(true);
  };

  const openEditWeaknessDialog = (asset: Asset, weakness: Weakness) => {
    setAssetToManageWeakness(asset);
    setEditingWeakness(weakness);
    weaknessForm.reset(weakness);
    setIsWeaknessDialogOpen(true);
  };
  
  const deleteWeakness = async (targetAsset: Asset, weaknessId: string) => {
    const weaknessToDelete = targetAsset.weaknesses?.find(w => w.id === weaknessId);
    if (!weaknessToDelete) {
        toast({ title: "Помилка", description: "Вразливість не знайдено для видалення.", variant: "destructive" });
        return;
    }
    if (!confirm(\`Ви впевнені, що хочете видалити вразливість "\${weaknessToDelete.description}" для активу "\${targetAsset.name}"?\`)) return;
    
    try {
        const assetRef = doc(db, "assets", targetAsset.id);
        await updateDoc(assetRef, { weaknesses: arrayRemove(weaknessToDelete) });
        toast({ title: "Успіх", description: "Вразливість видалено." });
        await fetchAssets(true); 
    } catch (error) {
        console.error("Error deleting weakness: ", error);
        toast({ title: "Помилка", description: "Не вдалося видалити вразливість.", variant: "destructive" });
    }
  };

  const severityBadgeColor = (severity: Weakness['severity']) => {
    switch (severity) {
      case 'Критична': return 'bg-red-600 hover:bg-red-700';
      case 'Висока': return 'bg-orange-500 hover:bg-orange-600';
      case 'Середня': return 'bg-yellow-500 hover:bg-yellow-600 text-black';
      case 'Низька': return 'bg-green-500 hover:bg-green-600';
      default: return 'bg-gray-500 hover:bg-gray-600';
    }
  };
  
  const displayedAssets = assets.filter(asset => asset.type === displayCategoryMap[currentCategory]);
  const CurrentCategoryIcon = categoryIcons[currentCategory];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-headline">Реєстр активів</h1>
      </div>
      <CardDescription>Каталогізуйте обладнання, програмне забезпечення та інформаційні активи вашої організації. Дані зберігаються у Firestore.</CardDescription>

      <div className="flex space-x-2 mb-6 border-b pb-2">
        {categoryKeys.map(categoryName => {
          const Icon = categoryIcons[categoryName];
          return (
            <Button
              key={categoryName}
              variant={currentCategory === categoryName ? "default" : "outline"}
              onClick={() => setCurrentCategory(categoryName)}
              className="flex-1 sm:flex-none justify-center sm:justify-start"
            >
              <Icon className="mr-2 h-4 w-4" />
              {categoryName}
            </Button>
          );
        })}
      </div>

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-headline flex items-center">
          <CurrentCategoryIcon className="mr-3 h-6 w-6 text-primary" />
          {currentCategory}
        </h2>
        <Button onClick={openAddAssetDialog}><PlusCircle className="mr-2 h-4 w-4" /> Додати до "{currentCategory}"</Button>
      </div>

      {isLoadingAssets ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-4 text-lg">Завантаження активів...</p>
        </div>
      ) : displayedAssets.length === 0 ? (
        <Card className="text-center py-12">
          <CardHeader>
            <ListChecks className="mx-auto h-12 w-12 text-muted-foreground" />
            <CardTitle className="mt-4">У категорії "{currentCategory}" активів ще немає</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>Почніть з додавання вашого першого активу до категорії "{currentCategory}".</CardDescription>
            <Button onClick={openAddAssetDialog} className="mt-4"><PlusCircle className="mr-2 h-4 w-4" /> Додати до "{currentCategory}"</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
          {displayedAssets.map(asset => (
            <Card key={asset.id} className="flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="font-headline text-2xl">{asset.name}</CardTitle>
                    <Badge variant="secondary" className="mt-1">{asset.type}</Badge>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => openEditAssetDialog(asset)} aria-label={\`Редагувати \${asset.name}\`}><Edit3 className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteAsset(asset.id)} aria-label={\`Видалити \${asset.name}\`}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
                <CardDescription className="pt-2">{asset.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value={\`weaknesses-\${asset.id}\`}>
                    <AccordionTrigger className="text-base hover:no-underline">
                      <div className="flex items-center">
                        <ShieldAlert className="mr-2 h-5 w-5 text-primary" />
                        Вразливості ({asset.weaknesses?.length || 0})
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      {asset.weaknesses && asset.weaknesses.length > 0 ? (
                        <ul className="space-y-2 mt-2">
                          {asset.weaknesses.map(weakness => (
                            <li key={weakness.id} className="p-3 rounded-md border bg-card/50 flex justify-between items-start gap-2">
                              <div className="flex-1">
                                <p className="font-semibold break-words">{weakness.description}</p>
                                <Badge className={cn("text-xs mt-1", severityBadgeColor(weakness.severity))}>{weakness.severity}</Badge>
                              </div>
                              <div className="flex space-x-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditWeaknessDialog(asset, weakness)} aria-label={\`Редагувати вразливість \${weakness.description}\`}><Edit3 className="h-3.5 w-3.5" /></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteWeakness(asset, weakness.id)} aria-label={\`Видалити вразливість \${weakness.description}\`}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground mt-2">Для цього активу вразливостей не виявлено.</p>
                      )}
                      <Button variant="outline" size="sm" className="mt-4" onClick={() => openAddWeaknessDialog(asset)}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Додати вразливість
                      </Button>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isAssetDialogOpen} onOpenChange={(isOpen) => { setIsAssetDialogOpen(isOpen); if (!isOpen) setEditingAsset(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAsset ? "Редагувати актив" : \`Додати новий актив до "\${currentCategory}"\`}</DialogTitle>
          </DialogHeader>
          <Form {...assetForm}>
            <form onSubmit={assetForm.handleSubmit(handleAssetSubmit)} className="space-y-4">
              <FormField
                control={assetForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Назва активу</FormLabel>
                    <FormControl><Input placeholder="напр., Головний веб-сервер" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={assetForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Тип активу</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value} 
                      disabled={!!editingAsset || !!displayCategoryMap[currentCategory]} 
                    >
                      <FormControl><SelectTrigger><SelectValue placeholder="Виберіть тип активу" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {Object.entries(displayCategoryMap).map(([displayName, actualType]) => (
                          <SelectItem 
                            key={actualType} 
                            value={actualType} 
                            disabled={(actualType !== displayCategoryMap[currentCategory] && !editingAsset) || (!!editingAsset && field.value !== actualType) }
                          >
                            {displayName} ({actualType})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                    {editingAsset ? (
                         <p className="text-xs text-muted-foreground pt-1">
                            Тип активу не можна змінити після створення. Поточний тип: {editingAsset.type}
                        </p>
                    ) : (
                        <p className="text-xs text-muted-foreground pt-1">
                            Тип автоматично встановлено як "{currentCategory}" ({assetForm.getValues("type")}).
                        </p>
                    )}
                  </FormItem>
                )}
              />
              <FormField
                control={assetForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Опис</FormLabel>
                    <FormControl><Textarea placeholder="Опишіть актив" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline" disabled={isSubmittingAsset}>Скасувати</Button></DialogClose>
                <Button type="submit" disabled={isSubmittingAsset}>
                  {isSubmittingAsset && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingAsset ? "Зберегти зміни" : "Додати актив"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isWeaknessDialogOpen} onOpenChange={(isOpen) => { setIsWeaknessDialogOpen(isOpen); if (!isOpen) { setEditingWeakness(null); setAssetToManageWeakness(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingWeakness ? "Редагувати вразливість" : "Додати нову вразливість"} для активу "{assetToManageWeakness?.name}"</DialogTitle>
          </DialogHeader>
           <Form {...weaknessForm}>
            <form onSubmit={weaknessForm.handleSubmit(handleWeaknessSubmit)} className="space-y-4">
              <FormField
                control={weaknessForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Опис вразливості</FormLabel>
                    <FormControl><Textarea placeholder="напр., Застаріла версія ОС" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={weaknessForm.control}
                name="severity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Серйозність</FormLabel>
                     <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Виберіть серйозність" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {weaknessSeverities.map(sev => <SelectItem key={sev} value={sev}>{sev}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline" disabled={isSubmittingWeakness}>Скасувати</Button></DialogClose>
                <Button type="submit" disabled={isSubmittingWeakness}>
                  {isSubmittingWeakness && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingWeakness ? "Зберегти зміни" : "Додати вразливість"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}


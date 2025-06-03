
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
    // 1. Активи програмного забезпечення (Software Assets) - 6 examples
    {
      name: "Платформа аналізу загроз (TIP Core)",
      type: "Програмне забезпечення",
      description: "Центральний компонент, що агрегує, аналізує та корелює дані про кіберзагрози.",
      weaknesses: [
        { id: "sw_t_1", assetId: "AUTO_ID", description: "Недостатня валідація вхідних даних від зовнішніх джерел (feeds) може призвести до RCE, дозволяючи зловмиснику скомпрометувати систему збору розвідданих.", severity: "Критична" }
      ]
    },
    {
      name: "Система SIEM (Security Information and Event Management)",
      type: "Програмне забезпечення",
      description: "Система збору, моніторингу та аналізу логів безпеки з корпоративних систем.",
      weaknesses: [
        { id: "sw_t_2", assetId: "AUTO_ID", description: "Використання стандартних облікових даних для доступу до SIEM дозволяє зловмиснику отримати доступ до логів, приховати сліди або сфабрикувати події.", severity: "Висока" }
      ]
    },
    {
      name: "Платформа SOAR (Security Orchestration, Automation and Response)",
      type: "Програмне забезпечення",
      description: "Платформа для автоматизації реагування на інциденти безпеки на основі плейбуків.",
      weaknesses: [
        { id: "sw_t_3", assetId: "AUTO_ID", description: "Вразливість у кастомному скрипті плейбука (наприклад, ін'єкція команд) може дозволити зловмиснику виконати довільні команди на підключених системах.", severity: "Критична" }
      ]
    },
    {
      name: "Сканер вразливостей",
      type: "Програмне забезпечення",
      description: "ПЗ для автоматизованого виявлення вразливостей в ІТ-інфраструктурі.",
      weaknesses: [
        { id: "sw_t_4", assetId: "AUTO_ID", description: "Застаріла база сигнатур вразливостей сканера призводить до пропуску нових експлойтів, дозволяючи зловмиснику їх використати.", severity: "Висока" }
      ]
    },
    {
      name: "EDR Агент (Endpoint Detection and Response)",
      type: "Програмне забезпечення",
      description: "Агент на кінцевих точках для моніторингу, виявлення та реагування на загрози.",
      weaknesses: [
        { id: "sw_t_5", assetId: "AUTO_ID", description: "Обхід механізмів захисту EDR-агента (наприклад, через kernel-level експлойт) дозволяє зловмиснику діяти на кінцевій точці непоміченим.", severity: "Висока" }
      ]
    },
    {
      name: "Корпоративний VPN-сервер",
      type: "Програмне забезпечення",
      description: "Сервер, що забезпечує безпечний віддалений доступ до корпоративної мережі.",
      weaknesses: [
        { id: "sw_t_6", assetId: "AUTO_ID", description: "Використання VPN-сервером застарілого протоколу шифрування (наприклад, PPTP) робить VPN-трафік вразливим до перехоплення та розшифрування.", severity: "Середня" }
      ]
    },

    // 2. Активи апаратного забезпечення (Hardware Assets) - 6 examples
    {
      name: "Сервер аналізу загроз",
      type: "Обладнання",
      description: "Високопродуктивний сервер для обробки даних розвідки та запуску моделей ML.",
      weaknesses: [
        { id: "hw_t_1", assetId: "AUTO_ID", description: "Фізичний несанкціонований доступ до серверної стійки може призвести до викрадення сервера, спричинивши втрату даних та зупинку аналітики.", severity: "Критична" }
      ]
    },
    {
      name: "Мережевий сенсор IDS/IPS",
      type: "Обладнання",
      description: "Пристрій для виявлення та запобігання вторгненням на периметрі мережі.",
      weaknesses: [
        { id: "hw_t_2", assetId: "AUTO_ID", description: "Неправильна конфігурація правил IDS/IPS (пропуск відомих атак) дозволяє зловмиснику обійти систему виявлення та проникнути в мережу.", severity: "Висока" }
      ]
    },
    {
      name: "Сховище даних розвідки (Data Lake)",
      type: "Обладнання",
      description: "Система зберігання для необроблених та оброблених даних про кіберзагрози.",
      weaknesses: [
        { id: "hw_t_3", assetId: "AUTO_ID", description: "Відмова диску в RAID-масиві без гарячого резерву та моніторингу може призвести до втрати частини даних розвідки при наступній відмові.", severity: "Середня" }
      ]
    },
    {
      name: "Робоча станція аналітика безпеки",
      type: "Обладнання",
      description: "Потужний комп'ютер для аналізу шкідливого ПЗ та розслідування інцидентів.",
      weaknesses: [
        { id: "hw_t_4", assetId: "AUTO_ID", description: "Зараження робочої станції аналітика через фішинг (RAT) дозволяє зловмиснику отримати доступ до інструментів аналізу та конфіденційних даних.", severity: "Висока" }
      ]
    },
    {
      name: "Firewall наступного покоління (NGFW)",
      type: "Обладнання",
      description: "Мережевий екран з розширеними функціями інспекції трафіку.",
      weaknesses: [
        { id: "hw_t_5", assetId: "AUTO_ID", description: "Використання стандартного пароля адміністратора на NGFW дозволяє зловмиснику отримати контроль над ним та змінювати правила фільтрації.", severity: "Критична" }
      ]
    },
    {
      name: "Апаратний модуль безпеки (HSM)",
      type: "Обладнання",
      description: "Пристрій для безпечного зберігання та управління криптографічними ключами.",
      weaknesses: [
        { id: "hw_t_6", assetId: "AUTO_ID", description: "Компрометація облікових даних адміністратора HSM через соц. інженерію може призвести до несанкціонованого доступу до криптографічних ключів.", severity: "Критична" }
      ]
    },
    
    // 3. Активи інформаційних ресурсів (Information Assets) - 6 examples
    {
      name: "База даних індикаторів компрометації (IoCs)",
      type: "Інформація",
      description: "Структурована інформація про відомі шкідливі файли, IP-адреси, домени.",
      weaknesses: [
        { id: "info_t_1", assetId: "AUTO_ID", description: "Несанкціонована зміна (отруєння) даних в базі IoC (наприклад, додавання легітимних ресурсів як шкідливих) може спричинити DoS важливих сервісів.", severity: "Висока" }
      ]
    },
    {
      name: "Звіти про розслідування кіберінцидентів",
      type: "Інформація",
      description: "Конфіденційні документи з деталями розслідуваних інцидентів та TTPs зловмисників.",
      weaknesses: [
        { id: "info_t_2", assetId: "AUTO_ID", description: "Витік звітів про інциденти через інсайдера або неправильні права доступу може розкрити методи розслідування та слабкі місця компанії.", severity: "Висока" }
      ]
    },
    {
      name: "Конфігураційні файли систем безпеки",
      type: "Інформація",
      description: "Файли з налаштуваннями правил, політик, інтеграцій SIEM, SOAR, Firewall.",
      weaknesses: [
        { id: "info_t_3", assetId: "AUTO_ID", description: "Доступ до конфігурацій NGFW (через вразливість на сервері бекапів) дозволяє зловмиснику вивчити правила та знайти шляхи обходу.", severity: "Критична" }
      ]
    },
    {
      name: "Приватні ключі API розвідданих",
      type: "Інформація",
      description: "Ключі для автентифікації та шифрування доступу до API платформи розвідданих.",
      weaknesses: [
        { id: "info_t_4", assetId: "AUTO_ID", description: "Зберігання приватних ключів API у відкритому вигляді в репозиторії коду дозволяє зловмиснику перехопити їх та отримати доступ до API.", severity: "Критична" }
      ]
    },
    {
      name: "Персональні дані співробітників служби безпеки",
      type: "Інформація",
      description: "ПІБ, контакти, посади співробітників, що працюють з системами кіберзахисту.",
      weaknesses: [
        { id: "info_t_5", assetId: "AUTO_ID", description: "Витік персональних даних співробітників безпеки (через фішинг на HR-порталі) може бути використаний для цілеспрямованих атак соц. інженерії.", severity: "Середня" }
      ]
    },
    {
      name: "База знань про TTP зловмисників",
      type: "Інформація",
      description: "Зібрана та класифікована інформація про тактики, техніки та процедури кіберзлочинців.",
      weaknesses: [
        { id: "info_t_6", assetId: "AUTO_ID", description: "Відсутність регулярного оновлення бази TTP призводить до нездатності виявляти новітні методи атак, роблячи систему вразливою.", severity: "Середня" }
      ]
    },
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
    console.log("Initial assets seeded successfully with updated cyber-intelligence themed data.");
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
          const assetsList = newSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Asset));
          setAssets(assetsList);
          toast({ title: "Вітаємо!", description: "Додано приклади активів відповідно до тематики кіберзахисту." });
        } else {
           setAssets([]); 
        }
      } else {
        const assetsList = assetSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Asset));
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
        toast({ title: "Успіх", description: "Загрозу (вразливість) оновлено." });
      } else { 
        const newWeakness: Weakness = { 
            ...values, 
            id: doc(collection(db, 'weakness_ids')).id, 
            assetId: assetToManageWeakness.id 
        };
        await updateDoc(assetDocRef, { weaknesses: arrayUnion(newWeakness) });
        toast({ title: "Успіх", description: "Загрозу (вразливість) додано." });
      }
      await fetchAssets(true); 
      setIsWeaknessDialogOpen(false);
      setEditingWeakness(null);
      setAssetToManageWeakness(null); 
    } catch (error) {
      console.error("Error submitting weakness: ", error);
      toast({ title: "Помилка", description: "Не вдалося зберегти загрозу (вразливість).", variant: "destructive" });
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
    const message = `Ви впевнені, що хочете видалити актив "${assetToDelete?.name || assetId}"? Цю дію не можна буде скасувати.`;
    if (!confirm(message)) return;
    try {
      await deleteDoc(doc(db, "assets", assetId));
      toast({ title: "Успіх", description: `Актив "${assetToDelete?.name || assetId}" видалено.` });
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
        toast({ title: "Помилка", description: "Загрозу (вразливість) не знайдено для видалення.", variant: "destructive" });
        return;
    }
    const message = `Ви впевнені, що хочете видалити загрозу (вразливість) "${weaknessToDelete.description}" для активу "${targetAsset.name}"?`;
    if (!confirm(message)) return;
    
    try {
        const assetRef = doc(db, "assets", targetAsset.id);
        await updateDoc(assetRef, { weaknesses: arrayRemove(weaknessToDelete) });
        toast({ title: "Успіх", description: "Загрозу (вразливість) видалено." });
        await fetchAssets(true); 
    } catch (error) {
        console.error("Error deleting weakness: ", error);
        toast({ title: "Помилка", description: "Не вдалося видалити загрозу (вразливість).", variant: "destructive" });
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
      <CardDescription>
        Каталогізуйте обладнання, програмне забезпечення та інформаційні активи вашої системи кіберзахисту.
        Визначте потенційні загрози (вразливість + дії зловмисника) для кожного активу.
        Дані зберігаються у Firestore та оновлюються в реальному часі.
      </CardDescription>

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
                    <Button variant="ghost" size="icon" onClick={() => openEditAssetDialog(asset)} aria-label={`Редагувати ${asset.name}`}><Edit3 className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteAsset(asset.id)} aria-label={`Видалити ${asset.name}`}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
                <CardDescription className="pt-2">{asset.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value={`weaknesses-${asset.id}`}>
                    <AccordionTrigger className="text-base hover:no-underline">
                      <div className="flex items-center">
                        <ShieldAlert className="mr-2 h-5 w-5 text-primary" />
                        Загрози ({asset.weaknesses?.length || 0})
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
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditWeaknessDialog(asset, weakness)} aria-label={`Редагувати загрозу (вразливість) ${weakness.description}`}><Edit3 className="h-3.5 w-3.5" /></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteWeakness(asset, weakness.id)} aria-label={`Видалити загрозу (вразливість) ${weakness.description}`}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground mt-2">Для цього активу загроз (вразливостей) не виявлено.</p>
                      )}
                      <Button variant="outline" size="sm" className="mt-4" onClick={() => openAddWeaknessDialog(asset)}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Додати загрозу
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
            <DialogTitle>{editingAsset ? "Редагувати актив" : `Додати новий актив до "${currentCategory}"`}</DialogTitle>
          </DialogHeader>
          <Form {...assetForm}>
            <form onSubmit={assetForm.handleSubmit(handleAssetSubmit)} className="space-y-4">
              <FormField
                control={assetForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Назва активу</FormLabel>
                    <FormControl><Input placeholder="напр., Головний сервер аналітики" {...field} /></FormControl>
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
                    <FormControl><Textarea placeholder="Опишіть актив та його роль у системі кіберзахисту" {...field} /></FormControl>
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
            <DialogTitle>{editingWeakness ? "Редагувати загрозу (вразливість)" : "Додати нову загрозу (вразливість)"} для активу "{assetToManageWeakness?.name}"</DialogTitle>
          </DialogHeader>
           <Form {...weaknessForm}>
            <form onSubmit={weaknessForm.handleSubmit(handleWeaknessSubmit)} className="space-y-4">
              <FormField
                control={weaknessForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Опис загрози (вразливість + дії зловмисника)</FormLabel>
                    <FormControl><Textarea placeholder="напр., SQL-ін'єкція на веб-сервері дозволяє зловмиснику отримати доступ до бази даних клієнтів." {...field} /></FormControl>
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
                  {editingWeakness ? "Зберегти зміни" : "Додати загрозу"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}


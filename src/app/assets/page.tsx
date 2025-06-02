
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
    // Existing Assets
    {
      name: "Головний Сервер Сховища",
      type: "Обладнання",
      description: "Сервер для зберігання критично важливих даних компанії.",
      weaknesses: [
        { id: "seed_w_hw1", assetId: "AUTO_GENERATED_BY_FIRESTORE", description: "Відсутність фізичного замка на серверній кімнаті", severity: "Висока" }
      ]
    },
    {
      name: "CRM Система \"КлієнтПлюс\"",
      type: "Програмне забезпечення",
      description: "Система управління взаємовідносинами з клієнтами.",
      weaknesses: [
        { id: "seed_w_sw1", assetId: "AUTO_GENERATED_BY_FIRESTORE", description: "Використання стандартного паролю адміністратора 'admin/admin'", severity: "Критична" }
      ]
    },
    {
      name: "База Даних Клієнтів",
      type: "Інформація",
      description: "Містить персональні дані та історію замовлень клієнтів.",
      weaknesses: [
        { id: "seed_w_info1", assetId: "AUTO_GENERATED_BY_FIRESTORE", description: "Резервні копії не шифруються належним чином", severity: "Середня" }
      ]
    },
     {
      name: "Корпоративний Ноутбук Менеджера",
      type: "Обладнання",
      description: "Ноутбук Dell XPS 15, використовується для доступу до корпоративних ресурсів.",
      weaknesses: [
        { id: "seed_w_hw2", assetId: "AUTO_GENERATED_BY_FIRESTORE", description: "Відсутнє шифрування жорсткого диска", severity: "Висока" },
        { id: "seed_w_hw3", assetId: "AUTO_GENERATED_BY_FIRESTORE", description: "Застаріла версія антивірусу", severity: "Середня" }
      ]
    },
    {
      name: "Веб-сервер Apache",
      type: "Програмне забезпечення",
      description: "Обслуговує корпоративний веб-сайт.",
      weaknesses: [
        { id: "seed_w_sw2", assetId: "AUTO_GENERATED_BY_FIRESTORE", description: "Дозволено лістинг директорій", severity: "Низька" }
      ]
    },
    // New Hardware Assets (5)
    {
      name: "Мережевий Брандмауер Рівня Підприємства",
      type: "Обладнання",
      description: "Центральний пристрій фільтрації мережевого трафіку для захисту периметра.",
      weaknesses: [
        { id: "seed_w_hw_new1", assetId: "AUTO_GENERATED_BY_FIRESTORE", description: "Правила фільтрації не оновлювалися більше 6 місяців", severity: "Висока" }
      ]
    },
    {
      name: "Система Виявлення/Запобігання Вторгнень (IDS/IPS)",
      type: "Обладнання",
      description: "Апаратний комплекс для моніторингу та блокування підозрілої активності в мережі.",
      weaknesses: [
        { id: "seed_w_hw_new2", assetId: "AUTO_GENERATED_BY_FIRESTORE", description: "Сигнатури атак застарілі, не оновлювалися 3 місяці", severity: "Висока" }
      ]
    },
    {
      name: "Резервний Дизель-Генератор",
      type: "Обладнання",
      description: "Забезпечує безперебійне живлення критичних систем у разі відключення електроенергії.",
      weaknesses: [
        { id: "seed_w_hw_new3", assetId: "AUTO_GENERATED_BY_FIRESTORE", description: "Планове технічне обслуговування прострочено на 1 місяць", severity: "Середня" }
      ]
    },
    {
      name: "Промисловий Контролер (PLC)",
      type: "Обладнання",
      description: "Керує технологічними процесами на виробничій лінії.",
      weaknesses: [
        { id: "seed_w_hw_new4", assetId: "AUTO_GENERATED_BY_FIRESTORE", description: "Доступ до інтерфейсу керування PLC не захищений паролем", severity: "Критична" }
      ]
    },
    {
      name: "Сервер Управління SCADA",
      type: "Обладнання",
      description: "Центральний сервер для системи диспетчерського управління та збору даних.",
      weaknesses: [
        { id: "seed_w_hw_new5", assetId: "AUTO_GENERATED_BY_FIRESTORE", description: "Операційна система сервера SCADA не отримує оновлень безпеки (End-of-Life)", severity: "Критична" }
      ]
    },
    // New Software Assets (5)
    {
      name: "Програмне Забезпечення SCADA HMI",
      type: "Програмне забезпечення",
      description: "Інтерфейс людино-машинної взаємодії для операторів системи SCADA.",
      weaknesses: [
        { id: "seed_w_sw_new1", assetId: "AUTO_GENERATED_BY_FIRESTORE", description: "Використання стандартних облікових даних для доступу до HMI ('operator'/'password')", severity: "Критична" }
      ]
    },
    {
      name: "СУБД для Історичних Даних (Historian)",
      type: "Програмне забезпечення",
      description: "Система управління базами даних для зберігання та аналізу історичних даних процесів.",
      weaknesses: [
        { id: "seed_w_sw_new2", assetId: "AUTO_GENERATED_BY_FIRESTORE", description: "Відсутнє шифрування даних при передачі до Historian", severity: "Середня" }
      ]
    },
    {
      name: "Прошивка Мережевих Комутаторів",
      type: "Програмне забезпечення",
      description: "Вбудоване програмне забезпечення, що керує роботою промислових мережевих комутаторів.",
      weaknesses: [
        { id: "seed_w_sw_new3", assetId: "AUTO_GENERATED_BY_FIRESTORE", description: "Наявна відома вразливість у поточній версії прошивки (CVE-2023-12345)", severity: "Висока" }
      ]
    },
    {
      name: "Система Централізованого Логування (SIEM)",
      type: "Програмне забезпечення",
      description: "Платформа для збору, аналізу та кореляції подій безпеки з різних джерел.",
      weaknesses: [
        { id: "seed_w_sw_new4", assetId: "AUTO_GENERATED_BY_FIRESTORE", description: "Недостатній обсяг сховища для логів, старі логи перезаписуються кожні 7 днів", severity: "Середня" }
      ]
    },
    {
      name: "Програмне Забезпечення для VPN-Доступу",
      type: "Програмне забезпечення",
      description: "Клієнтське та серверне ПЗ для організації захищеного віддаленого доступу.",
      weaknesses: [
        { id: "seed_w_sw_new5", assetId: "AUTO_GENERATED_BY_FIRESTORE", description: "Використання застарілого протоколу шифрування для VPN (напр. PPTP)", severity: "Висока" }
      ]
    },
    // New Information Assets (5)
    {
      name: "Схеми Технологічних Процесів",
      type: "Інформація",
      description: "Детальні діаграми, що описують роботу критичних технологічних процесів.",
      weaknesses: [
        { id: "seed_w_info_new1", assetId: "AUTO_GENERATED_BY_FIRESTORE", description: "Доступ до схем не обмежений, доступні всім співробітникам через загальну теку", severity: "Середня" }
      ]
    },
    {
      name: "Конфігураційні Файли Мережевого Обладнання",
      type: "Інформація",
      description: "Файли з налаштуваннями брандмауерів, комутаторів, маршрутизаторів.",
      weaknesses: [
        { id: "seed_w_info_new2", assetId: "AUTO_GENERATED_BY_FIRESTORE", description: "Резервні копії конфігурацій зберігаються на незахищеному файловому сервері без шифрування", severity: "Висока" }
      ]
    },
    {
      name: "Дані телеметрії з промислових датчиків",
      type: "Інформація",
      description: "Потоки даних від датчиків температури, тиску, рівня тощо.",
      weaknesses: [
        { id: "seed_w_info_new3", assetId: "AUTO_GENERATED_BY_FIRESTORE", description: "Відсутня перевірка цілісності та автентичності даних телеметрії", severity: "Середня" }
      ]
    },
    {
      name: "Облікові Дані для Доступу до Систем Управління",
      type: "Інформація",
      description: "Логіни та паролі для адміністративних інтерфейсів PLC, SCADA, HMI.",
      weaknesses: [
        { id: "seed_w_info_new4", assetId: "AUTO_GENERATED_BY_FIRESTORE", description: "Паролі зберігаються у текстовому файлі на робочій станції оператора", severity: "Критична" }
      ]
    },
    {
      name: "Плани Реагування на Інціденти Безпеки (ІБ)",
      type: "Інформація",
      description: "Документовані процедури для дій у разі виникнення інцидентів ІБ.",
      weaknesses: [
        { id: "seed_w_info_new5", assetId: "AUTO_GENERATED_BY_FIRESTORE", description: "Плани не тестувалися та не оновлювалися більше року", severity: "Висока" }
      ]
    }
  ];

  initialAssetsData.forEach(assetData => {
    const assetRef = doc(collection(db, 'assets')); // Create a new doc ref to get ID
    
    // For embedded weaknesses, update the placeholder assetId with the actual ID
    const weaknessesWithActualAssetId = assetData.weaknesses?.map(w => ({
      ...w,
      assetId: assetRef.id // Use the generated ID of the parent asset
    })) || [];

    batch.set(assetRef, { ...assetData, weaknesses: weaknessesWithActualAssetId });
  });

  try {
    await batch.commit();
    console.log("Initial assets seeded successfully.");
    return true; // Indicate seeding was done
  } catch (error) {
    console.error("Error seeding initial assets: ", error);
    return false; // Indicate seeding failed or was not needed
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
      
      if (assetSnapshot.empty && !forceRefresh) { // Only seed if empty and not a forced refresh after seeding
        const seeded = await seedInitialAssets();
        if (seeded) {
          // Re-fetch after seeding
          const newSnapshot = await getDocs(assetsCollectionRef);
          const assetsList = newSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset));
          setAssets(assetsList);
          toast({ title: "Вітаємо!", description: "Додано приклади активів для початку." });
        } else {
           setAssets([]); // Set to empty if seeding failed but snapshot was empty
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
  }, [toast]); // Removed currentCategory from dependencies, type is fixed in dialog

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  useEffect(() => {
    // Update default type in form when category changes AND when dialog opens for a new asset
    if (!editingAsset) {
      assetForm.reset({ name: "", type: displayCategoryMap[currentCategory], description: "" });
    } else {
      assetForm.reset(editingAsset); // For editing, keep the asset's original type
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
        // For new assets, the type is correctly set from currentCategory by the useEffect above
        await addDoc(collection(db, "assets"), { ...values, weaknesses: [] });
        toast({ title: "Успіх", description: "Актив додано." });
      }
      await fetchAssets(true); // Force refresh to show changes
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
      if (editingWeakness) { // Editing existing weakness
        // To edit an item in an array, we remove the old one and add the new one.
        // First, find the full old weakness object to remove.
        const weaknessToRemove = assetToManageWeakness.weaknesses?.find(w => w.id === editingWeakness.id);
        if (weaknessToRemove) {
            await updateDoc(assetDocRef, { weaknesses: arrayRemove(weaknessToRemove) });
        }
        // Then, add the updated weakness object.
        const updatedWeakness = { ...editingWeakness, ...values }; // Preserve id and assetId, update other values
        await updateDoc(assetDocRef, { weaknesses: arrayUnion(updatedWeakness) });
        toast({ title: "Успіх", description: "Вразливість оновлено." });
      } else { // Adding new weakness
        const newWeakness: Weakness = { 
            ...values, 
            id: doc(collection(db, 'weakness_ids')).id, // Generate a unique ID for the weakness
            assetId: assetToManageWeakness.id 
        };
        await updateDoc(assetDocRef, { weaknesses: arrayUnion(newWeakness) });
        toast({ title: "Успіх", description: "Вразливість додано." });
      }
      await fetchAssets(true); 
      setIsWeaknessDialogOpen(false);
      setEditingWeakness(null);
      setAssetToManageWeakness(null); // Clear assetToManageWeakness after submission
    } catch (error) {
      console.error("Error submitting weakness: ", error);
      toast({ title: "Помилка", description: "Не вдалося зберегти вразливість.", variant: "destructive" });
    } finally {
      setIsSubmittingWeakness(false);
    }
  };

  const openAddAssetDialog = () => {
    setEditingAsset(null);
    // useEffect for assetForm will correctly set the type based on currentCategory
    assetForm.reset({ name: "", type: displayCategoryMap[currentCategory], description: "" });
    setIsAssetDialogOpen(true);
  };

  const openEditAssetDialog = (asset: Asset) => {
    setEditingAsset(asset);
    assetForm.reset(asset); // This will set the form type to the asset's current type
    setIsAssetDialogOpen(true);
  };

  const deleteAsset = async (assetId: string) => {
    // Find the asset to confirm its name
    const assetToDelete = assets.find(a => a.id === assetId);
    if (!confirm(`Ви впевнені, що хочете видалити актив "${assetToDelete?.name || assetId}"? Цю дію не можна буде скасувати.`)) return;
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
        toast({ title: "Помилка", description: "Вразливість не знайдено для видалення.", variant: "destructive" });
        return;
    }
    if (!confirm(`Ви впевнені, що хочете видалити вразливість "${weaknessToDelete.description}" для активу "${targetAsset.name}"?`)) return;
    
    try {
        const assetRef = doc(db, "assets", targetAsset.id);
        await updateDoc(assetRef, { weaknesses: arrayRemove(weaknessToDelete) });
        toast({ title: "Успіх", description: "Вразливість видалено." });
        await fetchAssets(true); 
        // If the assetToManageWeakness was the one we just modified, we should update its state too
        // or simply refetch assets which will handle this. For now, fetchAssets(true) handles it.
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
      <CardDescription>Каталогізуйте обладнання, програмне забезпечення та інформаційні активи вашої організації за категоріями. Дані зберігаються у Firestore.</CardDescription>

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
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3"> {/* Added xl:grid-cols-3 for better layout on large screens */}
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
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditWeaknessDialog(asset, weakness)} aria-label={`Редагувати вразливість ${weakness.description}`}><Edit3 className="h-3.5 w-3.5" /></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteWeakness(asset, weakness.id)} aria-label={`Видалити вразливість ${weakness.description}`}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
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

      {/* Asset Dialog */}
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
                      value={field.value} // This value is now correctly set by useEffect or when editing
                      disabled={!!editingAsset || !!displayCategoryMap[currentCategory]} // Disable if editing or if category selection dictates type
                    >
                      <FormControl><SelectTrigger><SelectValue placeholder="Виберіть тип активу" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {Object.entries(displayCategoryMap).map(([displayName, actualType]) => (
                          <SelectItem 
                            key={actualType} 
                            value={actualType} 
                            // Disable if this type doesn't match the current category (for new assets)
                            // OR if editing (type shouldn't change)
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

      {/* Weakness Dialog */}
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


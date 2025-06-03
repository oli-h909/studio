
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { Asset, Weakness } from '@/lib/types';
import { weaknessSeverities } from '@/lib/types';
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
    // 1. Активи програмного забезпечення (Software Assets) - 2 examples
    {
      name: "Платформа аналізу загроз (TIP Core)",
      type: "Програмне забезпечення",
      description: "Центральний компонент, що агрегує, аналізує та корелює дані про кіберзагрози.",
      version: "2.1.0",
      installationDate: "2023-05-15",
      lastUpdateDate: "2024-07-20",
      weaknesses: [
        { id: "sw_t_1", assetId: "AUTO_ID", description: "Вразливість: Недостатня валідація вхідних даних від зовнішніх джерел (feeds). Дії зловмисника: Виконання віддаленого коду (RCE), що дозволяє скомпрометувати систему збору розвідданих.", severity: "Критична" }
      ]
    },
    {
      name: "Система SIEM (Security Information and Event Management)",
      type: "Програмне забезпечення",
      description: "Система збору, моніторингу та аналізу логів безпеки з корпоративних систем.",
      version: "5.4.2",
      installationDate: "2022-11-01",
      lastUpdateDate: "2024-06-28",
      weaknesses: [
        { id: "sw_t_2", assetId: "AUTO_ID", description: "Вразливість: Використання стандартних облікових даних для доступу до SIEM. Дії зловмисника: Отримання доступу до логів, приховування слідів або фабрикація подій.", severity: "Висока" }
      ]
    },

    // 2. Активи апаратного забезпечення (Hardware Assets) - 2 examples
    {
      name: "Сервер аналізу загроз",
      type: "Обладнання",
      description: "Високопродуктивний сервер для обробки даних розвідки та запуску моделей ML.",
      ipAddress: "10.0.1.15",
      macAddress: "00:1A:2B:3C:4D:5E",
      location: "Дата-центр Київ, Стійка А03",
      weaknesses: [
        { id: "hw_t_1", assetId: "AUTO_ID", description: "Вразливість: Недостатній фізичний захист серверної стійки. Дії зловмисника: Фізичний несанкціонований доступ, викрадення сервера, що призводить до втрати даних та зупинки аналітики.", severity: "Критична" }
      ]
    },
    {
      name: "Мережевий сенсор IDS/IPS",
      type: "Обладнання",
      description: "Пристрій для виявлення та запобігання вторгненням на периметрі мережі.",
      ipAddress: "192.168.1.254",
      macAddress: "00:AA:BB:CC:DD:EE",
      location: "Головний маршрутизатор, DMZ",
      weaknesses: [
        { id: "hw_t_2", assetId: "AUTO_ID", description: "Вразливість: Неправильна конфігурація правил IDS/IPS. Дії зловмисника: Обхід системи виявлення (пропуск відомих атак) та проникнення в мережу.", severity: "Висока" }
      ]
    },
    
    // 3. Активи інформаційних ресурсів (Information Assets) - 2 examples
    {
      name: "База даних індикаторів компрометації (IoCs)",
      type: "Інформація",
      description: "Структурована інформація про відомі шкідливі файли, IP-адреси, домени.",
      dataSensitivity: "Дуже висока",
      storageLocation: "PostgreSQL Cluster (Main DB)",
      creationDate: "2022-01-10",
      lastAccessedDate: "2024-07-28",
      weaknesses: [
        { id: "info_t_1", assetId: "AUTO_ID", description: "Вразливість: Неналежний контроль доступу до бази IoC. Дії зловмисника: Несанкціонована зміна (отруєння) даних в базі IoC (наприклад, додавання легітимних ресурсів як шкідливих), що може спричинити DoS важливих сервісів.", severity: "Висока" }
      ]
    },
    {
      name: "Конфігураційні файли систем безпеки",
      type: "Інформація",
      description: "Файли з налаштуваннями правил, політик, інтеграцій SIEM, SOAR, Firewall.",
      dataSensitivity: "Критична",
      storageLocation: "Захищене сховище конфігурацій Vault",
      creationDate: "2022-03-01",
      lastAccessedDate: "2024-07-25",
      weaknesses: [
        { id: "info_t_3", assetId: "AUTO_ID", description: "Вразливість: Зберігання паролів у відкритому вигляді в конфігураційних файлах системи. Дії зловмисника: Витік або несанкціоноване отримання цих паролів, що призводить до несанкціонованого доступу до систем та даних.", severity: "Критична" }
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
    console.log("Initial assets seeded successfully with updated cyber-intelligence themed data and additional details.");
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
      const assetTypeKey = Object.keys(displayCategoryMap).find(key => displayCategoryMap[key as DisplayCategoryKey] === editingAsset.type) as DisplayCategoryKey | undefined;
      if (assetTypeKey) {
         setCurrentCategory(assetTypeKey); 
      }
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
    const assetDataToSave: Partial<Asset> = { ...values };
    
    // Preserve existing additional fields if editing, or set defaults if adding
    if (editingAsset) {
        assetDataToSave.version = editingAsset.version;
        assetDataToSave.installationDate = editingAsset.installationDate;
        assetDataToSave.lastUpdateDate = editingAsset.lastUpdateDate;
        assetDataToSave.ipAddress = editingAsset.ipAddress;
        assetDataToSave.macAddress = editingAsset.macAddress;
        assetDataToSave.location = editingAsset.location;
        assetDataToSave.dataSensitivity = editingAsset.dataSensitivity;
        assetDataToSave.storageLocation = editingAsset.storageLocation;
        assetDataToSave.creationDate = editingAsset.creationDate;
        assetDataToSave.lastAccessedDate = editingAsset.lastAccessedDate;
    } else {
      // Set some defaults or leave undefined if not applicable to the type
      if (values.type === "Програмне забезпечення") {
        assetDataToSave.version = "1.0.0";
        assetDataToSave.installationDate = new Date().toISOString().split('T')[0];
        assetDataToSave.lastUpdateDate = new Date().toISOString().split('T')[0];
      } else if (values.type === "Обладнання") {
        assetDataToSave.ipAddress = "N/A";
      } else if (values.type === "Інформація") {
         assetDataToSave.creationDate = new Date().toISOString().split('T')[0];
         assetDataToSave.lastAccessedDate = new Date().toISOString().split('T')[0];
         assetDataToSave.dataSensitivity = "Середня";
      }
    }


    try {
      if (editingAsset) {
        const assetDocRef = doc(db, "assets", editingAsset.id);
        await updateDoc(assetDocRef, assetDataToSave);
        toast({ title: "Успіх", description: "Актив оновлено." });
      } else {
        await addDoc(collection(db, "assets"), { ...assetDataToSave, weaknesses: [] });
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
        
        const batchOp = writeBatch(db);
        if (weaknessToRemove) {
           batchOp.update(assetDocRef, { weaknesses: arrayRemove(weaknessToRemove) });
        }
        const updatedWeakness = { ...editingWeakness, ...values }; 
        batchOp.update(assetDocRef, { weaknesses: arrayUnion(updatedWeakness) });
        await batchOp.commit();

        toast({ title: "Успіх", description: "Загрозу оновлено." });
      } else { 
        const newWeakness: Weakness = { 
            ...values, 
            id: doc(collection(db, 'weakness_ids')).id, 
            assetId: assetToManageWeakness.id 
        };
        await updateDoc(assetDocRef, { weaknesses: arrayUnion(newWeakness) });
        toast({ title: "Успіх", description: "Загрозу додано." });
      }
      await fetchAssets(true); 
      setIsWeaknessDialogOpen(false);
      setEditingWeakness(null);
      setAssetToManageWeakness(null); 
    } catch (error) {
      console.error("Error submitting weakness: ", error);
      toast({ title: "Помилка", description: "Не вдалося зберегти загрозу.", variant: "destructive" });
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
    const assetTypeKey = Object.keys(displayCategoryMap).find(key => displayCategoryMap[key as DisplayCategoryKey] === asset.type) as DisplayCategoryKey | undefined;
    if (assetTypeKey) {
        assetForm.reset({ ...asset, type: displayCategoryMap[assetTypeKey] });
    } else {
        assetForm.reset(asset);
    }
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
        toast({ title: "Помилка", description: "Загрозу не знайдено для видалення.", variant: "destructive" });
        return;
    }
    const message = `Ви впевнені, що хочете видалити загрозу "${weaknessToDelete.description}" для активу "${targetAsset.name}"?`;
    if (!confirm(message)) return;
    
    try {
        const assetRef = doc(db, "assets", targetAsset.id);
        await updateDoc(assetRef, { weaknesses: arrayRemove(weaknessToDelete) });
        toast({ title: "Успіх", description: "Загрозу видалено." });
        await fetchAssets(true); 
    } catch (error) {
        console.error("Error deleting weakness: ", error);
        toast({ title: "Помилка", description: "Не вдалося видалити загрозу.", variant: "destructive" });
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
                <div className="mb-4 text-sm text-muted-foreground space-y-1 border-t border-border pt-3">
                  <h4 className="font-medium text-foreground mb-2">Додаткова інформація:</h4>
                  {asset.type === 'Програмне забезпечення' && (
                    <>
                      {asset.version && <p><strong>Версія:</strong> {asset.version}</p>}
                      {asset.installationDate && <p><strong>Дата встановлення:</strong> {new Date(asset.installationDate).toLocaleDateString('uk-UA')}</p>}
                      {asset.lastUpdateDate && <p><strong>Останнє оновлення:</strong> {new Date(asset.lastUpdateDate).toLocaleDateString('uk-UA')}</p>}
                    </>
                  )}
                  {asset.type === 'Обладнання' && (
                    <>
                      {asset.ipAddress && <p><strong>IP-адреса:</strong> {asset.ipAddress}</p>}
                      {asset.macAddress && <p><strong>MAC-адреса:</strong> {asset.macAddress}</p>}
                      {asset.location && <p><strong>Розташування:</strong> {asset.location}</p>}
                    </>
                  )}
                  {asset.type === 'Інформація' && (
                    <>
                      {asset.dataSensitivity && <p><strong>Рівень чутливості:</strong> {asset.dataSensitivity}</p>}
                      {asset.storageLocation && <p><strong>Місце зберігання:</strong> {asset.storageLocation}</p>}
                      {asset.creationDate && <p><strong>Дата створення:</strong> {new Date(asset.creationDate).toLocaleDateString('uk-UA')}</p>}
                      {asset.lastAccessedDate && <p><strong>Останній доступ:</strong> {new Date(asset.lastAccessedDate).toLocaleDateString('uk-UA')}</p>}
                    </>
                  )}
                </div>
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
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditWeaknessDialog(asset, weakness)} aria-label={`Редагувати загрозу ${weakness.description}`}><Edit3 className="h-3.5 w-3.5" /></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteWeakness(asset, weakness.id)} aria-label={`Видалити загрозу ${weakness.description}`}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground mt-2">Для цього активу загроз не виявлено.</p>
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
                            disabled={
                                (!editingAsset && actualType !== displayCategoryMap[currentCategory]) || 
                                (!!editingAsset && field.value !== actualType && assetForm.formState.defaultValues?.type !== actualType)
                            }
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
            <DialogTitle>{editingWeakness ? "Редагувати загрозу" : "Додати нову загрозу"} для активу "{assetToManageWeakness?.name}"</DialogTitle>
          </DialogHeader>
           <Form {...weaknessForm}>
            <form onSubmit={weaknessForm.handleSubmit(handleWeaknessSubmit)} className="space-y-4">
              <FormField
                control={weaknessForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Опис загрози (вразливість + дії зловмисника)</FormLabel>
                    <FormControl><Textarea placeholder="напр., Вразливість: SQL-ін'єкція на веб-сервері. Дії зловмисника: Отримання доступу до бази даних клієнтів." {...field} /></FormControl>
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



"use client";

import { useState, useEffect } from 'react';
import type { Asset, Weakness } from '@/lib/types';
import { assetTypes, weaknessSeverities } from '@/lib/types';
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
import { PlusCircle, Edit3, Trash2, ShieldAlert, ListChecks, Server, Laptop, Database } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';

const assetFormSchema = z.object({
  name: z.string().min(1, "Назва обов'язкова"),
  type: z.enum(assetTypes), // assetTypes includes 'Персонал'
  description: z.string().min(1, "Опис обов'язковий"),
});

const weaknessFormSchema = z.object({
  description: z.string().min(1, "Опис обов'язковий"),
  severity: z.enum(weaknessSeverities),
});

const displayCategoryMap = {
  'Апаратні засоби': 'Обладнання',
  'Програмне забезпечення': 'Програмне забезпечення',
  'Інформаційні ресурси': 'Інформація',
} as const;
type DisplayCategoryKey = keyof typeof displayCategoryMap;
const categoryKeys = Object.keys(displayCategoryMap) as DisplayCategoryKey[];

const categoryIcons: Record<DisplayCategoryKey, React.ElementType> = {
  'Апаратні засоби': Server,
  'Програмне забезпечення': Laptop,
  'Інформаційні ресурси': Database,
};

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isAssetDialogOpen, setIsAssetDialogOpen] = useState(false);
  const [isWeaknessDialogOpen, setIsWeaknessDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [editingWeakness, setEditingWeakness] = useState<Weakness | null>(null);
  const [assetToManageWeakness, setAssetToManageWeakness] = useState<Asset | null>(null);
  const [currentCategory, setCurrentCategory] = useState<DisplayCategoryKey>(categoryKeys[0]);

  const [nextId, setNextId] = useState(0);
  useEffect(() => {
    setNextId(Date.now()); 
  }, []);

  const getUniqueId = () => {
    const currentId = nextId;
    setNextId(prev => prev + 1);
    return currentId.toString();
  };
  
  const assetForm = useForm<z.infer<typeof assetFormSchema>>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: { name: "", type: displayCategoryMap[currentCategory], description: "" },
  });

  const weaknessForm = useForm<z.infer<typeof weaknessFormSchema>>({
    resolver: zodResolver(weaknessFormSchema),
    defaultValues: { description: "", severity: "Середня" },
  });

  useEffect(() => {
    if (editingAsset) {
      assetForm.reset(editingAsset);
    } else {
      // When adding, ensure type is set by currentCategory
      assetForm.reset({ name: "", type: displayCategoryMap[currentCategory], description: "" });
    }
  }, [editingAsset, assetForm, currentCategory]);

  useEffect(() => {
    if (editingWeakness) {
      weaknessForm.reset(editingWeakness);
    } else {
      weaknessForm.reset({ description: "", severity: "Середня" });
    }
  }, [editingWeakness, weaknessForm]);

  const handleAssetSubmit = (values: z.infer<typeof assetFormSchema>) => {
    if (editingAsset) {
      setAssets(assets.map(asset => asset.id === editingAsset.id ? { ...asset, ...values } : asset));
    } else {
      setAssets([...assets, { ...values, id: getUniqueId(), weaknesses: [] }]);
    }
    setIsAssetDialogOpen(false);
    setEditingAsset(null);
  };

  const handleWeaknessSubmit = (values: z.infer<typeof weaknessFormSchema>) => {
    if (!assetToManageWeakness) return;

    const newWeakness = { ...values, id: getUniqueId(), assetId: assetToManageWeakness.id };
    
    setAssets(prevAssets => 
      prevAssets.map(asset => {
        if (asset.id === assetToManageWeakness.id) {
          const updatedWeaknesses = editingWeakness 
            ? (asset.weaknesses || []).map(w => w.id === editingWeakness.id ? newWeakness : w)
            : [...(asset.weaknesses || []), newWeakness];
          return { ...asset, weaknesses: updatedWeaknesses };
        }
        return asset;
      })
    );
    
    setIsWeaknessDialogOpen(false);
    setEditingWeakness(null);
  };

  const openAddAssetDialog = () => {
    setEditingAsset(null);
    assetForm.reset({ name: "", type: displayCategoryMap[currentCategory], description: "" });
    setIsAssetDialogOpen(true);
  };

  const openEditAssetDialog = (asset: Asset) => {
    setEditingAsset(asset);
    // Type of asset being edited might not match currentCategory, that's fine
    assetForm.reset(asset);
    setIsAssetDialogOpen(true);
  };

  const deleteAsset = (assetId: string) => {
    setAssets(assets.filter(asset => asset.id !== assetId));
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
  
  const deleteWeakness = (assetId: string, weaknessId: string) => {
    setAssets(prevAssets => 
      prevAssets.map(asset => {
        if (asset.id === assetId) {
          return { ...asset, weaknesses: (asset.weaknesses || []).filter(w => w.id !== weaknessId) };
        }
        return asset;
      })
    );
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
      <CardDescription>Каталогізуйте обладнання, програмне забезпечення та інформаційні активи вашої організації за категоріями.</CardDescription>

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

      {displayedAssets.length === 0 ? (
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
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
          {displayedAssets.map(asset => (
            <Card key={asset.id} className="flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="font-headline text-2xl">{asset.name}</CardTitle>
                    <Badge variant="secondary" className="mt-1">{asset.type}</Badge>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => openEditAssetDialog(asset)}><Edit3 className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteAsset(asset.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
                <CardDescription className="pt-2">{asset.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="weaknesses">
                    <AccordionTrigger className="text-base">
                      <div className="flex items-center">
                        <ShieldAlert className="mr-2 h-5 w-5 text-primary" />
                        Вразливості ({asset.weaknesses?.length || 0})
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      {asset.weaknesses && asset.weaknesses.length > 0 ? (
                        <ul className="space-y-2 mt-2">
                          {asset.weaknesses.map(weakness => (
                            <li key={weakness.id} className="p-3 rounded-md border bg-card/50 flex justify-between items-start">
                              <div>
                                <p className="font-semibold">{weakness.description}</p>
                                <Badge className={cn("text-xs", severityBadgeColor(weakness.severity))}>{weakness.severity}</Badge>
                              </div>
                              <div className="flex space-x-1">
                                <Button variant="ghost" size="sm" onClick={() => openEditWeaknessDialog(asset, weakness)}><Edit3 className="h-3 w-3" /></Button>
                                <Button variant="ghost" size="sm" onClick={() => deleteWeakness(asset.id, weakness.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
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

      <Dialog open={isAssetDialogOpen} onOpenChange={setIsAssetDialogOpen}>
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
                      value={field.value} // Ensure value is controlled
                      // defaultValue={displayCategoryMap[currentCategory]} // This is handled by form.reset
                    >
                      <FormControl><SelectTrigger><SelectValue placeholder="Виберіть тип активу" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {assetTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground pt-1">
                      Тип встановлено як "{displayCategoryMap[currentCategory]}" для поточної категорії. Ви можете змінити його, якщо потрібно.
                    </p>
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
                <DialogClose asChild><Button type="button" variant="outline">Скасувати</Button></DialogClose>
                <Button type="submit">{editingAsset ? "Зберегти зміни" : "Додати актив"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isWeaknessDialogOpen} onOpenChange={setIsWeaknessDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingWeakness ? "Редагувати вразливість" : "Додати нову вразливість"} для {assetToManageWeakness?.name}</DialogTitle>
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
                <DialogClose asChild><Button type="button" variant="outline">Скасувати</Button></DialogClose>
                <Button type="submit">{editingWeakness ? "Зберегти зміни" : "Додати вразливість"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

    
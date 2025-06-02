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
import { PlusCircle, Edit3, Trash2, ShieldAlert, ListChecks, AlertTriangle } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

const assetFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(assetTypes),
  description: z.string().min(1, "Description is required"),
});

const weaknessFormSchema = z.object({
  description: z.string().min(1, "Description is required"),
  severity: z.enum(weaknessSeverities),
});

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isAssetDialogOpen, setIsAssetDialogOpen] = useState(false);
  const [isWeaknessDialogOpen, setIsWeaknessDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [editingWeakness, setEditingWeakness] = useState<Weakness | null>(null);
  const [assetToManageWeakness, setAssetToManageWeakness] = useState<Asset | null>(null);

  // Hydration-safe unique ID generation
  const [nextId, setNextId] = useState(0);
  useEffect(() => {
    setNextId(Date.now()); // Initialize with a unique value on client
  }, []);

  const getUniqueId = () => {
    const currentId = nextId;
    setNextId(prev => prev + 1);
    return currentId.toString();
  };
  
  const assetForm = useForm<z.infer<typeof assetFormSchema>>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: { name: "", type: "Hardware", description: "" },
  });

  const weaknessForm = useForm<z.infer<typeof weaknessFormSchema>>({
    resolver: zodResolver(weaknessFormSchema),
    defaultValues: { description: "", severity: "Medium" },
  });

  useEffect(() => {
    if (editingAsset) {
      assetForm.reset(editingAsset);
    } else {
      assetForm.reset({ name: "", type: "Hardware", description: "" });
    }
  }, [editingAsset, assetForm]);

  useEffect(() => {
    if (editingWeakness) {
      weaknessForm.reset(editingWeakness);
    } else {
      weaknessForm.reset({ description: "", severity: "Medium" });
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
    assetForm.reset({ name: "", type: "Hardware", description: "" });
    setIsAssetDialogOpen(true);
  };

  const openEditAssetDialog = (asset: Asset) => {
    setEditingAsset(asset);
    assetForm.reset(asset);
    setIsAssetDialogOpen(true);
  };

  const deleteAsset = (assetId: string) => {
    setAssets(assets.filter(asset => asset.id !== assetId));
  };
  
  const openAddWeaknessDialog = (asset: Asset) => {
    setAssetToManageWeakness(asset);
    setEditingWeakness(null);
    weaknessForm.reset({ description: "", severity: "Medium" });
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
      case 'Critical': return 'bg-red-600 hover:bg-red-700';
      case 'High': return 'bg-orange-500 hover:bg-orange-600';
      case 'Medium': return 'bg-yellow-500 hover:bg-yellow-600 text-black';
      case 'Low': return 'bg-green-500 hover:bg-green-600';
      default: return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-headline">Asset Registry</h1>
        <Button onClick={openAddAssetDialog}><PlusCircle className="mr-2 h-4 w-4" /> Add Asset</Button>
      </div>
      <CardDescription>Catalog hardware, software, information, and personnel assets within your organization.</CardDescription>

      {assets.length === 0 ? (
        <Card className="text-center py-12">
          <CardHeader>
            <ListChecks className="mx-auto h-12 w-12 text-muted-foreground" />
            <CardTitle className="mt-4">No Assets Yet</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>Start by adding your first asset to the registry.</CardDescription>
            <Button onClick={openAddAssetDialog} className="mt-4"><PlusCircle className="mr-2 h-4 w-4" /> Add Asset</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
          {assets.map(asset => (
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
                        Weaknesses ({asset.weaknesses?.length || 0})
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
                        <p className="text-sm text-muted-foreground mt-2">No weaknesses identified for this asset.</p>
                      )}
                      <Button variant="outline" size="sm" className="mt-4" onClick={() => openAddWeaknessDialog(asset)}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Weakness
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
            <DialogTitle>{editingAsset ? "Edit Asset" : "Add New Asset"}</DialogTitle>
          </DialogHeader>
          <Form {...assetForm}>
            <form onSubmit={assetForm.handleSubmit(handleAssetSubmit)} className="space-y-4">
              <FormField
                control={assetForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asset Name</FormLabel>
                    <FormControl><Input placeholder="e.g., Main Web Server" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={assetForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asset Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select asset type" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {assetTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={assetForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl><Textarea placeholder="Describe the asset" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                <Button type="submit">{editingAsset ? "Save Changes" : "Add Asset"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isWeaknessDialogOpen} onOpenChange={setIsWeaknessDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingWeakness ? "Edit Weakness" : "Add New Weakness"} for {assetToManageWeakness?.name}</DialogTitle>
          </DialogHeader>
           <Form {...weaknessForm}>
            <form onSubmit={weaknessForm.handleSubmit(handleWeaknessSubmit)} className="space-y-4">
              <FormField
                control={weaknessForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weakness Description</FormLabel>
                    <FormControl><Textarea placeholder="e.g., Outdated OS version" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={weaknessForm.control}
                name="severity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Severity</FormLabel>
                     <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select severity" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {weaknessSeverities.map(sev => <SelectItem key={sev} value={sev}>{sev}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                <Button type="submit">{editingWeakness ? "Save Changes" : "Add Weakness"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

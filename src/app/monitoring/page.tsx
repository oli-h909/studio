
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { NetworkEvent, AssetAccessLog, RiskPresence } from '@/lib/types';
import { riskPresenceLevels, assetAccessLogActions, assetAccessLogStatuses } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, AlertTriangle, Info, ShieldX, RotateCw, Users, FileLock2, Network, Server, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const initialEventTypesUk = {
  firewallBlock: 'Блокування брандмауером',
  loginAttempt: 'Спроба входу',
  systemUpdate: 'Оновлення системи',
  dataLeak: 'Виявлено витік даних',
  malwareDetected: 'Виявлено шкідливе ПЗ',
};

const mockAssetNames = [
  "Файловий сервер Alpha", "База даних Gamma", "Контролер домену Epsilon",
  "SCADA PLC-101", "Веб-портал Omega", "VPN Шлюз Zeta", "Система IPS Delta"
];
const mockUserNames = ["admin_01", "operator_scada", "dev_user", "guest_network", "support_it"];


const generateMockNetworkEvent = (id: string): NetworkEvent => {
  const types = Object.values(initialEventTypesUk);
  const randomType = types[Math.floor(Math.random() * types.length)];
  const randomIp = () => `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
  
  let riskPresence: RiskPresence = riskPresenceLevels[Math.floor(Math.random() * riskPresenceLevels.length)];
  let relatedAsset: string | undefined = undefined;

  if (Math.random() > 0.3) { // 70% chance event is related to a known mock asset
    relatedAsset = mockAssetNames[Math.floor(Math.random() * mockAssetNames.length)];
    // If related to an asset, more likely to have risks detected
    riskPresence = Math.random() > 0.4 ? 'Ризик виявлено' : 'Ризиків не виявлено';
  } else {
    riskPresence = 'Актив не визначено';
  }


  return {
    id,
    timestamp: new Date(Date.now() - Math.random() * 60000).toISOString(), // events in the last minute
    type: randomType,
    sourceIp: randomType !== initialEventTypesUk.systemUpdate ? randomIp() : 'N/A',
    destinationIp: randomIp(),
    details: `Симульована подія: ${randomType}. ${relatedAsset ? 'Стосується активу: ' + relatedAsset + '.' : ''} Додаткові деталі можуть бути досить довгими, щоб перевірити перенос тексту та ширину колонки.`,
    riskPresence: riskPresence,
    relatedAsset: relatedAsset,
  };
};

const generateMockAssetAccessLog = (id: string): AssetAccessLog => {
  const randomAction = assetAccessLogActions[Math.floor(Math.random() * assetAccessLogActions.length)];
  const randomStatus = assetAccessLogStatuses[Math.floor(Math.random() * assetAccessLogStatuses.length)];
  const randomAsset = mockAssetNames[Math.floor(Math.random() * mockAssetNames.length)];
  const randomUser = mockUserNames[Math.floor(Math.random() * mockUserNames.length)];
  const randomIp = () => `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;

  return {
    id,
    timestamp: new Date(Date.now() - Math.random() * 60000).toISOString(),
    userName: randomUser,
    assetName: randomAsset,
    action: randomAction,
    status: randomStatus,
    ipAddress: randomIp(),
  };
};


export default function MonitoringPage() {
  const [networkEvents, setNetworkEvents] = useState<NetworkEvent[]>([]);
  const [assetAccessLogs, setAssetAccessLogs] = useState<AssetAccessLog[]>([]);
  const [isSimulating, setIsSimulating] = useState(true);
  
  const [nextEventId, setNextEventId] = useState(0);
  const [nextLogId, setNextLogId] = useState(0);

  useEffect(() => {
    const now = Date.now();
    const numInitialNetEvents = 20;
    const numInitialAccessLogs = 15;

    // Initial population for network events
    const initialNetEvents: NetworkEvent[] = [];
    for (let i = 0; i < numInitialNetEvents; i++) {
        initialNetEvents.push(generateMockNetworkEvent((now + i).toString()));
    }
    setNetworkEvents(initialNetEvents.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    setNextEventId(now + numInitialNetEvents); // Start next IDs after the initial ones

    // Initial population for asset access logs
    const initialAccessLogs: AssetAccessLog[] = [];
    const logIdBase = now + 100000; // Ensure base is different from event IDs
    for (let i = 0; i < numInitialAccessLogs; i++) {
        initialAccessLogs.push(generateMockAssetAccessLog((logIdBase + i).toString()));
    }
    setAssetAccessLogs(initialAccessLogs.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    setNextLogId(logIdBase + numInitialAccessLogs); // Start next IDs after the initial ones
  }, []);

  const getUniqueEventId = useCallback(() => {
    const currentId = nextEventId;
    setNextEventId(prev => prev + 1);
    return currentId.toString();
  }, [nextEventId]);

  const getUniqueLogId = useCallback(() => {
    const currentId = nextLogId;
    setNextLogId(prev => prev + 1);
    return currentId.toString();
  }, [nextLogId]);


  useEffect(() => {
    let networkIntervalId: NodeJS.Timeout;
    let accessLogIntervalId: NodeJS.Timeout;

    if (isSimulating) {
      networkIntervalId = setInterval(() => {
        setNetworkEvents(prevEvents => 
          [generateMockNetworkEvent(getUniqueEventId()), ...prevEvents.slice(0, 99)]
          .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        );
      }, 3000); 

      accessLogIntervalId = setInterval(() => {
        setAssetAccessLogs(prevLogs =>
          [generateMockAssetAccessLog(getUniqueLogId()), ...prevLogs.slice(0, 49)]
          .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        );
      }, 4500);
    }
    return () => {
      clearInterval(networkIntervalId);
      clearInterval(accessLogIntervalId);
    };
  }, [isSimulating, getUniqueEventId, getUniqueLogId]);

  const riskPresenceConfig: Record<RiskPresence, { icon: React.ElementType, color: string, badgeVariant: "default" | "secondary" | "destructive" | "outline" }> = {
    'Ризик виявлено': { icon: AlertTriangle, color: 'text-red-400', badgeVariant: 'destructive' },
    'Ризиків не виявлено': { icon: ShieldCheck, color: 'text-green-400', badgeVariant: 'outline' },
    'Актив не визначено': { icon: Info, color: 'text-blue-400', badgeVariant: 'secondary' },
  };

  const accessLogStatusConfig: Record<AssetAccessLog['status'], { color: string, badgeVariant: "default" | "secondary" | "destructive" | "outline" }> = {
    'Успішно': { color: 'text-green-400', badgeVariant: 'outline'},
    'Невдало': { color: 'text-red-400', badgeVariant: 'destructive'},
  };
   const accessLogActionIcons: Record<AssetAccessLog['action'], React.ElementType> = {
    'Вхід': Users,
    'Вихід': Users,
    'Спроба доступу': FileLock2,
    'Зміна конфігурації': Server,
  };


  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-headline">Моніторинг у реальному часі</h1>
        <Button onClick={() => setIsSimulating(!isSimulating)} variant="outline">
          <RotateCw className={cn("mr-2 h-4 w-4", isSimulating && "animate-spin")} />
          {isSimulating ? 'Призупинити симуляцію' : 'Відновити симуляцію'}
        </Button>
      </div>
      <CardDescription>Централізовані сенсори збирають дані про мережеві події та доступ до активів (симуляція).</CardDescription>
      
      <div className="grid lg:grid-cols-2 gap-6 flex-1 overflow-hidden">
        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Network className="mr-2 h-6 w-6 text-primary" />
              Стрічка мережевих подій
            </CardTitle>
            <CardDescription>Відображення останніх {networkEvents.length} мережевих подій.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead className="w-[160px]">Часова мітка</TableHead>
                    <TableHead>Тип</TableHead>
                    <TableHead>IP Джерела</TableHead>
                    <TableHead>IP Призначення</TableHead>
                    <TableHead>Деталі</TableHead>
                    <TableHead className="text-right w-[150px]">Наявність ризиків</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {networkEvents.map(event => {
                    const config = riskPresenceConfig[event.riskPresence];
                    const Icon = config.icon;
                    return (
                      <TableRow key={event.id}>
                        <TableCell><Icon className={cn("h-5 w-5", config.color)} /></TableCell>
                        <TableCell className="font-mono text-xs">{new Date(event.timestamp).toLocaleString('uk-UA')}</TableCell>
                        <TableCell>{event.type}</TableCell>
                        <TableCell className="font-mono text-xs">{event.sourceIp}</TableCell>
                        <TableCell className="font-mono text-xs">{event.destinationIp}</TableCell>
                        <TableCell className="text-sm max-w-sm truncate" title={event.details}>{event.details}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={config.badgeVariant} className={cn(config.color, 'border-current')}>{event.riskPresence}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="mr-2 h-6 w-6 text-primary" />
              Журнал доступу до активів
            </CardTitle>
            <CardDescription>Відображення останніх {assetAccessLogs.length} записів доступу.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead className="w-[160px]">Часова мітка</TableHead>
                    <TableHead>Користувач</TableHead>
                    <TableHead>Актив</TableHead>
                    <TableHead>Дія</TableHead>
                    <TableHead>IP Адреса</TableHead>
                    <TableHead className="text-right w-[100px]">Статус</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assetAccessLogs.map(log => {
                    const statusConfig = accessLogStatusConfig[log.status];
                    const ActionIcon = accessLogActionIcons[log.action] || Activity;
                    return (
                      <TableRow key={log.id}>
                        <TableCell><ActionIcon className="h-5 w-5 text-muted-foreground" /></TableCell>
                        <TableCell className="font-mono text-xs">{new Date(log.timestamp).toLocaleString('uk-UA')}</TableCell>
                        <TableCell>{log.userName}</TableCell>
                        <TableCell>{log.assetName}</TableCell>
                        <TableCell>{log.action}</TableCell>
                        <TableCell className="font-mono text-xs">{log.ipAddress}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={statusConfig.badgeVariant} className={cn(statusConfig.color, 'border-current')}>{log.status}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


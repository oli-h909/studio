"use client";

import { useState, useEffect, useCallback } from 'react';
import type { NetworkEvent } from '@/lib/types';
import { networkEventSeverities } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, AlertTriangle, Info, ShieldX, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const initialEventTypesUk = {
  firewallBlock: 'Блокування брандмауером',
  loginAttempt: 'Спроба входу',
  systemUpdate: 'Оновлення системи',
};

const initialEvents: NetworkEvent[] = [
  { id: '1', timestamp: new Date(Date.now() - 5000).toISOString(), type: initialEventTypesUk.firewallBlock, sourceIp: '192.168.1.100', destinationIp: '10.0.0.5', details: 'Заблоковано вихідне з’єднання з підозрілою IP-адресою', severity: 'Попередження' },
  { id: '2', timestamp: new Date(Date.now() - 10000).toISOString(), type: initialEventTypesUk.loginAttempt, sourceIp: '203.0.113.45', destinationIp: '172.16.0.10', details: 'Невдала спроба входу для користувача "admin"', severity: 'Помилка' },
  { id: '3', timestamp: new Date(Date.now() - 15000).toISOString(), type: initialEventTypesUk.systemUpdate, sourceIp: 'N/A', destinationIp: '172.16.0.20', details: 'Патч KB202345 успішно застосовано', severity: 'Інформація' },
];

const generateMockEvent = (id: string): NetworkEvent => {
  const types = ['Спроба входу', 'Блокування брандмауером', 'Виявлено шкідливе ПЗ', 'Оновлення системи', 'Сканування мережі'];
  const severities = networkEventSeverities; // Already Ukrainian from types.ts
  const randomType = types[Math.floor(Math.random() * types.length)];
  const randomSeverity = severities[Math.floor(Math.random() * severities.length)];
  const randomIp = () => `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;

  return {
    id,
    timestamp: new Date().toISOString(),
    type: randomType,
    sourceIp: randomType !== 'Оновлення системи' ? randomIp() : 'N/A',
    destinationIp: randomIp(),
    details: `Симульована подія: ${randomType} з рівнем серйозності ${randomSeverity}.`,
    severity: randomSeverity,
  };
};

export default function MonitoringPage() {
  const [events, setEvents] = useState<NetworkEvent[]>(initialEvents);
  const [isSimulating, setIsSimulating] = useState(true);
  
  const [nextEventId, setNextEventId] = useState(0);
  useEffect(() => {
    setNextEventId(Date.now()); 
  }, []);

  const getUniqueEventId = useCallback(() => {
    const currentId = nextEventId;
    setNextEventId(prev => prev + 1);
    return currentId.toString();
  }, [nextEventId]);


  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (isSimulating) {
      intervalId = setInterval(() => {
        setEvents(prevEvents => [generateMockEvent(getUniqueEventId()), ...prevEvents.slice(0, 99)]);
      }, 3000); 
    }
    return () => clearInterval(intervalId);
  }, [isSimulating, getUniqueEventId]);

  const severityConfig: Record<NetworkEvent['severity'], { icon: React.ElementType, color: string, badgeVariant: "default" | "secondary" | "destructive" | "outline" }> = {
    'Інформація': { icon: Info, color: 'text-blue-400', badgeVariant: 'outline' },
    'Попередження': { icon: AlertTriangle, color: 'text-yellow-400', badgeVariant: 'secondary' },
    'Помилка': { icon: ShieldX, color: 'text-orange-400', badgeVariant: 'destructive' },
    'Критична': { icon: ShieldX, color: 'text-red-500', badgeVariant: 'destructive' },
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
      <CardDescription>Централізовані сенсори збирають дані про мережеві події в реальному часі (симуляція).</CardDescription>
      
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="mr-2 h-6 w-6 text-primary" />
            Стрічка мережевих подій
          </CardTitle>
          <CardDescription>Відображення останніх {events.length} подій.</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead className="w-[180px]">Часова мітка</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>IP-адреса джерела</TableHead>
                  <TableHead>IP-адреса призначення</TableHead>
                  <TableHead>Деталі</TableHead>
                  <TableHead className="text-right w-[100px]">Серйозність</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map(event => {
                  const config = severityConfig[event.severity];
                  const Icon = config.icon;
                  return (
                    <TableRow key={event.id}>
                      <TableCell><Icon className={cn("h-5 w-5", config.color)} /></TableCell>
                      <TableCell className="font-mono text-xs">{new Date(event.timestamp).toLocaleString()}</TableCell>
                      <TableCell>{event.type}</TableCell>
                      <TableCell className="font-mono text-xs">{event.sourceIp}</TableCell>
                      <TableCell className="font-mono text-xs">{event.destinationIp}</TableCell>
                      <TableCell className="text-sm">{event.details}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={config.badgeVariant} className={cn(config.color, 'border-current')}>{event.severity}</Badge>
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
  );
}

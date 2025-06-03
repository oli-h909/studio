
export interface Asset {
  id: string;
  name: string;
  type: 'Обладнання' | 'Програмне забезпечення' | 'Інформація';
  description: string;
  weaknesses?: Weakness[];

  // New fields for Software
  version?: string;
  installationDate?: string; // ISO Date string e.g., "2023-10-26"
  lastUpdateDate?: string; // ISO Date string e.g., "2024-01-15"

  // New fields for Hardware
  ipAddress?: string;
  macAddress?: string;
  location?: string; // e.g., "Серверна кімната 1, Стійка А2"

  // New fields for Information
  dataSensitivity?: 'Низька' | 'Середня' | 'Висока' | 'Дуже висока';
  storageLocation?: string; // e.g., "База даних PostgreSQL", "Файловий сервер X"
  creationDate?: string; // ISO Date string e.g., "2022-05-20"
  lastAccessedDate?: string; // ISO Date string e.g., "2024-07-01"
}

export interface Weakness {
  id: string;
  assetId: string; // To link back to the asset
  description: string;
  severity: 'Низька' | 'Середня' | 'Висока' | 'Критична';
}

export type RiskPresence = 'Ризик виявлено' | 'Ризиків не виявлено' | 'Актив не визначено';

export interface NetworkEvent {
  id: string;
  timestamp: string; // ISO string
  type: string;
  sourceIp: string;
  destinationIp: string;
  details: string;
  riskPresence: RiskPresence;
  relatedAsset?: string; // Optional: name of the asset related to the event
}

export interface AssetAccessLog {
  id: string;
  timestamp: string; // ISO string
  userName: string;
  assetName: string;
  action: 'Вхід' | 'Вихід' | 'Спроба доступу' | 'Зміна конфігурації';
  status: 'Успішно' | 'Невдало';
  ipAddress: string;
}

export const assetTypes: Asset['type'][] = ['Обладнання', 'Програмне забезпечення', 'Інформація'];
export const weaknessSeverities: Weakness['severity'][] = ['Низька', 'Середня', 'Висока', 'Критична'];
export const riskPresenceLevels: RiskPresence[] = ['Ризик виявлено', 'Ризиків не виявлено', 'Актив не визначено'];
export const assetAccessLogActions: AssetAccessLog['action'][] = ['Вхід', 'Вихід', 'Спроба доступу', 'Зміна конфігурації'];
export const assetAccessLogStatuses: AssetAccessLog['status'][] = ['Успішно', 'Невдало'];


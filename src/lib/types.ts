
export interface Asset {
  id: string;
  name: string;
  type: 'Обладнання' | 'Програмне забезпечення' | 'Інформація' | 'Персонал';
  description: string;
  weaknesses?: Weakness[];
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
  // severity: 'Інформація' | 'Попередження' | 'Помилка' | 'Критична'; // Replaced by riskPresence
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

export const assetTypes: Asset['type'][] = ['Обладнання', 'Програмне забезпечення', 'Інформація', 'Персонал'];
export const weaknessSeverities: Weakness['severity'][] = ['Низька', 'Середня', 'Висока', 'Критична'];
// export const networkEventSeverities: NetworkEvent['severity'][] = ['Інформація', 'Попередження', 'Помилка', 'Критична']; // No longer used
export const riskPresenceLevels: RiskPresence[] = ['Ризик виявлено', 'Ризиків не виявлено', 'Актив не визначено'];
export const assetAccessLogActions: AssetAccessLog['action'][] = ['Вхід', 'Вихід', 'Спроба доступу', 'Зміна конфігурації'];
export const assetAccessLogStatuses: AssetAccessLog['status'][] = ['Успішно', 'Невдало'];

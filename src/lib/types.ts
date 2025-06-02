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

export interface NetworkEvent {
  id: string;
  timestamp: string; // ISO string
  type: string; 
  sourceIp: string;
  destinationIp: string;
  details: string;
  severity: 'Інформація' | 'Попередження' | 'Помилка' | 'Критична';
}

export const assetTypes: Asset['type'][] = ['Обладнання', 'Програмне забезпечення', 'Інформація', 'Персонал'];
export const weaknessSeverities: Weakness['severity'][] = ['Низька', 'Середня', 'Висока', 'Критична'];
export const networkEventSeverities: NetworkEvent['severity'][] = ['Інформація', 'Попередження', 'Помилка', 'Критична'];

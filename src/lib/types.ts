export interface Asset {
  id: string;
  name: string;
  type: 'Hardware' | 'Software' | 'Information' | 'Personnel';
  description: string;
  weaknesses?: Weakness[];
}

export interface Weakness {
  id: string;
  assetId: string; // To link back to the asset
  description: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
}

export interface NetworkEvent {
  id: string;
  timestamp: string; // ISO string
  type: string; 
  sourceIp: string;
  destinationIp: string;
  details: string;
  severity: 'Info' | 'Warning' | 'Error' | 'Critical';
}

export const assetTypes: Asset['type'][] = ['Hardware', 'Software', 'Information', 'Personnel'];
export const weaknessSeverities: Weakness['severity'][] = ['Low', 'Medium', 'High', 'Critical'];
export const networkEventSeverities: NetworkEvent['severity'][] = ['Info', 'Warning', 'Error', 'Critical'];

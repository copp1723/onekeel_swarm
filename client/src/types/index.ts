export type ViewType = 
  | 'dashboard'
  | 'leads'
  | 'conversations'
  | 'branding'
  | 'agents'
  | 'campaigns'
  | 'clients'
  | 'templates';

export interface User {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  role: 'admin' | 'manager' | 'agent' | 'viewer';
  active: boolean;
}

export interface Lead {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Campaign {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
} 
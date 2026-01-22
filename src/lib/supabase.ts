import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gyzbnxcuzdarxmjnsqzz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5emJueGN1emRhcnhtam5zcXp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0NTQ5OTksImV4cCI6MjA4NDAzMDk5OX0.ISAjhajPYxta3lCPpaWtSuKfom5Ko-SXU5B6fguZMV8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface ValidUser {
  id: number;
  uid: string;
  name: string;
  roll_number: string;
  created_at: string;
}

export interface Device {
  id: number;
  device_id: string;
  place_name: string;
  can_register: boolean;
  is_active: boolean;
  created_at: string;
  last_seen: string;
}

export interface AdminTableEntry {
  id: number;
  uid: string;
  name: string;
  roll_number: string;
  main_gate: number;
  library: number;
  gym: number;
  last_updated: string;
  last_device: string | null;
}

export interface MasterLog {
  id: number;
  uid: string;
  name: string;
  roll_number: string;
  place_name: string;
  status: 'IN' | 'OUT';
  timestamp: string;
  device_id: string | null;
  synced_at: string;
}

export interface CurrentStatus {
  id: number;
  uid: string;
  name: string;
  roll_number: string;
  last_out_time: string;
  device_id: string | null;
  updated_at: string;
}

export interface RFIDLog {
  id: number;
  name: string;
  timestamp: string;
  status: 'IN' | 'OUT';
}

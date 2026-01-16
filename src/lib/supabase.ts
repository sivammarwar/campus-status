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

export interface CurrentStatus {
  id: number;
  uid: string;
  name: string;
  roll_number: string;
  last_out_time: string;
  device_id: string | null;
  updated_at: string;
}

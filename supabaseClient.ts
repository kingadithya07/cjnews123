
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

/**
 * Supabase Configuration
 * Integrated with the project backend using the provided credentials.
 */
const supabaseUrl = 'https://agdfgesflpzvuuwkczwa.supabase.co';
const supabaseAnonKey = 'sb_publishable_EWKPxJpl_lHwxyQnx9MhyA_RziwJIjM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

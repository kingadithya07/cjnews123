
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

/**
 * Supabase Configuration
 * Integrated with the project backend using the provided credentials.
 */
const supabaseUrl = 'https://wpfzfozfxtwdaejramfz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwZnpmb3pmeHR3ZGFlanJhbWZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2NjExNzMsImV4cCI6MjA4MjIzNzE3M30.Bd6IbBcd_KgcgkfYGPvGUbqsfnlNuhJP5q-6p8BHQVk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

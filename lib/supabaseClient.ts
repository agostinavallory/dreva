import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://cvupxejjghjuztovggib.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2dXB4ZWpqZ2hqdXp0b3ZnZ2liIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2MzEwMTYsImV4cCI6MjA5MzIwNzAxNn0.6AHSNHAXbY6Z-by69R2gOxwcd8GwNyf2z-ScnSQQV8s';

export const supabase = createClient(supabaseUrl, supabaseKey);


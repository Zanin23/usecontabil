// Substitui "npm:@supabase/supabase-js@2/cors" (especificador do Deno) nos testes das funções de borda.
export const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

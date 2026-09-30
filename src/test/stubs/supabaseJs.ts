// Substitui "npm:@supabase/supabase-js@2" (especificador do Deno) nos testes das funções de borda.
// Cada teste injeta o cliente simulado em globalThis.__createClientFalso.
type Fabrica = (...args: unknown[]) => unknown;
export const createClient = (...args: unknown[]) => (globalThis as unknown as { __createClientFalso: Fabrica }).__createClientFalso(...args);

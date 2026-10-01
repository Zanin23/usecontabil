import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  EMPRESA_ATUAL_KEY as SELECTED_KEY, EMPRESAS_EVENT, loadEmpresas, sincronizarEmpresas, type EmpresaRecord, getEmpresa
} from "@/lib/empresasStore";
export { getEmpresa };

const EVENTO_PRATICA = "usecontabil:pratica-changed";

export type EmpresaOption = {
  id: string;
  razao: string;
  cnpj: string;
  regime: string;
};

type Ctx = {
  empresas: EmpresaOption[];
  empresaId: string | null;
  empresa: EmpresaOption | null;
  setEmpresaId: (id: string) => void;
};

const EmpresaContext = createContext<Ctx | null>(null);

function toOption(e: EmpresaRecord): EmpresaOption {
  return { id: e.id, razao: e.razao, cnpj: e.cnpj, regime: e.regime };
}

export function EmpresaProvider({ children }: { children: ReactNode }) {
  const [empresas, setEmpresas] = useState<EmpresaOption[]>(() => loadEmpresas().map(toOption));
  const [empresaId, setEmpresaIdState] = useState<string | null>(() => {
    const suf = typeof window !== "undefined" && localStorage.getItem("uc:pratica:ativo") === "1" ? ".pratica" : "";
    return localStorage.getItem(SELECTED_KEY + suf);
  });

  useEffect(() => {
    const refresh = () => {
      const list = loadEmpresas().map(toOption);
      setEmpresas(list);
      
      const suf = typeof window !== "undefined" && localStorage.getItem("uc:pratica:ativo") === "1" ? ".pratica" : "";
      const stored = localStorage.getItem(SELECTED_KEY + suf);
      if (stored !== empresaId) {
        setEmpresaIdState(stored);
      }
    };
    
    window.addEventListener(EMPRESAS_EVENT, refresh);
    window.addEventListener(EVENTO_PRATICA, refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);

    // Carrega da nuvem sempre que houver sessão (login, refresh de token, F5).
    const puxar = () => {
      sincronizarEmpresas()
        .then(refresh)
        .catch(() => {
          /* offline: segue com o cache local */
        });
    };
    puxar();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) puxar();
      else refresh();
    });

    return () => {
      sub.subscription.unsubscribe();
      window.removeEventListener(EMPRESAS_EVENT, refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);


  // Keep the selection valid whenever the list changes.
  useEffect(() => {
    const suf = typeof window !== "undefined" && localStorage.getItem("uc:pratica:ativo") === "1" ? ".pratica" : "";
    const currentKey = SELECTED_KEY + suf;

    if (empresas.length === 0) {
      // Lista vazia (ex.: navegador novo ainda carregando da nuvem): mantém a seleção salva — antes ela
      // era apagada aqui e a empresa escolhida nunca voltava, caindo sempre na primeira da lista.
      if (empresaId !== null) setEmpresaIdState(null);
      return;
    }
    if (!empresaId || !empresas.some((e) => e.id === empresaId)) {
      const salvo = localStorage.getItem(currentKey);
      const next = (empresas.find((e) => e.id === salvo) ?? empresas[0]).id;
      setEmpresaIdState(next);
      localStorage.setItem(currentKey, next);
    }
  }, [empresas, empresaId]);

  const value = useMemo<Ctx>(() => {
    const setEmpresaId = (id: string) => {
      setEmpresaIdState(id);
      const suf = typeof window !== "undefined" && localStorage.getItem("uc:pratica:ativo") === "1" ? ".pratica" : "";
      localStorage.setItem(SELECTED_KEY + suf, id);
    };
    return {
      empresas,
      empresaId,
      empresa: empresas.find((e) => e.id === empresaId) ?? null,
      setEmpresaId,
    };
  }, [empresas, empresaId]);

  return <EmpresaContext.Provider value={value}>{children}</EmpresaContext.Provider>;
}

export function useEmpresaAtual() {
  const ctx = useContext(EmpresaContext);
  if (!ctx) throw new Error("useEmpresaAtual must be used within EmpresaProvider");
  return ctx;
}

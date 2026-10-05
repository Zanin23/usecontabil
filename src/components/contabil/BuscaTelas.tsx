import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
  Dialog, DialogContent, DialogTitle,
} from "@/design-system/mj-design-system-db98fa";
import {
  LayoutDashboard, LayoutGrid, Building2, CornerDownLeft, GraduationCap, BookOpen, Library,
  FlaskConical, type LucideIcon,
} from "lucide-react";
import { AREAS } from "@/lib/contabilNav";
import { SECOES } from "@/lib/ux/navModelo";
import { rotaVisao } from "@/lib/ux/visoes";
import { GLOSSARIO } from "@/lib/aprendizado/glossario";
import { LICOES } from "@/lib/aprendizado/conteudo";


export type TelaBusca = {
  path: string;
  titulo: string;
  grupo: string;
  desc?: string;
  icon: LucideIcon;
  termos: string;
};

const normalizar = (v: string) =>
  v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function useTelas(): TelaBusca[] {
  return useMemo(() => {
    const lista: TelaBusca[] = [
      {
        path: "/dashboard",
        titulo: "Dashboard",
        grupo: "Geral",
        desc: "Visão geral do período",
        icon: LayoutDashboard,
        termos: "dashboard inicio painel indicadores",
      },
      {
        path: "/preparativos/cadastros/empresas/novo",
        titulo: "Nova empresa",
        grupo: "Geral",
        desc: "Cadastro de empresa do grupo",
        icon: Building2,
        termos: "nova empresa cadastro cnpj",
      },
    ];

    for (const area of AREAS) {
      lista.push({
        path: `/${area.slug}`,
        titulo: area.title,
        grupo: "Áreas",
        desc: area.blurb,
        icon: area.icon,
        termos: `${area.title} ${area.code} ${area.eyebrow}`,
      });
      for (const cat of area.categories) {
        lista.push({
          path: `/${area.slug}/${cat.slug}`,
          titulo: cat.title,
          grupo: area.title,
          desc: `${cat.modules.length} telas`,
          icon: area.icon,
          termos: `${area.title} ${cat.title}`,
        });
        for (const mod of cat.modules) {
          lista.push({
            path: `/${area.slug}/${cat.slug}/${mod.slug}`,
            titulo: mod.title,
            grupo: `${area.title} › ${cat.title}`,
            desc: mod.desc,
            icon: mod.icon,
            termos: `${area.title} ${cat.title} ${mod.title} ${mod.desc}`,
          });
        }
      }
    }
    // Catálogo de telas: a vista de conjunto de cada seção e o índice completo.
    lista.push({
      path: rotaVisao(),
      titulo: "Catálogo de telas",
      grupo: "Geral",
      desc: "Todas as telas do sistema em uma página, com busca e filtro por pendência",
      icon: LayoutGrid,
      termos: "catalogo todas as telas modulos indice visao geral lista completa",
    });
    for (const secao of SECOES) {
      const quantidade = secao.subgrupos.reduce((n, sub) => n + sub.itens.length, 0);
      lista.push({
        path: rotaVisao(secao.id),
        titulo: `Visão geral · ${secao.titulo}`,
        grupo: "Catálogo de telas",
        desc: `${quantidade} telas de ${secao.titulo.toLowerCase()}`,
        icon: secao.icon,
        termos: `visao geral catalogo ${secao.titulo} ${secao.codigo} ${secao.resumo} ${quantidade} telas modulos`,
      });
    }

    // Navegação por processo (mesma do menu lateral): agrupa as telas como o
    // usuário trabalha, e não pela estrutura interna de áreas.
    for (const secao of SECOES) {
      for (const sub of secao.subgrupos) {
        for (const item of sub.itens) {
          lista.push({
            path: item.rota,
            titulo: item.titulo,
            grupo: sub.titulo ? `${secao.titulo} › ${sub.titulo}` : secao.titulo,
            desc: item.desc,
            icon: item.icon,
            termos: `${secao.titulo} ${sub.titulo ?? ""} ${item.titulo} ${item.desc ?? ""} ${item.rota}`,
          });
        }
      }
    }

    lista.push(
      {
        path: "/aprender",
        titulo: "Central de Aprendizado",
        grupo: "Aprender",
        desc: "Trilhas, glossário e modo prática",
        icon: GraduationCap,
        termos: "aprender aprendizado central trilhas estudo treinamento ajuda",
      },
      {
        path: "/aprender/glossario",
        titulo: "Glossário técnico",
        grupo: "Aprender",
        desc: `${GLOSSARIO.length} termos contábeis e fiscais`,
        icon: Library,
        termos: "glossario termos siglas dicionario conceitos",
      },
      {
        path: "/aprender/pratica",
        titulo: "Modo prática (sandbox)",
        grupo: "Aprender",
        desc: "Rodar os motores com dados fictícios",
        icon: FlaskConical,
        termos: "pratica sandbox laboratorio simulacao teste estudo",
      },
    );

    for (const licao of LICOES) {
      lista.push({
        path: `/aprender/licao/${licao.slug}`,
        titulo: licao.titulo,
        grupo: "Aprender › Lições",
        desc: licao.resumo,
        icon: BookOpen,
        termos: `licao aprender ${licao.titulo} ${licao.resumo} ${licao.termos.join(" ")}`,
      });
    }

    for (const termo of GLOSSARIO) {
      lista.push({
        path: `/aprender/glossario?termo=${termo.slug}`,
        titulo: termo.termo,
        grupo: "Aprender › Glossário",
        desc: termo.resumo,
        icon: Library,
        termos: `glossario ${termo.termo} ${termo.siglaDe ?? ""} ${termo.resumo}`,
      });
    }

    return lista;
  }, []);
}


export default function BuscaTelas({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const telas = useTelas();
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");

  useEffect(() => {
    if (!open) setBusca("");
  }, [open]);

  const grupos = useMemo(() => {
    const termo = normalizar(busca.trim());
    const filtradas = termo
      ? telas.filter((t) => normalizar(`${t.termos} ${t.path}`).includes(termo))
      : telas.slice(0, 24);

    const mapa = new Map<string, TelaBusca[]>();
    for (const t of filtradas.slice(0, 120)) {
      const atual = mapa.get(t.grupo) ?? [];
      atual.push(t);
      mapa.set(t.grupo, atual);
    }
    return [...mapa.entries()];
  }, [telas, busca]);

  const abrir = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 max-w-2xl">
        <DialogTitle className="sr-only">Buscar telas</DialogTitle>
        <Command shouldFilter={false} className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]]:px-2">
      <CommandInput
        placeholder="Buscar telas, módulos e cadastros…"
        value={busca}
        onValueChange={setBusca}
      />
      <CommandList className="max-h-[60vh]">
        <CommandEmpty>Nenhuma tela encontrada.</CommandEmpty>
        {grupos.map(([grupo, itens]) => (
          <CommandGroup key={grupo} heading={grupo}>
            {itens.map((t) => {
              const Icon = t.icon;
              return (
                <CommandItem
                  key={t.path}
                  value={`${t.termos} ${t.path}`}
                  onSelect={() => abrir(t.path)}
                  className="gap-3"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card">
                    <Icon className="h-4 w-4 text-brand-orange" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-foreground">{t.titulo}</span>
                    {t.desc && (
                      <span className="block truncate text-xs text-muted-foreground">{t.desc}</span>
                    )}
                  </span>
                  <CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground" />
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}
      </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

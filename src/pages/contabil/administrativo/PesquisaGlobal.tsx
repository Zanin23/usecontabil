import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Lock, Search } from "lucide-react";
import {
  Badge, Card, CardContent, Input,
} from "@/design-system/mj-design-system-db98fa";
import { DOMINIOS, pesquisaGlobal, useRegistrarAcesso } from "@/lib/adminStore";

export default function PesquisaGlobalPage() {
  useRegistrarAcesso("Administrativo · Pesquisa global");
  const [termo, setTermo] = useState("");
  const resultados = useMemo(() => pesquisaGlobal(termo), [termo]);

  const porDominio = DOMINIOS.map((d) => ({
    dominio: d,
    itens: resultados.filter((r) => r.dominio === d.slug),
  })).filter((g) => g.itens.length);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Administrativo</div>
        <h1 className="mt-2 font-display text-4xl">
          Pesquisa <span className="text-brand-orange">global.</span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Busque por nome, código, CNPJ, CPF, NCM, conta, banco, produto, fornecedor, cliente,
          plano gerencial ou categoria. Resultados agrupados por tipo de cadastro.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          placeholder="Digite ao menos 2 caracteres…"
          className="h-12 rounded-full pl-11 text-base"
        />
      </div>

      {termo.trim().length >= 2 && (
        <div className="text-xs text-muted-foreground">
          {resultados.length} resultados em {porDominio.length} cadastros
        </div>
      )}

      <div className="space-y-5">
        {porDominio.map(({ dominio, itens }) => (
          <Card key={dominio.slug} className="rounded-xl border-border/70">
            <CardContent className="space-y-2 p-5">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">{dominio.titulo}</div>
                <Badge className="rounded-full border-0 bg-muted text-muted-foreground">
                  <Lock className="mr-1 h-3 w-3" /> {itens.length} resultados
                </Badge>
              </div>
              {itens.map((r) => (
                <Link
                  key={`${r.dominio}-${r.chave}`}
                  to={`/administrativo/cadastros/${r.dominio}`}
                  className="block rounded-2xl border border-border/70 px-4 py-3 transition-colors hover:bg-muted/50"
                >
                  <div className="text-sm">{r.titulo}</div>
                  <div className="text-xs text-muted-foreground">{r.subtitulo}</div>
                </Link>
              ))}
            </CardContent>
          </Card>
        ))}
        {termo.trim().length >= 2 && !resultados.length && (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Nenhum cadastro encontrado para “{termo}”.
          </div>
        )}
      </div>
    </div>
  );
}

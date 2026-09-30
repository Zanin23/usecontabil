import { useState } from "react";
import { toast } from "sonner";
import { DatabaseBackup } from "lucide-react";
import {
  Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/design-system/mj-design-system-db98fa";
import { candidatosDeCadastrosAntigos, importarCadastrosAntigos, type CandidatosImportacao } from "@/lib/cadastrosStore";

/**
 * Traz para os cadastros novos o que já existia no sistema: Financeiro › Clientes e fornecedores,
 * Produtos e Serviços, e os participantes/itens dos documentos fiscais já lançados.
 */
export default function ImportarCadastrosAntigos() {
  const [aberto, setAberto] = useState(false);
  const [c, setC] = useState<CandidatosImportacao | null>(null);

  const abrir = () => {
    setC(candidatosDeCadastrosAntigos());
    setAberto(true);
  };

  const importar = () => {
    if (!c) return;
    try {
      const r = importarCadastrosAntigos(c);
      toast.success(`Importados ${r.participantes} cliente(s)/fornecedor(es) e ${r.produtos} produto(s)/serviço(s).`, {
        description: "Revise os cadastros marcados com pendência (ex.: NCM, UF ou inscrição estadual).",
      });
      setAberto(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível importar.");
    }
  };

  const nada = c && c.participantes.length === 0 && c.produtos.length === 0;

  return (
    <>
      <Button variant="outline" className="rounded-full" onClick={abrir}>
        <DatabaseBackup className="mr-2 h-4 w-4" /> Trazer cadastros existentes
      </Button>
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Trazer cadastros existentes</DialogTitle>
            <DialogDescription>
              Procura clientes, fornecedores, produtos e serviços já digitados no sistema (Financeiro › Cadastros e
              documentos fiscais lançados) que ainda não estão aqui. Nada é apagado das telas antigas.
            </DialogDescription>
          </DialogHeader>
          {c ? (
            <div className="space-y-3 text-sm">
              {nada ? (
                <p className="rounded-2xl bg-muted p-3 text-muted-foreground">Nenhum cadastro novo encontrado — está tudo aqui.</p>
              ) : (
                <ul className="space-y-1.5">
                  <li className="flex justify-between rounded-xl bg-muted/60 px-3 py-2">
                    <span>Clientes e fornecedores</span>
                    <strong className="font-mono">{c.participantes.length}</strong>
                  </li>
                  <li className="flex justify-between rounded-xl bg-muted/60 px-3 py-2">
                    <span>Produtos e serviços</span>
                    <strong className="font-mono">{c.produtos.length}</strong>
                  </li>
                </ul>
              )}
              <p className="text-xs text-muted-foreground">
                Origem: {c.fontes.cadastrosAntigos} de cadastros antigos, {c.fontes.documentos} de documentos fiscais e{" "}
                {c.fontes.servicos} do catálogo de serviços.
                {c.documentosInvalidos
                  ? ` ${c.documentosInvalidos} registro(s) com CNPJ/CPF inválido ficaram de fora — corrija e cadastre manualmente.`
                  : ""}
              </p>
            </div>
          ) : null}
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-full" onClick={() => setAberto(false)}>Fechar</Button>
            <Button className="rounded-full" disabled={!c || !!nada} onClick={importar}>Importar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

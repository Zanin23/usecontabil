import { useParams } from "react-router-dom";
import { getDominio } from "@/lib/adminStore";
import CadastroAnaliticoView from "@/components/contabil/CadastroAnaliticoView";

export default function DominioPage() {
  const { dominio } = useParams();
  const d = getDominio(dominio);
  if (!d) return <div className="py-24 text-center text-muted-foreground">Domínio cadastral não encontrado.</div>;
  return <CadastroAnaliticoView key={d.slug} dominio={d} />;
}

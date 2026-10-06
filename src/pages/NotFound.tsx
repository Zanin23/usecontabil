import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: rota inexistente:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="space-y-3 py-24 text-center">
      <h1 className="font-display text-3xl">Página não encontrada</h1>
      <p className="text-muted-foreground">
        A rota <span className="font-mono">{location.pathname}</span> não existe no sistema.
      </p>
      <Link to="/dashboard" className="text-sm underline underline-offset-4 hover:text-foreground">
        Voltar ao início
      </Link>
    </div>
  );
};

export default NotFound;

import { Navigate, useLocation } from "react-router-dom";
import { useAuthUser } from "@/lib/useAuthUser";

/**
 * Gate that ensures the user is signed in before rendering children.
 * While the session is being resolved we render nothing (avoids a flash
 * of the protected UI). When signed out, we redirect to /auth and pass
 * the originally-requested path as ?redirect=… so Auth can send the
 * user back after sign-in.
 */
export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthUser();
  const location = useLocation();

  if (loading) return null;
  if (!user) {
    const redirect = location.pathname + location.search;
    return <Navigate to={`/auth?redirect=${encodeURIComponent(redirect)}`} replace />;
  }
  return <>{children}</>;
}
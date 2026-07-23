import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Home from "./pages/Home.tsx";
import Landing from "./pages/Landing.tsx";
import { Toaster } from "./design-system/mj-design-system-db98fa";
import RequireAuth from "./components/RequireAuth.tsx";



const RELOAD_KEY = "__lovable_chunk_reload";
const lazyWithReload = <T extends { default: React.ComponentType<any> }>(
  factory: () => Promise<T>
) =>
  lazy(() =>
    factory().catch((err) => {
      const msg = String(err?.message || err);
      const isChunkErr =
        /Importing a module script failed|Failed to fetch dynamically imported module|ChunkLoadError|Loading chunk \d+ failed/i.test(msg);
      if (isChunkErr && !sessionStorage.getItem(RELOAD_KEY)) {
        sessionStorage.setItem(RELOAD_KEY, "1");
        window.location.reload();
        return new Promise<T>(() => {});
      }
      throw err;
    })
  );

if (typeof window !== "undefined") {
  setTimeout(() => sessionStorage.removeItem(RELOAD_KEY), 5000);
}

const NotFound = lazyWithReload(() => import("./pages/NotFound.tsx"));
const Admin = lazyWithReload(() => import("./pages/Admin.tsx"));
const AdminKnowledge = lazyWithReload(() => import("./pages/AdminKnowledge.tsx"));
const AdminSettings = lazyWithReload(() => import("./pages/AdminSettings.tsx"));
const Call = lazyWithReload(() => import("./pages/Call.tsx"));
const SessionReport = lazyWithReload(() => import("./pages/SessionReport.tsx"));
const Auth = lazyWithReload(() => import("./pages/Auth.tsx"));
const Create = lazyWithReload(() => import("./pages/Create.tsx"));
const Edit = lazyWithReload(() => import("./pages/Edit.tsx"));
const Leaderboard = lazyWithReload(() => import("./pages/Leaderboard.tsx"));
const Library = lazyWithReload(() => import("./pages/Library.tsx"));
const RehearsalReport = lazyWithReload(() => import("./pages/RehearsalReport.tsx"));
const AdminAdmins = lazyWithReload(() => import("./pages/AdminAdmins.tsx"));
const RolePlayDeepLink = lazyWithReload(() => import("./pages/RolePlayDeepLink.tsx"));
const RolePlayStats = lazyWithReload(() => import("./pages/RolePlayStats.tsx"));
const AdminShell = lazyWithReload(() => import("./components/AdminShell.tsx"));
const AdminReporting = lazyWithReload(() => import("./components/AdminReporting.tsx"));
const Setup = lazyWithReload(() => import("./pages/Setup.tsx"));


const App = () => (
  <BrowserRouter>
    <Toaster />
    
    <Suspense fallback={null}>

    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route path="/setup" element={<RequireAuth><Setup /></RequireAuth>} />
      <Route path="/" element={<Landing />} />
      <Route path="/practice" element={<RequireAuth><Home /></RequireAuth>} />
      <Route path="/home" element={<RequireAuth><Home /></RequireAuth>} />
      <Route path="/admin" element={<RequireAuth><AdminShell /></RequireAuth>}>
        <Route index element={<Navigate to="/admin/role-plays/reporting" replace />} />
        <Route path="role-plays" element={<Navigate to="/admin/role-plays/reporting" replace />} />
        <Route path="role-plays/reporting" element={<AdminReporting />} />
        <Route path="role-plays/manage" element={<Admin />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="knowledge" element={<AdminKnowledge />} />
        <Route path="admins" element={<AdminAdmins />} />
      </Route>
      <Route path="/create" element={<RequireAuth><Create /></RequireAuth>} />
      <Route path="/edit/:id" element={<RequireAuth><Edit /></RequireAuth>} />
      <Route path="/library/:role" element={<RequireAuth><Library /></RequireAuth>} />
      <Route path="/call/:sessionId" element={<RequireAuth><Call /></RequireAuth>} />
      <Route path="/r/:slug" element={<RequireAuth><RolePlayDeepLink /></RequireAuth>} />
      <Route path="/session/:id" element={<RequireAuth><SessionReport /></RequireAuth>} />
      <Route path="/rehearse/report/:id" element={<RequireAuth><RehearsalReport /></RequireAuth>} />
      <Route path="/leaderboard/:slug" element={<RequireAuth><Leaderboard /></RequireAuth>} />
      <Route path="/admin/role-play/:slug/stats" element={<RequireAuth><RolePlayStats /></RequireAuth>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
    </Suspense>
  </BrowserRouter>
);

export default App;

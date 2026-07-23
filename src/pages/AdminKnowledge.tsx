import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button, Card, CardContent, Textarea } from "@/design-system/mj-design-system-db98fa";
import { toast } from "sonner";
import { Save, Loader2, Upload, FileText } from "lucide-react";
import { useIsAdmin } from "@/lib/adminRole";

export default function AdminKnowledge() {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading, user } = useIsAdmin();
  const [content, setContent] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    if (adminLoading) return;
    if (!isAdmin) { setLoading(false); return; }
    (async () => {
      const { data, error } = await supabase
        .from("knowledge_docs")
        .select("content, updated_at")
        .eq("slug", "global")
        .maybeSingle();
      if (!active) return;
      if (error) { toast.error(error.message); }
      else {
        setContent(data?.content ?? "");
        setUpdatedAt(data?.updated_at ?? null);
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [isAdmin, adminLoading]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("knowledge_docs")
        .update({ content, updated_by: user.id })
        .eq("slug", "global")
        .select("updated_at")
        .maybeSingle();
      if (error) { toast.error(error.message); return; }
      setUpdatedAt(data?.updated_at ?? new Date().toISOString());
      toast.success("Saved — agents will pick it up within ~60s");
    } finally { setSaving(false); }
  };

  const onFile = async (file: File) => {
    if (file.size > 1_000_000) { toast.error("File is too big (max 1 MB). Try pasting the text instead."); return; }
    try {
      const text = await file.text();
      setContent(text);
      toast.success(`Loaded ${file.name}`);
    } catch {
      toast.error("Couldn't read that file. Try pasting the text instead.");
    }
  };

  if (adminLoading) return null;
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center p-6">
        <Card className="max-w-md rounded-xl shadow-card">
          <CardContent className="p-8 space-y-4 text-center">
            <h1 className="font-display text-2xl">Admin only</h1>
            <p className="text-muted-foreground">Sign in as the admin user to edit knowledge.</p>
            <Button onClick={() => navigate("/auth")} className="rounded-lg bg-brand-orange hover:bg-brand-orange/90">Sign in</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl">Business <span className="text-brand-orange">knowledge</span></h2>
          <p className="text-xs text-muted-foreground mt-1">What the AI knows about your business when it role-plays buyers and scores reps.</p>
        </div>
        <Button onClick={save} disabled={saving || loading} className="rounded-lg bg-brand-orange hover:bg-brand-orange/90 text-primary-foreground">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save
        </Button>
      </div>
        <Card className="rounded-xl shadow-card">
          <CardContent className="p-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              Drop in notes about what you sell, who buys it, your pricing, common objections, and how you're different from competitors.
              The AI uses this every time it plays a buyer or scores a call. Edits take effect within about a minute.
            </p>

            <details className="rounded-md border bg-background/50 px-3 py-2 text-xs">
              <summary className="cursor-pointer font-medium text-foreground">Tips for what to include</summary>
              <ul className="list-disc pl-5 text-muted-foreground space-y-1 mt-2">
                <li>What your product or service is, in plain words</li>
                <li>Who your typical customer is (role, company size, industry)</li>
                <li>Common objections you hear on GTM calls</li>
                <li>Pricing, packages, or how you charge</li>
                <li>Competitors and how you're different</li>
                <li>Anything else a new rep would need to know on day one</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                Don't worry about formatting — plain text works great. If you happen to have a GTM playbook in a .txt or .md file, you can upload it.
              </p>
            </details>

            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm cursor-pointer hover:border-foreground/30 transition">
                <Upload className="h-4 w-4" />
                Upload a file
                <input
                  type="file"
                  accept=".md,.markdown,.txt,text/plain,text/markdown"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.currentTarget.value = ""; }}
                />
              </label>
              <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" /> .txt or .md works best — or just type/paste below
              </span>
            </div>

            {updatedAt && (
              <p className="text-xs text-muted-foreground">Last updated {new Date(updatedAt).toLocaleString()}</p>
            )}
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`Example:\n\nWe sell payroll software to US restaurants with 5–50 employees. Plans start at $49/mo. Common objection: "we already use Gusto." We win on shift scheduling + tip reporting.`}
              className="min-h-[60vh] font-mono text-sm rounded-2xl"
              disabled={loading}
            />
          </CardContent>
        </Card>
    </div>
  );
}
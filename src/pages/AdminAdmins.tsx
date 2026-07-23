import { useEffect, useState } from "react";
import { Button, Card, CardContent, Input, Label, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/design-system/mj-design-system-db98fa";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { useAuthUser } from "@/lib/useAuthUser";
import { supabase } from "@/integrations/supabase/client";

type Row = { user_id: string; display_name: string | null };

export default function AdminAdmins() {
  const { user } = useAuthUser();
  const [rows, setRows] = useState<Row[]>([]);
  const [emailInput, setEmailInput] = useState("");
  const [adding, setAdding] = useState(false);

  const reload = async () => {
    const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
    const ids = ((roles ?? []) as { user_id: string }[]).map((r) => r.user_id);
    if (ids.length === 0) { setRows([]); return; }
    const { data: profs } = await supabase.from("profiles").select("id,display_name").in("id", ids);
    const map = new Map<string, string | null>(((profs ?? []) as { id: string; display_name: string | null }[]).map((p) => [p.id, p.display_name]));
    setRows(ids.map((id) => ({ user_id: id, display_name: map.get(id) ?? null })));
  };

  useEffect(() => { reload(); }, []);

  const addAdmin = async () => {
    const email = emailInput.trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) { toast.error("Enter a valid email address"); return; }
    setAdding(true);
    const { error } = await supabase.rpc("add_admin_by_email", { _email: email });
    setAdding(false);
    if (error) { toast.error(error.message); return; }
    setEmailInput("");
    toast.success("Admin added");
    reload();
  };

  const removeAdmin = async (id: string) => {
    if (id === user?.id && rows.length === 1) { toast.error("Can't remove the last admin"); return; }
    if (!confirm("Remove admin role from this user?")) return;
    const { error } = await supabase.from("user_roles").delete().eq("user_id", id).eq("role", "admin");
    if (error) { toast.error(error.message); return; }
    reload();
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="font-display text-2xl sm:text-3xl">Admins</h2>
        <p className="text-xs text-muted-foreground mt-1">Users with full content management access.</p>
      </div>

        <Card className="rounded-2xl shadow-card mb-6">
          <CardContent className="p-5">
            <Label>Add admin by email</Label>
            <div className="flex gap-2 mt-2">
              <Input
                type="email"
                placeholder="teammate@company.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addAdmin(); }}
              />
              <Button onClick={addAdmin} disabled={adding} className="rounded-lg bg-brand-orange hover:bg-brand-orange/90">
                {adding ? "Adding…" : "Add"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">The user must have signed in at least once before they can be made an admin.</p>
          </CardContent>
        </Card>


        <Card className="rounded-2xl shadow-card">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>UUID</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.user_id}>
                    <TableCell>{r.display_name ?? <span className="text-muted-foreground">—</span>}{r.user_id === user?.id && <span className="text-xs text-brand-orange ml-2">you</span>}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{r.user_id}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => removeAdmin(r.user_id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
    </div>
  );
}
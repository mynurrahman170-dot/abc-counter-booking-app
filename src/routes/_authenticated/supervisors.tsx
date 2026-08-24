import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { RequireRole } from "@/components/RequireRole";
import { EditRowDialog } from "@/components/EditRowDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/supervisors")({
  head: () => ({
    meta: [
      { title: "Supervisors | Car Booking Database" },
      { name: "description", content: "Add supervisors used in master booking point trip forms." },
      { property: "og:title", content: "Supervisors | Car Booking Database" },
      { property: "og:description", content: "Maintain the supervisor list for departures." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequireRole allow={["master_admin", "moderator"]}>
      <SupervisorsPage />
    </RequireRole>
  ),
});

function SupervisorsPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", phone: "", note: "" });
  const [editRow, setEditRow] = useState<Record<string, unknown> & { id: string } | null>(null);

  const { data: rows, isLoading } = useQuery({
    queryKey: ["supervisors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supervisors")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("supervisors").insert({
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        note: form.note.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("saved"));
      setForm({ name: "", phone: "", note: "" });
      void qc.invalidateQueries({ queryKey: ["supervisors"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("supervisors").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("deleted"));
      void qc.invalidateQueries({ queryKey: ["supervisors"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="font-display text-3xl uppercase tracking-wide">{t("supervisors")}</h1>

      <form
        className="panel grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="sv-name">{t("supervisorName")}</Label>
          <Input
            id="sv-name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            maxLength={80}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sv-phone">{t("phone")}</Label>
          <Input
            id="sv-phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            maxLength={30}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sv-note">{t("note")}</Label>
          <Input
            id="sv-note"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            maxLength={200}
          />
        </div>
        <Button type="submit" disabled={create.isPending} className="self-end">
          {t("add")}
        </Button>
      </form>

      <div className="panel overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("supervisorName")}</TableHead>
              <TableHead>{t("phone")}</TableHead>
              <TableHead>{t("note")}</TableHead>
              <TableHead className="text-right">{t("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={4}>{t("loading")}</TableCell>
              </TableRow>
            )}
            {!isLoading && (rows?.length ?? 0) === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground">
                  {t("noData")}
                </TableCell>
              </TableRow>
            )}
            {rows?.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-semibold">{r.name}</TableCell>
                <TableCell>{r.phone ?? "—"}</TableCell>
                <TableCell>{r.note ?? "—"}</TableCell>
                <TableCell className="space-x-1 text-right">
                  <Button variant="ghost" size="icon" title={t("edit")} onClick={() => setEditRow(r)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove.mutate(r.id)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <EditRowDialog
        table="supervisors"
        row={editRow}
        onClose={() => setEditRow(null)}
        queryKey={["supervisors"]}
        fields={[
          { key: "name", label: t("supervisorName"), required: true, maxLength: 80 },
          { key: "phone", label: t("phone"), maxLength: 30 },
          { key: "note", label: t("note"), maxLength: 200 },
        ]}
      />
    </div>
  );
}

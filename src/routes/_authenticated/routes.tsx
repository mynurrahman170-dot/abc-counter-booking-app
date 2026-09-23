import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
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

export const Route = createFileRoute("/_authenticated/routes")({
  head: () => ({
    meta: [
      { title: "Add Route | ZB SYSTEM" },
      {
        name: "description",
        content: "Create and manage bus routes with start and end points for trip planning.",
      },
      { property: "og:title", content: "Add Route | ZB SYSTEM" },
      { property: "og:description", content: "Create and manage bus routes for trips." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RoutesPage,
});

function RoutesPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data: session } = useAuth();

  const [form, setForm] = useState({ name: "", from_place: "", to_place: "", note: "" });
  const [editRow, setEditRow] = useState<Record<string, unknown> & { id: string } | null>(null);

  const { data: rows, isLoading } = useQuery({
    queryKey: ["routes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("routes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const name =
        form.name.trim() ||
        [form.from_place.trim(), form.to_place.trim()].filter(Boolean).join(" — ");
      if (!name) throw new Error(t("routeName"));
      const { error } = await supabase.from("routes").insert({
        name,
        from_place: form.from_place.trim() || null,
        to_place: form.to_place.trim() || null,
        note: form.note.trim() || null,
        created_by: session?.userId ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("saved"));
      setForm({ name: "", from_place: "", to_place: "", note: "" });
      void qc.invalidateQueries({ queryKey: ["routes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("routes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("deleted"));
      void qc.invalidateQueries({ queryKey: ["routes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="font-display text-3xl uppercase tracking-wide">{t("routes")}</h1>

      <form
        className="panel grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="r-from">{t("fromPlace")}</Label>
          <Input
            id="r-from"
            value={form.from_place}
            onChange={(e) => setForm({ ...form, from_place: e.target.value })}
            maxLength={80}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="r-to">{t("toPlace")}</Label>
          <Input
            id="r-to"
            value={form.to_place}
            onChange={(e) => setForm({ ...form, to_place: e.target.value })}
            maxLength={80}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="r-name">{t("routeName")}</Label>
          <Input
            id="r-name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            maxLength={120}
            placeholder={
              [form.from_place, form.to_place].filter(Boolean).join(" — ") || t("routeName")
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="r-note">{t("note")}</Label>
          <Input
            id="r-note"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            maxLength={160}
          />
        </div>
        <Button type="submit" disabled={create.isPending} className="self-end">
          {t("addRoute")}
        </Button>
      </form>

      <div className="panel overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("routeName")}</TableHead>
              <TableHead>{t("fromPlace")}</TableHead>
              <TableHead>{t("toPlace")}</TableHead>
              <TableHead>{t("note")}</TableHead>
              <TableHead className="text-right">{t("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5}>{t("loading")}</TableCell>
              </TableRow>
            )}
            {!isLoading && (rows?.length ?? 0) === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  {t("noData")}
                </TableCell>
              </TableRow>
            )}
            {rows?.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-semibold">{r.name}</TableCell>
                <TableCell>{r.from_place ?? "—"}</TableCell>
                <TableCell>{r.to_place ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{r.note ?? "—"}</TableCell>
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
        table="routes"
        row={editRow}
        onClose={() => setEditRow(null)}
        queryKey={["routes"]}
        fields={[
          { key: "name", label: t("routeName"), required: true, maxLength: 120 },
          { key: "from_place", label: t("fromPlace"), maxLength: 80 },
          { key: "to_place", label: t("toPlace"), maxLength: 80 },
          { key: "note", label: t("note"), maxLength: 160 },
        ]}
      />
    </div>
  );
}

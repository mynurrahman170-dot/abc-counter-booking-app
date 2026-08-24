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

export const Route = createFileRoute("/_authenticated/booking-points")({
  head: () => ({
    meta: [
      { title: "Booking Points | Car Booking Database" },
      { name: "description", content: "Create and manage booking points with code, address and phone." },
      { property: "og:title", content: "Booking Points | Car Booking Database" },
      { property: "og:description", content: "Create and manage booking points for the network." },
    ],
  }),
  component: () => (
    <RequireRole allow={["master_admin", "moderator"]}>
      <BookingPointsPage />
    </RequireRole>
  ),
});

function BookingPointsPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", code: "", address: "", phone: "", point_type: "normal" });
  const [editRow, setEditRow] = useState<Record<string, unknown> & { id: string } | null>(null);

  const { data: rows, isLoading } = useQuery({
    queryKey: ["booking_points"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_points")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("booking_points").insert({
        name: form.name.trim(),
        code: form.code.trim(),
        address: form.address.trim() || null,
        phone: form.phone.trim() || null,
        point_type: form.point_type,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("saved"));
      setForm({ name: "", code: "", address: "", phone: "", point_type: "normal" });
      void qc.invalidateQueries({ queryKey: ["booking_points"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("booking_points").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("deleted"));
      void qc.invalidateQueries({ queryKey: ["booking_points"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="font-display text-3xl uppercase tracking-wide">{t("bookingPoints")}</h1>

      <form
        className="panel grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="bp-name">{t("name")}</Label>
          <Input
            id="bp-name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            maxLength={80}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bp-code">{t("code")}</Label>
          <Input
            id="bp-code"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            required
            maxLength={30}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bp-address">{t("address")}</Label>
          <Input
            id="bp-address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            maxLength={200}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bp-phone">{t("phone")}</Label>
          <Input
            id="bp-phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            maxLength={30}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bp-type">{t("pointType")}</Label>
          <select
            id="bp-type"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
            value={form.point_type}
            onChange={(e) => setForm({ ...form, point_type: e.target.value })}
          >
            <option value="normal">{t("normalPoint")}</option>
            <option value="master">{t("masterPoint")}</option>
          </select>
        </div>
        <Button type="submit" disabled={create.isPending} className="sm:col-span-2 lg:col-span-1">
          {t("add")}
        </Button>
      </form>

      <div className="panel overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("name")}</TableHead>
              <TableHead>{t("code")}</TableHead>
              <TableHead>{t("address")}</TableHead>
              <TableHead>{t("phone")}</TableHead>
              <TableHead>{t("pointType")}</TableHead>
              <TableHead className="text-right">{t("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6}>{t("loading")}</TableCell>
              </TableRow>
            )}
            {!isLoading && (rows?.length ?? 0) === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  {t("noData")}
                </TableCell>
              </TableRow>
            )}
            {rows?.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-semibold">{r.name}</TableCell>
                <TableCell>{r.code}</TableCell>
                <TableCell>{r.address ?? "—"}</TableCell>
                <TableCell>{r.phone ?? "—"}</TableCell>
                <TableCell>
                  {r.point_type === "master" ? (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                      {t("masterPoint")}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">{t("normalPoint")}</span>
                  )}
                </TableCell>
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
        table="booking_points"
        row={editRow}
        onClose={() => setEditRow(null)}
        queryKey={["booking_points"]}
        fields={[
          { key: "name", label: t("name"), required: true, maxLength: 80 },
          { key: "code", label: t("code"), required: true, maxLength: 30 },
          { key: "address", label: t("address"), maxLength: 200 },
          { key: "phone", label: t("phone"), maxLength: 30 },
          {
            key: "point_type",
            label: t("pointType"),
            type: "select",
            options: [
              { value: "normal", label: t("normalPoint") },
              { value: "master", label: t("masterPoint") },
            ],
          },
        ]}
      />
    </div>
  );
}

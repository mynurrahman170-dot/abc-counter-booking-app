import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
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

export const Route = createFileRoute("/_authenticated/vehicles")({
  head: () => ({
    meta: [
      { title: "Vehicles | Car Booking Database" },
      { name: "description", content: "Add and manage vehicle numbers, groups, types and seat counts." },
      { property: "og:title", content: "Vehicles | Car Booking Database" },
      { property: "og:description", content: "Add and manage vehicle numbers, groups and seat counts." },
    ],
  }),
  component: () => (
    <RequireRole allow={["master_admin", "moderator"]}>
      <VehiclesPage />
    </RequireRole>
  ),
});

function VehiclesPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    vehicle_number: "",
    vehicle_type: "",
    seat_count: "",
    vehicle_group: "",
  });
  const [search, setSearch] = useState("");
  const [editRow, setEditRow] = useState<Record<string, unknown> & { id: string } | null>(null);

  const { data: rows, isLoading } = useQuery({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: tripCounts } = useQuery({
    queryKey: ["vehicle-trip-counts"],
    queryFn: async () => {
      const [schedules, trips] = await Promise.all([
        supabase.from("schedules").select("vehicle_id"),
        supabase.from("trips").select("vehicle_id"),
      ]);
      const counts: Record<string, number> = {};
      for (const r of [...(schedules.data ?? []), ...(trips.data ?? [])]) {
        if (r.vehicle_id) counts[r.vehicle_id] = (counts[r.vehicle_id] ?? 0) + 1;
      }
      return counts;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("vehicles").insert({
        vehicle_number: form.vehicle_number.trim(),
        vehicle_type: form.vehicle_type.trim() || null,
        seat_count: Number(form.seat_count) || 0,
        vehicle_group: form.vehicle_group.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("saved"));
      setForm({ vehicle_number: "", vehicle_type: "", seat_count: "", vehicle_group: "" });
      void qc.invalidateQueries({ queryKey: ["vehicles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vehicles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("deleted"));
      void qc.invalidateQueries({ queryKey: ["vehicles"] });
      void qc.invalidateQueries({ queryKey: ["vehicle-trip-counts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows ?? [];
    return (rows ?? []).filter(
      (r) =>
        (r.vehicle_group ?? "").toLowerCase().includes(q) ||
        r.vehicle_number.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const groupSummary = useMemo(() => {
    const map = new Map<string, { vehicles: number; trips: number }>();
    for (const r of filtered) {
      const key = r.vehicle_group?.trim() || "—";
      const cur = map.get(key) ?? { vehicles: 0, trips: 0 };
      cur.vehicles += 1;
      cur.trips += tripCounts?.[r.id] ?? 0;
      map.set(key, cur);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered, tripCounts]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="font-display text-3xl uppercase tracking-wide">{t("vehicles")}</h1>

      <form
        className="panel grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="vnum">{t("vehicleNumber")}</Label>
          <Input
            id="vnum"
            value={form.vehicle_number}
            onChange={(e) => setForm({ ...form, vehicle_number: e.target.value })}
            required
            maxLength={40}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="vtype">{t("vehicleType")}</Label>
          <Input
            id="vtype"
            value={form.vehicle_type}
            onChange={(e) => setForm({ ...form, vehicle_type: e.target.value })}
            maxLength={40}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="vseat">{t("seatCount")}</Label>
          <Input
            id="vseat"
            type="number"
            min={0}
            max={200}
            value={form.seat_count}
            onChange={(e) => setForm({ ...form, seat_count: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="vgroup">{t("group")}</Label>
          <Input
            id="vgroup"
            list="vehicle-groups"
            value={form.vehicle_group}
            onChange={(e) => setForm({ ...form, vehicle_group: e.target.value })}
            maxLength={60}
          />
          <datalist id="vehicle-groups">
            {[...new Set((rows ?? []).map((r) => r.vehicle_group).filter(Boolean))].map((g) => (
              <option key={g as string} value={g as string} />
            ))}
          </datalist>
        </div>
        <Button type="submit" disabled={create.isPending} className="sm:col-span-2 lg:col-span-1">
          {t("add")}
        </Button>
      </form>

      <div className="panel space-y-4 p-5">
        <div className="space-y-1.5">
          <Label htmlFor="vsearch">{t("searchGroupHint")}</Label>
          <Input
            id="vsearch"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchGroupHint")}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {groupSummary.map(([g, s]) => (
            <div key={g} className="rounded-lg border border-border bg-card p-3">
              <p className="font-display text-lg uppercase tracking-wide">{g}</p>
              <p className="text-sm text-muted-foreground">
                {t("groupVehicles")}: <span className="font-semibold text-foreground">{s.vehicles}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                {t("groupTrips")}: <span className="font-semibold text-foreground">{s.trips}</span>
              </p>
            </div>
          ))}
          {groupSummary.length === 0 && <p className="text-muted-foreground">{t("noData")}</p>}
        </div>
      </div>

      <div className="panel overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("vehicleNumber")}</TableHead>
              <TableHead>{t("group")}</TableHead>
              <TableHead>{t("vehicleType")}</TableHead>
              <TableHead>{t("seatCount")}</TableHead>
              <TableHead>{t("groupTrips")}</TableHead>
              <TableHead className="text-right">{t("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6}>{t("loading")}</TableCell>
              </TableRow>
            )}
            {!isLoading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  {t("noData")}
                </TableCell>
              </TableRow>
            )}
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-semibold">{r.vehicle_number}</TableCell>
                <TableCell>{r.vehicle_group ?? "—"}</TableCell>
                <TableCell>{r.vehicle_type ?? "—"}</TableCell>
                <TableCell>{r.seat_count}</TableCell>
                <TableCell>{tripCounts?.[r.id] ?? 0}</TableCell>
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
        table="vehicles"
        row={editRow}
        onClose={() => setEditRow(null)}
        queryKey={["vehicles"]}
        fields={[
          { key: "vehicle_number", label: t("vehicleNumber"), required: true, maxLength: 40 },
          { key: "vehicle_group", label: t("group"), maxLength: 60 },
          { key: "vehicle_type", label: t("vehicleType"), maxLength: 40 },
          { key: "seat_count", label: t("seatCount"), type: "number" },
        ]}
      />
    </div>
  );
}

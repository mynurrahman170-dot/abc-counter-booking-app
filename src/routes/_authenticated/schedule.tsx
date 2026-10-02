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

export const Route = createFileRoute("/_authenticated/schedule")({
  head: () => ({
    meta: [
      { title: "Schedule Board | Car Booking Database" },
      { name: "description", content: "Live schedule board of routes, departures, fares and supervisors." },
      { property: "og:title", content: "Schedule Board | Car Booking Database" },
      { property: "og:description", content: "Routes, departure times, fares and supervisors." },
    ],
  }),
  component: SchedulePage,
});

function SchedulePage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data: session } = useAuth();
  const isStaff = session?.role === "master_admin" || session?.role === "moderator";

  const [editRow, setEditRow] = useState<(Record<string, unknown> & { id: string }) | null>(null);

  const [form, setForm] = useState({
    vehicle_id: "",
    booking_point_id: "",
    route: "",
    supervisor_id: "",
    departure_date: "",
    departure_time: "",
    fare: "",
    trip_direction: "up",
  });

  const { data: vehicles } = useQuery({
    queryKey: ["vehicles"],
    queryFn: async () => (await supabase.from("vehicles").select("id, vehicle_number")).data ?? [],
  });
  const { data: points } = useQuery({
    queryKey: ["booking_points"],
    queryFn: async () => (await supabase.from("booking_points").select("id, name")).data ?? [],
  });
  const { data: routeList } = useQuery({
    queryKey: ["routes"],
    queryFn: async () => (await supabase.from("routes").select("id, name").order("name")).data ?? [],
  });
  const { data: supervisors } = useQuery({
    queryKey: ["supervisors"],
    queryFn: async () => (await supabase.from("supervisors").select("id, name").order("name")).data ?? [],
  });

  const { data: rows, isLoading } = useQuery({
    queryKey: ["schedules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schedules")
        .select("*, vehicles(vehicle_number), booking_points(name), supervisors(name)")
        .order("departure_date", { ascending: true })
        .order("departure_time", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const bookingPointId = isStaff ? form.booking_point_id : (session?.bookingPointId ?? "");
      if (!bookingPointId) throw new Error(t("select") + ": " + t("bookingPoint"));
      const { error } = await supabase.from("schedules").insert({
        vehicle_id: form.vehicle_id || null,
        booking_point_id: bookingPointId,
        route: form.route.trim(),
        supervisor_id: form.supervisor_id || null,
        departure_date: form.departure_date,
        departure_time: form.departure_time,
        fare: Number(form.fare) || 0,
        trip_direction: form.trip_direction,
        created_by: session?.userId ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("saved"));
      setForm({ ...form, route: "", supervisor_id: "", departure_time: "", fare: "" });
      void qc.invalidateQueries({ queryKey: ["schedules"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("schedules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("deleted"));
      void qc.invalidateQueries({ queryKey: ["schedules"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const selectClass =
    "h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="font-display text-3xl uppercase tracking-wide">{t("scheduleBoard")}</h1>

      <form
        className="panel grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="s-vehicle">{t("vehicleNumber")}</Label>
          <select
            id="s-vehicle"
            className={selectClass}
            value={form.vehicle_id}
            onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })}
          >
            <option value="">{t("select")}</option>
            {vehicles?.map((v) => (
              <option key={v.id} value={v.id}>
                {v.vehicle_number}
              </option>
            ))}
          </select>
        </div>
        {isStaff && (
          <div className="space-y-1.5">
            <Label htmlFor="s-point">{t("bookingPoint")}</Label>
            <select
              id="s-point"
              className={selectClass}
              value={form.booking_point_id}
              onChange={(e) => setForm({ ...form, booking_point_id: e.target.value })}
              required
            >
              <option value="">{t("select")}</option>
              {points?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="s-route">{t("route")}</Label>
          <select
            id="s-route"
            className={selectClass}
            value={form.route}
            onChange={(e) => setForm({ ...form, route: e.target.value })}
            required
          >
            <option value="">{t("select")}</option>
            {routeList?.map((r) => (
              <option key={r.id} value={r.name}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="s-supervisor">{t("supervisor")}</Label>
          <select
            id="s-supervisor"
            className={selectClass}
            value={form.supervisor_id}
            onChange={(e) => setForm({ ...form, supervisor_id: e.target.value })}
          >
            <option value="">{t("select")}</option>
            {supervisors?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="s-date">{t("date")}</Label>
          <Input
            id="s-date"
            type="date"
            value={form.departure_date}
            onChange={(e) => setForm({ ...form, departure_date: e.target.value })}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="s-time">{t("time")}</Label>
          <Input
            id="s-time"
            type="time"
            value={form.departure_time}
            onChange={(e) => setForm({ ...form, departure_time: e.target.value })}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="s-dir">{t("routeType")}</Label>
          <select id="s-dir" className={selectClass} value={form.trip_direction} onChange={(e) => setForm({ ...form, trip_direction: e.target.value })}>
            <option value="up">{t("upTrip")}</option>
            <option value="down">{t("downTrip")}</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="s-fare">{t("fare")}</Label>
          <Input
            id="s-fare"
            type="number"
            min={0}
            value={form.fare}
            onChange={(e) => setForm({ ...form, fare: e.target.value })}
          />
        </div>
        <Button type="submit" disabled={create.isPending} className="sm:col-span-2 lg:col-span-1">
          {t("add")}
        </Button>
      </form>

      <div className="panel overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("date")}</TableHead>
              <TableHead>{t("time")}</TableHead>
              <TableHead>{t("route")}</TableHead>
              <TableHead>{t("routeType")}</TableHead>
              <TableHead>{t("vehicleNumber")}</TableHead>
              <TableHead>{t("supervisor")}</TableHead>
              <TableHead>{t("bookingPoint")}</TableHead>
              <TableHead>{t("fare")}</TableHead>
              <TableHead className="text-right">{t("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={9}>{t("loading")}</TableCell>
              </TableRow>
            )}
            {!isLoading && (rows?.length ?? 0) === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-muted-foreground">
                  {t("noData")}
                </TableCell>
              </TableRow>
            )}
            {rows?.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.departure_date}</TableCell>
                <TableCell className="font-semibold">{r.departure_time}</TableCell>
                <TableCell>{r.route}</TableCell>
                <TableCell>{r.trip_direction === "down" ? t("downTrip") : t("upTrip")}</TableCell>
                <TableCell>{r.vehicles?.vehicle_number ?? "—"}</TableCell>
                <TableCell>{r.supervisors?.name ?? "—"}</TableCell>
                <TableCell>{r.booking_points?.name ?? "—"}</TableCell>
                <TableCell>{r.fare}</TableCell>
                <TableCell className="space-x-1 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    title={t("edit")}
                    onClick={() => setEditRow(r as Record<string, unknown> & { id: string })}
                  >
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
        table="schedules"
        row={editRow}
        onClose={() => setEditRow(null)}
        queryKey={["schedules"]}
        fields={[
          {
            key: "route",
            label: t("route"),
            type: "select",
            required: true,
            options: (routeList ?? []).map((r) => ({ value: r.name, label: r.name })),
          },
          {
            key: "trip_direction",
            label: t("routeType"),
            type: "select",
            required: true,
            options: [
              { value: "up", label: t("upTrip") },
              { value: "down", label: t("downTrip") },
            ],
          },
          {
            key: "supervisor_id",
            label: t("supervisor"),
            type: "select",
            options: (supervisors ?? []).map((s) => ({ value: s.id, label: s.name })),
          },
          { key: "departure_date", label: t("date"), type: "date", required: true },
          { key: "departure_time", label: t("time"), type: "time", required: true },
          { key: "fare", label: t("fare"), type: "number" },
          {
            key: "vehicle_id",
            label: t("vehicleNumber"),
            type: "select",
            options: (vehicles ?? []).map((v) => ({ value: v.id, label: v.vehicle_number })),
          },
        ]}
      />
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Fragment, useMemo, useState } from "react";
import { toast } from "sonner";
import { Pencil, Printer, XCircle } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { RequireRole } from "@/components/RequireRole";
import { EditRowDialog } from "@/components/EditRowDialog";
import { TicketDialog, type TicketData } from "@/components/TicketDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/bookings")({
  head: () => ({
    meta: [
      { title: "Bookings | ZB SYSTEM" },
      {
        name: "description",
        content: "Search bookings, cancel seats and review the audit trail for each booking point.",
      },
      { property: "og:title", content: "Bookings | ZB SYSTEM" },
      {
        property: "og:description",
        content: "Search, cancel and audit seat bookings per booking point.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequireRole allow={["master_admin", "moderator", "booking_point"]}>
      <BookingsPage />
    </RequireRole>
  ),
});

const selectClass =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground";

function BookingsPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data: session } = useAuth();
  const isStaff = session?.role === "master_admin" || session?.role === "moderator";

  const [search, setSearch] = useState("");
  const [pointId, setPointId] = useState("");
  const today = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [dir, setDir] = useState<"all" | "up" | "down">("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [auditFor, setAuditFor] = useState<string | null>(null);
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [editRow, setEditRow] = useState<(Record<string, unknown> & { id: string }) | null>(null);

  const { data: points } = useQuery({
    queryKey: ["booking_points"],
    queryFn: async () => (await supabase.from("booking_points").select("id, name")).data ?? [],
  });

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["bookings-list", pointId, from, to],
    queryFn: async () => {
      let q = supabase
        .from("seat_bookings")
        .select(
          "*, booking_points(name), trips(departure_date, departure_time, route, fare, trip_direction, vehicles(vehicle_number))",
        )
        .order("created_at", { ascending: false })
        .limit(500);
      if (pointId) q = q.eq("booking_point_id", pointId);
      if (from) q = q.gte("created_at", `${from}T00:00:00`);
      if (to) q = q.lte("created_at", `${to}T23:59:59`);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (bookings ?? []).filter((b) => {
      if (dir !== "all" && (b.trips?.trip_direction ?? "up") !== dir) return false;
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      if (!term) return true;
      return [
        b.ticket_no,
        b.passenger_name,
        b.passenger_phone,
        b.booking_points?.name,
        b.trips?.vehicles?.vehicle_number,
        (b.seat_numbers ?? []).join(","),
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term));
    });
  }, [bookings, search, dir, statusFilter]);

  // Group bookings by vehicle so all bookings of one vehicle stay together.
  const groups = useMemo(() => {
    const map = new Map<string, typeof rows>();
    for (const b of rows) {
      const vehicle = b.trips?.vehicles?.vehicle_number ?? "—";
      const list = map.get(vehicle);
      if (list) list.push(b);
      else map.set(vehicle, [b]);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([vehicle, list]) => ({
        vehicle,
        list,
        total: list
          .filter((b) => b.status !== "cancelled")
          .reduce((s, b) => s + Number(b.amount ?? 0), 0),
      }));
  }, [rows]);

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("seat_bookings")
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
          cancelled_by: session?.userId ?? null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("cancelled2"));
      void qc.invalidateQueries({ queryKey: ["bookings-list"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const total = rows
    .filter((b) => b.status !== "cancelled")
    .reduce((sum, b) => sum + Number(b.amount ?? 0), 0);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="font-display text-3xl uppercase tracking-wide">{t("bookingsList")}</h1>

      <div className="panel grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5 lg:col-span-2">
          <Label htmlFor="bk-search">{t("search")}</Label>
          <Input
            id="bk-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchBookingsHint")}
          />
        </div>
        {isStaff && (
          <div className="space-y-1.5">
            <Label htmlFor="bk-point">{t("bookingPoint")}</Label>
            <select
              id="bk-point"
              className={selectClass}
              value={pointId}
              onChange={(e) => setPointId(e.target.value)}
            >
              <option value="">{t("allPoints")}</option>
              {points?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="bk-status">{t("status")}</Label>
          <select
            id="bk-status"
            className={selectClass}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">{t("all")}</option>
            <option value="pending">{t("pending")}</option>
            <option value="confirmed">{t("confirmed")}</option>
            <option value="cancelled">{t("cancelled")}</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label htmlFor="bk-from">{t("from")}</Label>
            <Input id="bk-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bk-to">{t("to")}</Label>
            <Input id="bk-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        {(["all", "up", "down"] as const).map((d) => (
          <Button
            key={d}
            variant={dir === d ? "default" : "outline"}
            size="sm"
            onClick={() => setDir(d)}
          >
            {d === "all" ? t("all") : d === "up" ? t("upTrip") : t("downTrip")}
          </Button>
        ))}
      </div>

      <div className="panel overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("ticketNo")}</TableHead>
              <TableHead>{t("bookingPoint")}</TableHead>
              <TableHead>{t("trip")}</TableHead>
              <TableHead>{t("seats")}</TableHead>
              <TableHead>{t("passengerName")}</TableHead>
              <TableHead>{t("amount")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              <TableHead className="text-right">{t("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={8}>{t("loading")}</TableCell>
              </TableRow>
            )}
            {!isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-muted-foreground">
                  {t("noData")}
                </TableCell>
              </TableRow>
            )}
            {groups.map((g) => (
              <Fragment key={g.vehicle}>
                <TableRow className="bg-muted/60">
                  <TableCell colSpan={8} className="font-display text-sm uppercase tracking-wide">
                    {t("vehicleNumber")}: <span className="font-bold">{g.vehicle}</span>
                    <span className="ml-3 text-xs font-normal text-muted-foreground">
                      {g.list.length} • ৳{g.total}
                    </span>
                  </TableCell>
                </TableRow>
                {g.list.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-mono text-xs">{b.ticket_no ?? "—"}</TableCell>
                <TableCell className="font-semibold">{b.booking_points?.name ?? "—"}</TableCell>
                <TableCell className="text-xs">
                  {b.trips?.departure_date} {b.trips?.departure_time?.slice(0, 5)}
                  {b.trips?.vehicles?.vehicle_number ? (
                    <span className="ml-2 font-semibold">{b.trips.vehicles.vehicle_number}</span>
                  ) : null}
                  <br />
                  {b.trips?.route ?? "—"}
                </TableCell>
                <TableCell>{(b.seat_numbers ?? []).join(", ")}</TableCell>
                <TableCell>
                  {b.passenger_name ?? "—"}
                  {b.passenger_phone ? (
                    <span className="block text-xs text-muted-foreground">{b.passenger_phone}</span>
                  ) : null}
                </TableCell>
                <TableCell>৳{b.amount}</TableCell>
                <TableCell>
                  <Badge variant={b.status === "cancelled" ? "destructive" : "secondary"}>
                    {b.status === "cancelled" ? t("cancelled") : t("confirmed")}
                  </Badge>
                </TableCell>
                <TableCell className="space-x-1 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    title={t("edit")}
                    onClick={() => setEditRow(b as Record<string, unknown> & { id: string })}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title={t("print")}
                    onClick={() =>
                      setTicket({
                        ticketNo: b.ticket_no ?? "—",
                        pointName: b.booking_points?.name ?? "—",
                        route: b.trips?.route ?? "—",
                        date: b.trips?.departure_date ?? "—",
                        time: b.trips?.departure_time?.slice(0, 5) ?? "—",
                        vehicle: b.trips?.vehicles?.vehicle_number ?? "—",
                        seats: b.seat_numbers ?? [],
                        passengerName: b.passenger_name ?? "",
                        passengerPhone: b.passenger_phone ?? "",
                        farePerSeat: Number(b.fare_per_seat ?? 0),
                        amount: Number(b.amount ?? 0),
                      })
                    }
                  >
                    <Printer className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title={t("cancelSeats")}
                    disabled={b.status === "cancelled" || cancel.isPending}
                    onClick={() => cancel.mutate(b.id)}
                  >
                    <XCircle className="size-4 text-destructive" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setAuditFor(b.id)}>
                    {t("auditTrail")}
                  </Button>
                </TableCell>
              </TableRow>
                ))}
              </Fragment>
            ))}
          </TableBody>
        </Table>
        <div className="border-t border-border p-3 text-right text-sm font-semibold">
          {t("totalAmount")}: ৳{total}
        </div>
      </div>

      {auditFor && <AuditTrail bookingId={auditFor} onClose={() => setAuditFor(null)} />}
      <TicketDialog ticket={ticket} onClose={() => setTicket(null)} />

      <EditRowDialog
        table="seat_bookings"
        row={editRow}
        onClose={() => setEditRow(null)}
        queryKey={["bookings-list"]}
        fields={[
          { key: "passenger_name", label: t("passengerName"), maxLength: 80 },
          { key: "passenger_phone", label: t("phone"), maxLength: 20 },
          { key: "fare_per_seat", label: t("fare"), type: "number" },
          { key: "amount", label: t("amount"), type: "number" },
          { key: "note", label: t("note"), maxLength: 200 },
          {
            key: "status",
            label: t("status"),
            type: "select",
            options: [
              { value: "pending", label: t("pending") },
              { value: "confirmed", label: t("confirmed") },
              { value: "cancelled", label: t("cancelled") },
            ],
          },
        ]}
      />
    </div>
  );
}

function AuditTrail({ bookingId, onClose }: { bookingId: string; onClose: () => void }) {
  const { t } = useI18n();
  const { data: logs, isLoading } = useQuery({
    queryKey: ["booking-audit", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_audit_log")
        .select("*")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="panel space-y-3 p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg uppercase tracking-wide">{t("auditTrail")}</h2>
        <Button variant="outline" size="sm" onClick={onClose}>
          {t("close")}
        </Button>
      </div>
      {isLoading && <p className="text-muted-foreground">{t("loading")}</p>}
      {!isLoading && (logs?.length ?? 0) === 0 && (
        <p className="text-muted-foreground">{t("noData")}</p>
      )}
      <ul className="space-y-2">
        {logs?.map((l) => (
          <li key={l.id} className="rounded-md border border-border p-3 text-sm">
            <div className="flex justify-between">
              <strong>{l.action}</strong>
              <span className="text-xs text-muted-foreground">
                {new Date(l.created_at).toLocaleString()}
              </span>
            </div>
            <p className="mt-1 break-all text-xs text-muted-foreground">{JSON.stringify(l.details)}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

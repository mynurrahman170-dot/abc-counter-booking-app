import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Pencil, Printer, Trash2, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EditRowDialog } from "@/components/EditRowDialog";

import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { buildSeatRows } from "@/lib/seats";
import { SeatPlan } from "@/components/SeatPlan";
import { TicketDialog, type TicketData } from "@/components/TicketDialog";
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

export const Route = createFileRoute("/_authenticated/seat-booking")({
  head: () => ({
    meta: [
      { title: "Seat Booking | Car Booking Database" },
      {
        name: "description",
        content: "Book seats on a trip; booked seats turn red for every booking point.",
      },
      { property: "og:title", content: "Seat Booking | Car Booking Database" },
      { property: "og:description", content: "Shared seat plan with live booked seats and amounts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SeatBookingPage,
});

// লাল, নীল, হলুদ, সবুজ, বেগুনি, আকাশী, কমলা, মেরুন, বোটল গ্রীন, আফলাতুন, তার্কিজ, মেজেন্টা
const POINT_COLORS = [
  "#e11d2a", "#1d4ed8", "#d4a106", "#16a34a", "#7c3aed", "#0ea5e9",
  "#f97316", "#800000", "#006a4e", "#b57edc", "#14b8a6", "#d6008f",
  "#4b5563", "#a16207", "#1e3a8a", "#65a30d",
];
function pointColor(id: string, points: { id: string; seat_color?: string | null }[]) {
  const chosen = points.find((p) => p.id === id)?.seat_color;
  if (chosen) return chosen;
  // Reserve an exclusive shade for New Bus Terminal, independent of sort order.
  if (id === "b2a34c6f-2112-4908-8e57-836bbd8eda0a") return "var(--seat-new-terminal)";
  const sorted = [...new Set(points.map((p) => p.id))].sort();
  let i = sorted.indexOf(id);
  if (i < 0) i = [...id].reduce((a, c) => a + c.charCodeAt(0), 0);
  return POINT_COLORS[i % POINT_COLORS.length];
}

const selectClass =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground";

function SeatBookingPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data: session } = useAuth();
  const isStaff = session?.role === "master_admin" || session?.role === "moderator";
  const isMasterPoint = session?.pointType === "master";

  const [tripId, setTripId] = useState("");
  const [seats, setSeats] = useState<string[]>([]);
  const [totalAmount, setTotalAmount] = useState("");
  const [staffPointId, setStaffPointId] = useState("");
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [pName, setPName] = useState("");
  const [pPhone, setPPhone] = useState("");
  const [pDest, setPDest] = useState("");
  const [groupFor, setGroupFor] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<(Record<string, unknown> & { id: string }) | null>(null);
  const [fDate, setFDate] = useState(() => new Date(Date.now() + 6 * 3600e3).toISOString().slice(0, 10));
  const [fVehicle, setFVehicle] = useState("");
  const [fPoint, setFPoint] = useState("");
  const [fStatus, setFStatus] = useState("");

  const { data: vehicles } = useQuery({
    queryKey: ["vehicles"],
    queryFn: async () =>
      (await supabase.from("vehicles").select("id, vehicle_number, seat_count")).data ?? [],
  });
  const { data: supervisors } = useQuery({
    queryKey: ["supervisors"],
    queryFn: async () => (await supabase.from("supervisors").select("id, name")).data ?? [],
  });
  const { data: points } = useQuery({
    queryKey: ["booking_points", "seat-colors"],
    queryFn: async () =>
      (await supabase.from("booking_points").select("id, name, point_type, seat_color")).data ?? [],
  });

  const { data: trips } = useQuery({
    queryKey: ["trips"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trips")
        .select("*, vehicles(vehicle_number), supervisors(name), booking_points(name)")
        .order("departure_date", { ascending: false })
        .order("departure_time", { ascending: true });
      if (error) throw error;
      return data;
    },
    refetchInterval: 15000,
  });

  /** Seat locks are readable by every point, so the shared seat map stays accurate. */
  const { data: locks } = useQuery({
    queryKey: ["trip_seat_locks", tripId],
    enabled: Boolean(tripId),
    refetchInterval: 10000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trip_seat_locks")
        .select("seat_number, booking_id, booking_point_id")
        .eq("trip_id", tripId);
      if (error) throw error;
      return data;
    },
  });

  /** Only bookings this user is allowed to see (own point, own trips as master point, or staff). */
  const { data: bookings } = useQuery({
    queryKey: ["seat_bookings", tripId],
    enabled: Boolean(tripId),
    refetchInterval: 10000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seat_bookings")
        .select("*, booking_points(name)")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const trip = trips?.find((tr) => tr.id === tripId);

  useEffect(() => {
    setTotalAmount("");
  }, [trip?.id]);

  const visibleByBooking = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of bookings ?? []) map.set(b.id, b.booking_points?.name ?? "—");
    return map;
  }, [bookings]);

  const bookedMap = useMemo(() => {
    const map = new Map<string, { point: string; id: string; color?: string | undefined }>();
    for (const l of locks ?? []) {
      const pid = (l as { booking_point_id?: string | null }).booking_point_id ?? null;
      const p = pid ? points?.find((x) => x.id === pid) : undefined;
      map.set(l.seat_number, {
        point: p?.name ?? visibleByBooking.get(l.booking_id) ?? t("otherPoint"),
        id: l.booking_id,
        color: pid ? pointColor(pid, points ?? []) : undefined,
      });
    }
    return map;
  }, [locks, visibleByBooking, t, points]);

  /** One row per booking point: repeat bookings on this trip are merged. */
  const pointGroups = useMemo(() => {
    const map = new Map<string, NonNullable<typeof bookings>>();
    for (const b of bookings ?? []) {
      const k = b.booking_point_id ?? "none";
      const l = map.get(k);
      if (l) l.push(b);
      else map.set(k, [b]);
    }
    return [...map.entries()].map(([key, list]) => {
      const active = list.filter((b) => b.status !== "cancelled");
      return {
        key,
        list,
        name: list[0]?.booking_points?.name ?? "—",
        color: key !== "none" ? pointColor(key, points ?? []) : undefined,
        tickets: list.map((b) => b.ticket_no).filter(Boolean) as string[],
        seats: active.flatMap((b) => b.seat_numbers ?? []),
        cancelledSeats: list.filter((b) => b.status === "cancelled").flatMap((b) => b.seat_numbers ?? []),
        total: active.reduce((s, b) => s + Number(b.amount ?? 0), 0),
      };
    });
  }, [bookings, points]);
  const activeGroup = pointGroups.find((g) => g.key === groupFor) ?? null;

  const legend = useMemo(
    () =>
      [...(points ?? [])]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((p) => ({ name: p.name, color: pointColor(p.id, points ?? []) })),
    [points],
  );

  const seatRows = useMemo(() => buildSeatRows(trip?.total_seats ?? 44), [trip?.total_seats]);
  const myTotal = (bookings ?? [])
    .filter((b) => b.status !== "cancelled")
    .reduce((sum, b) => sum + Number(b.amount ?? 0), 0);
  const myPointId = isStaff ? staffPointId : (session?.bookingPointId ?? "");
  const amount = Number(totalAmount) || 0;

  /** Live updates: any booking/seat-lock change on this trip refreshes instantly. */
  useEffect(() => {
    const channel = supabase
      .channel("seat-booking-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "seat_bookings" }, () => {
        void qc.invalidateQueries({ queryKey: ["seat_bookings"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "trip_seat_locks" }, () => {
        void qc.invalidateQueries({ queryKey: ["trip_seat_locks"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "trips" }, () => {
        void qc.invalidateQueries({ queryKey: ["trips"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc]);

  function bookingError(message: string) {
    if (message.includes("SEAT_TAKEN")) return t("seatTaken");
    if (message.includes("TRIP_FULL")) return t("tripFull");
    if (message.includes("INVALID_SEAT") || message.includes("DUPLICATE_SEATS"))
      return t("invalidSeat");
    return message;
  }

  const book = useMutation({
    mutationFn: async () => {
      if (!tripId) throw new Error(t("selectTrip"));
      if (seats.length === 0) throw new Error(t("selectSeats"));
      if (!myPointId) throw new Error(t("noBookingPointLinked"));
      if (amount <= 0) throw new Error(t("totalFare"));
      // Re-check the shared seat map right before insert so stale UI can't double-book.
      const { data: fresh, error: freshError } = await supabase
        .from("trip_seat_locks")
        .select("seat_number")
        .eq("trip_id", tripId);
      if (freshError) throw freshError;
      const taken = new Set((fresh ?? []).map((l) => l.seat_number));
      const clash = seats.filter((s) => taken.has(s));
      if (clash.length > 0) {
        void qc.invalidateQueries({ queryKey: ["trip_seat_locks", tripId] });
        setSeats((prev) => prev.filter((s) => !taken.has(s)));
        throw new Error(`${t("seatTaken")}: ${clash.join(", ")}`);
      }
      const capacity = trip?.total_seats ?? 44;
      if ((fresh?.length ?? 0) + seats.length > capacity) throw new Error(t("tripFull"));

      const { data, error } = await supabase
        .from("seat_bookings")
        .insert({
          trip_id: tripId,
          booking_point_id: myPointId,
          seat_numbers: seats,
          fare_per_seat: seats.length > 0 ? amount / seats.length : 0,
          amount,
          passenger_name: pName.trim() || null,
          passenger_phone: pPhone.trim() || null,
          destination: pDest.trim() || null,
          status: "confirmed",
          created_by: session?.userId ?? null,
        })
        .select("*, booking_points(name)")
        .single();
      if (error) throw new Error(bookingError(error.message));
      return data;
    },
    onSuccess: (row) => {
      toast.success(t("bookingConfirmed"));
      setTicket({
        ticketNo: row.ticket_no ?? "—",
        pointName: row.booking_points?.name ?? "—",
        route: trip?.route ?? "—",
        date: trip?.departure_date ?? "—",
        time: trip?.departure_time?.slice(0, 5) ?? "—",
        vehicle: trip?.vehicles?.vehicle_number ?? "—",
        seats: row.seat_numbers ?? [],
        passengerName: row.passenger_name ?? "",
        passengerPhone: row.passenger_phone ?? "",
        destination: row.destination ?? "",
        farePerSeat: Number(row.fare_per_seat ?? 0),
        amount: Number(row.amount ?? 0),
      });
      setSeats([]);
      setPName("");
      setPPhone("");
      setPDest("");
      setTotalAmount("");
      void qc.invalidateQueries({ queryKey: ["seat_bookings", tripId] });
      void qc.invalidateQueries({ queryKey: ["trip_seat_locks", tripId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  /** Moderator/point cancel: keeps the row, releases the seats and logs the change. */
  const cancelBooking = useMutation({
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
      toast.success(t("seatsReleased"));
      void qc.invalidateQueries({ queryKey: ["seat_bookings", tripId] });
      void qc.invalidateQueries({ queryKey: ["trip_seat_locks", tripId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeBooking = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("seat_bookings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("deleted"));
      void qc.invalidateQueries({ queryKey: ["seat_bookings", tripId] });
      void qc.invalidateQueries({ queryKey: ["trip_seat_locks", tripId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });


  const { data: tripChanges } = useQuery({
    queryKey: ["change_log_trips"],
    refetchInterval: 30000,
    queryFn: async () => {
      const { data } = await supabase
        .from("change_log")
        .select("*")
        .eq("entity_type", "trips")
        .order("created_at", { ascending: false })
        .limit(500);
      return data ?? [];
    },
  });
  const changedTripIds = useMemo(() => new Set((tripChanges ?? []).map((c) => c.trip_id ?? c.entity_id)), [tripChanges]);

  const filteredTrips = useMemo(() => {
    const now = new Date(Date.now() + 6 * 3600e3).toISOString().slice(0, 16).replace("T", " ");
    const q = fVehicle.trim().toLowerCase();
    return (trips ?? []).filter((tr) => {
      if (fDate && tr.departure_date !== fDate) return false;
      if (q && !(tr.vehicles?.vehicle_number ?? "").toLowerCase().includes(q)) return false;
      if (fPoint && tr.master_point_id !== fPoint) return false;
      const dt = `${tr.departure_date} ${tr.departure_time?.slice(0, 5)}`;
      if (fStatus === "upcoming" && dt < now) return false;
      if (fStatus === "departed" && dt >= now) return false;
      if (fStatus === "schedule" && !tr.schedule_id) return false;
      if (fStatus === "changed" && !changedTripIds.has(tr.id)) return false;
      return true;
    });
  }, [trips, fDate, fVehicle, fPoint, fStatus, changedTripIds]);

  const selectedTripChanges = useMemo(
    () => (tripChanges ?? []).filter((c) => (c.trip_id ?? c.entity_id) === tripId).slice(0, 5),
    [tripChanges, tripId],
  );

  function toggleSeat(seat: string) {
    if (bookedMap.has(seat)) return;
    setSeats((prev) => (prev.includes(seat) ? prev.filter((s) => s !== seat) : [...prev, seat]));
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="font-display text-3xl uppercase tracking-wide">{t("seatBooking")}</h1>

      {(isMasterPoint || isStaff) && (
        <TripForm vehicles={vehicles ?? []} supervisors={supervisors ?? []} points={points ?? []} />
      )}

      <div className="panel space-y-4 p-5">
        <div className="grid gap-3 rounded-lg border border-border bg-muted/30 p-3 sm:grid-cols-4">
          <div className="space-y-1">
            <Label htmlFor="f-date">তারিখ</Label>
            <Input id="f-date" type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="f-veh">গাড়ি নম্বর</Label>
            <div className="flex gap-1">
              <Input id="f-veh" value={fVehicle} placeholder="খুঁজুন" onChange={(e) => setFVehicle(e.target.value)} />
              {fVehicle && <Button type="button" variant="ghost" size="sm" onClick={() => setFVehicle("")}>✕</Button>}
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="f-point">বুকিং পয়েন্ট</Label>
            <select id="f-point" className={selectClass} value={fPoint} onChange={(e) => setFPoint(e.target.value)}>
              <option value="">সব</option>
              {points?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="f-status">অবস্থা</Label>
            <select id="f-status" className={selectClass} value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
              <option value="">সব</option>
              <option value="upcoming">আসন্ন</option>
              <option value="departed">ছেড়ে গেছে</option>
              <option value="schedule">শিডিউল থেকে</option>
              <option value="changed">পরিবর্তিত</option>
            </select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="sb-trip">{t("trip")}</Label>
            <select
              id="sb-trip"
              className={selectClass}
              value={tripId}
              onChange={(e) => {
                setTripId(e.target.value);
                setSeats([]);
              }}
            >
              <option value="">{t("selectTrip")}</option>
              {filteredTrips.map((tr) => (
                <option key={tr.id} value={tr.id} style={tr.trip_seq > 1 ? { color: "var(--destructive)" } : undefined}>
                  {tr.departure_date} {tr.departure_time?.slice(0, 5)} · {tr.trip_direction === "down" ? t("downTrip") : t("upTrip")} ·{" "}
                  {tr.vehicles?.vehicle_number ?? "—"}{tr.trip_seq > 1 ? ` (${["", "", "২য়", "৩য়", "৪র্থ", "৫ম"][tr.trip_seq] ?? tr.trip_seq} ট্রিপ)` : ""}{tr.night_hold ? " · নাইট হোল্ড" : ""} · {tr.booking_points?.name ?? "—"}
                </option>
              ))}
            </select>
            {filteredTrips.length === 0 && (
              <p className="text-xs text-muted-foreground">{t("noTrips")}</p>
            )}
          </div>
          {isStaff && (
            <div className="space-y-1.5">
              <Label htmlFor="sb-point">{t("bookingPoint")}</Label>
              <select
                id="sb-point"
                className={selectClass}
                value={staffPointId}
                onChange={(e) => setStaffPointId(e.target.value)}
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
        </div>

        {trip && selectedTripChanges.length > 0 && (
          <div role="alert" className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm">
            <p className="font-semibold text-destructive">⚠ এই ট্রিপে পরিবর্তন হয়েছে{trip.schedule_id ? " (শিডিউল থেকে তৈরি)" : ""}</p>
            <ul className="mt-1 space-y-0.5 text-xs">
              {selectedTripChanges.map((c) => (
                <li key={c.id}>
                  {new Date(c.created_at).toLocaleString("bn-BD")} · {c.actor_name ?? "—"} · {c.field}: {c.old_value ?? "—"} → {c.new_value ?? "—"}
                </li>
              ))}
            </ul>
          </div>
        )}
        {trip && (
          <>
            <div className="grid gap-2 text-sm sm:grid-cols-3">
              <p>
                {t("vehicleNumber")}: <strong>{trip.vehicles?.vehicle_number ?? "—"}</strong>
              </p>
              <p>
                {t("supervisorName")}: <strong>{trip.supervisors?.name ?? "—"}</strong>
              </p>
              <p>
                {t("fare")}: <strong>৳{trip.fare}</strong>
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-muted/40 p-3 text-center">
                <p className="text-xl font-bold text-destructive">{bookedMap.size}</p>
                <p className="text-xs text-muted-foreground">{t("bookedSeats")}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/40 p-3 text-center">
                <p className="text-xl font-bold">
                  {Math.max(0, (trip.total_seats ?? 44) - bookedMap.size)}
                </p>
                <p className="text-xs text-muted-foreground">{t("remainingSeats")}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/40 p-3 text-center">
                <p className="text-xl font-bold">৳{myTotal}</p>
                <p className="text-xs text-muted-foreground">{t("totalIncome")}</p>
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold">{t("seatPlan")}</p>
              <SeatPlan
                rows={seatRows}
                bookedMap={bookedMap}
                selected={seats}
                onToggle={toggleSeat}
              />
              {legend.length > 0 && (
                <div className="mt-4 rounded-md border border-border p-3">
                  <p className="mb-2 text-center text-xs font-semibold">{t("colorGuide")}</p>
                  <div className="flex flex-wrap justify-center gap-3 text-xs">
                    {legend.map((l) => (
                      <span key={l.name} className="flex items-center gap-1.5">
                        <span className="size-4 rounded-sm border border-border" style={{ background: l.color }} /> {l.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <form
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              onSubmit={(e) => {
                e.preventDefault();
                book.mutate();
              }}
            >
              <div className="space-y-1.5">
                <Label>{t("seatsSelected")}</Label>
                <Input readOnly value={`${seats.length} — ${seats.join(", ")}`} />
              </div>
              
              <div className="space-y-1.5">
                <Label htmlFor="sb-amount">{t("totalFare")}</Label>
                <Input
                  id="sb-amount"
                  type="number"
                  min={0}
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  className="font-bold"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sb-pname">{t("passengerName")} ({t("optional")})</Label>
                <Input id="sb-pname" value={pName} maxLength={80} onChange={(e) => setPName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sb-pphone">{t("passengerPhone")} ({t("optional")})</Label>
                <Input id="sb-pphone" type="tel" value={pPhone} maxLength={20} onChange={(e) => setPPhone(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sb-pdest">{t("destination")} ({t("optional")})</Label>
                <Input id="sb-pdest" value={pDest} maxLength={80} onChange={(e) => setPDest(e.target.value)} />
              </div>
              <Button type="submit" disabled={book.isPending} className="self-end">
                {t("confirmBooking")}
              </Button>
            </form>
          </>
        )}
      </div>

      {trip && (
        <div className="panel overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("ticketNo")}</TableHead>
                <TableHead>{t("bookingPoint")}</TableHead>
                <TableHead>{t("seats")}</TableHead>
                <TableHead>{t("amount")}</TableHead>
                <TableHead className="text-right">{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(bookings?.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    {t("noData")}
                  </TableCell>
                </TableRow>
              )}
              {pointGroups.map((g) => (
                <TableRow key={g.key}>
                  <TableCell className="font-mono text-xs">{g.tickets.join(", ") || "—"}</TableCell>
                  <TableCell className="font-semibold">
                    <span className="flex items-center gap-2">
                      <span className="size-3 rounded-sm" style={{ background: g.color }} />
                      {g.name} {g.list.length > 1 && <span className="text-xs text-muted-foreground">×{g.list.length}</span>}
                    </span>
                  </TableCell>
                  <TableCell className="text-destructive">
                    {g.seats.join(", ")}
                    {g.cancelledSeats.length > 0 && (
                      <span className="ml-2 line-through opacity-60">{g.cancelledSeats.join(", ")}</span>
                    )}
                  </TableCell>
                  <TableCell>৳{g.total}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => setGroupFor(g.key)}>
                      <Pencil className="size-4" /> {t("edit")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="border-t border-border p-3 text-right text-sm font-semibold">
            {t("totalAmount")}: ৳{myTotal}
          </div>
        </div>
      )}

      <TicketDialog ticket={ticket} onClose={() => setTicket(null)} />

      <Dialog open={!!activeGroup} onOpenChange={(o) => !o && setGroupFor(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{activeGroup?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {activeGroup?.list.map((b) => (
              <div key={b.id} className="rounded-md border border-border p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className={b.status === "cancelled" ? "line-through opacity-60" : "font-semibold"}>
                      {(b.seat_numbers ?? []).join(", ")} — ৳{b.amount}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {[b.ticket_no, b.passenger_name, b.passenger_phone, b.destination].filter(Boolean).join(" • ") || "—"}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" title={t("edit")} onClick={() => { setGroupFor(null); setEditRow(b as Record<string, unknown> & { id: string }); }}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title={t("print")}
                      onClick={() => {
                        setGroupFor(null);
                        setTicket({
                          ticketNo: b.ticket_no ?? "—",
                          pointName: b.booking_points?.name ?? "—",
                          route: trip?.route ?? "—",
                          date: trip?.departure_date ?? "—",
                          time: trip?.departure_time?.slice(0, 5) ?? "—",
                          vehicle: trip?.vehicles?.vehicle_number ?? "—",
                          seats: b.seat_numbers ?? [],
                          passengerName: b.passenger_name ?? "",
                          passengerPhone: b.passenger_phone ?? "",
                          destination: b.destination ?? "",
                          farePerSeat: Number(b.fare_per_seat ?? 0),
                          amount: Number(b.amount ?? 0),
                        });
                      }}
                    >
                      <Printer className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title={t("cancelBooking")}
                      disabled={b.status === "cancelled" || cancelBooking.isPending}
                      onClick={() => cancelBooking.mutate(b.id)}
                    >
                      <XCircle className="size-4 text-destructive" />
                    </Button>
                    <Button variant="ghost" size="icon" title={t("delete")} onClick={() => { if (window.confirm(t("delete") + "?")) removeBooking.mutate(b.id); }}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <EditRowDialog
        table="seat_bookings"
        row={editRow}
        onClose={() => setEditRow(null)}
        queryKey={["seat_bookings", tripId]}
        fields={[
          { key: "passenger_name", label: t("passengerName"), maxLength: 80 },
          { key: "passenger_phone", label: t("passengerPhone"), maxLength: 20 },
          { key: "destination", label: t("destination"), maxLength: 80 },
          { key: "amount", label: t("amount"), type: "number" },
          { key: "note", label: t("note"), maxLength: 200 },
        ]}
      />
    </div>
  );
}

function TripForm({
  vehicles,
  supervisors,
  points,
}: {
  vehicles: { id: string; vehicle_number: string; seat_count: number }[];
  supervisors: { id: string; name: string }[];
  points: { id: string; name: string; point_type: string }[];
}) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data: session } = useAuth();
  const isStaff = session?.role === "master_admin" || session?.role === "moderator";
  const [form, setForm] = useState({
    vehicle_id: "",
    supervisor_id: "",
    master_point_id: "",
    route: "",
    departure_date: new Date().toISOString().slice(0, 10),
    departure_time: "",
    fare: "",
    trip_direction: "up",
    night_hold: false,
  });
  const [mode, setMode] = useState<"manual" | "schedule">("manual");
  const [lookupNo, setLookupNo] = useState("");
  const [scheduleId, setScheduleId] = useState<string | null>(null);
  const { data: routes } = useQuery({
    queryKey: ["routes"],
    queryFn: async () =>
      (await supabase.from("routes").select("id, name").order("name", { ascending: true })).data ?? [],
  });
  const { data: usedSchedules } = useQuery({
    queryKey: ["trips", "schedule-ids"],
    enabled: mode === "schedule",
    queryFn: async () =>
      new Set(((await supabase.from("trips").select("schedule_id").not("schedule_id", "is", null)).data ?? []).map((r) => r.schedule_id as string)),
  });
  const { data: schedules } = useQuery({
    queryKey: ["schedules-for-trip", form.departure_date],
    enabled: mode === "schedule",
    queryFn: async () =>
      (
        await supabase
          .from("schedules")
          .select("id, vehicle_id, supervisor_id, route, departure_time, fare, trip_direction, night_hold, vehicles(vehicle_number)")
          .eq("departure_date", form.departure_date)
      ).data ?? [],
  });
  const lookupMatches = useMemo(() => {
    const q = lookupNo.trim().toLowerCase();
    if (!q) return schedules ?? [];
    return (schedules ?? []).filter((sc) =>
      (sc.vehicles?.vehicle_number ?? "").toLowerCase().includes(q),
    );
  }, [schedules, lookupNo]);
  function applySchedule(sc: (typeof lookupMatches)[number]) {
    if (usedSchedules?.has(sc.id)) {
      toast.error(t("scheduleTripExists"));
      return;
    }
    setScheduleId(sc.id);
    setForm((f) => ({
      ...f,
      vehicle_id: sc.vehicle_id ?? "",
      supervisor_id: sc.supervisor_id ?? "",
      route: sc.route ?? "",
      departure_time: sc.departure_time?.slice(0, 5) ?? "",
      fare: sc.fare != null ? String(sc.fare) : "",
      trip_direction: sc.trip_direction === "down" ? "down" : "up",
      night_hold: Boolean(sc.night_hold),
    }));
    setLookupNo(sc.vehicles?.vehicle_number ?? lookupNo);
    toast.success(t("scheduleLoaded"));
  }

  const create = useMutation({
    mutationFn: async () => {
      const masterPointId = isStaff ? form.master_point_id : (session?.bookingPointId ?? "");
      if (!masterPointId) throw new Error(t("noBookingPointLinked"));
      const sid = mode === "schedule" ? scheduleId : null;
      if (sid) {
        const { data: dup } = await supabase.from("trips").select("id").eq("schedule_id", sid).limit(1);
        if (dup && dup.length) throw new Error(t("scheduleTripExists"));
      }
      let seq = 1;
      if (form.vehicle_id) {
        const { count } = await supabase
          .from("trips")
          .select("id", { count: "exact", head: true })
          .eq("vehicle_id", form.vehicle_id)
          .eq("departure_date", form.departure_date)
          .eq("trip_direction", form.trip_direction);
        seq = (count ?? 0) + 1;
        if (seq > 1) {
          const vno = vehicles.find((v) => v.id === form.vehicle_id)?.vehicle_number ?? "";
          const ord = ["", "১ম", "২য়", "৩য়", "৪র্থ", "৫ম", "৬ষ্ঠ"][seq] ?? `${seq}তম`;
          if (!window.confirm(`আপনি কি ${vno} গাড়ির ${ord} বার ট্রিপ তৈরি করতে চান?`)) {
            throw new Error("বাতিল করা হয়েছে");
          }
        }
      }
      const seatCount = vehicles.find((v) => v.id === form.vehicle_id)?.seat_count || 44;
      const { error } = await supabase.from("trips").insert({
        vehicle_id: form.vehicle_id || null,
        supervisor_id: form.supervisor_id || null,
        master_point_id: masterPointId,
        route: form.route.trim() || null,
        departure_date: form.departure_date,
        departure_time: form.departure_time,
        total_seats: seatCount,
        fare: Number(form.fare) || 0,
        trip_direction: form.trip_direction,
        created_by: session?.userId ?? null,
        schedule_id: sid,
        trip_seq: seq,
        night_hold: form.trip_direction === "up" && form.night_hold,
      });
      if (error) {
        if (error.code === "23505") throw new Error(t("scheduleTripExists"));
        throw error;
      }
    },
    onSuccess: () => {
      toast.success(t("saved"));
      setScheduleId(null);
      setLookupNo("");
      setForm({ ...form, departure_time: "", route: "", fare: "" });
      void qc.invalidateQueries({ queryKey: ["trips"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <form
      className="panel grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4"
      onSubmit={(e) => {
        e.preventDefault();
        create.mutate();
      }}
    >
      <h2 className="font-display text-lg uppercase tracking-wide sm:col-span-2 lg:col-span-4">
        {t("createTrip")} · {t("masterPoint")}
      </h2>
      <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-4">
        <Button type="button" size="sm" variant={mode === "manual" ? "default" : "outline"} onClick={() => { setMode("manual"); setScheduleId(null); }}>
          {t("manualEntry")}
        </Button>
        <Button type="button" size="sm" variant={mode === "schedule" ? "default" : "outline"} onClick={() => setMode("schedule")}>
          {t("fromSchedule")}
        </Button>
      </div>
      {mode === "schedule" && (
        <div className="space-y-2 rounded-md border border-border bg-muted/40 p-3 sm:col-span-2 lg:col-span-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tf-sdate">{t("date")}</Label>
              <Input id="tf-sdate" type="date" value={form.departure_date}
                onChange={(e) => setForm({ ...form, departure_date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tf-lookup">{t("vehicleNumber")}</Label>
              <Input id="tf-lookup" value={lookupNo} onChange={(e) => setLookupNo(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); if (lookupMatches[0]) applySchedule(lookupMatches[0]); }
                }} />
            </div>
          </div>
          {lookupNo.trim() && lookupMatches.length === 0 && (
            <p className="text-xs text-muted-foreground">{t("noScheduleFound")}</p>
          )}
          <div className="flex flex-wrap gap-2">
            {lookupMatches.map((sc, i) => (
              <Button key={i} type="button" size="sm" variant={scheduleId === sc.id ? "default" : "secondary"} disabled={usedSchedules?.has(sc.id)} onClick={() => applySchedule(sc)}>
                {sc.vehicles?.vehicle_number} · {sc.departure_time?.slice(0, 5)} · {sc.route}
                {usedSchedules?.has(sc.id) ? ` · ${t("tripCreated")}` : ""}
              </Button>
            ))}
          </div>
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="tf-vehicle">{t("vehicleNumber")}</Label>
        <select
          id="tf-vehicle"
          className={selectClass}
          value={form.vehicle_id}
          onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })}
          required
        >
          <option value="">{t("select")}</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.vehicle_number}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="tf-supervisor">{t("supervisorName")}</Label>
        <select
          id="tf-supervisor"
          className={selectClass}
          value={form.supervisor_id}
          onChange={(e) => setForm({ ...form, supervisor_id: e.target.value })}
        >
          <option value="">{t("select")}</option>
          {supervisors.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      {isStaff && (
        <div className="space-y-1.5">
          <Label htmlFor="tf-point">{t("masterPoint")}</Label>
          <select
            id="tf-point"
            className={selectClass}
            value={form.master_point_id}
            onChange={(e) => setForm({ ...form, master_point_id: e.target.value })}
            required
          >
            <option value="">{t("select")}</option>
            {points
              .filter((p) => p.point_type === "master")
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="tf-route">{t("route")}</Label>
        <select
          id="tf-route"
          className={selectClass}
          value={form.route}
          onChange={(e) => setForm({ ...form, route: e.target.value })}
        >
          <option value="">{t("select")}</option>
          {(routes ?? []).map((r) => (
            <option key={r.id} value={r.name}>
              {r.name}
            </option>
          ))}
          {form.route && !(routes ?? []).some((r) => r.name === form.route) && (
            <option value={form.route}>{form.route}</option>
          )}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="tf-date">{t("date")}</Label>
        <Input
          id="tf-date"
          type="date"
          value={form.departure_date}
          onChange={(e) => setForm({ ...form, departure_date: e.target.value })}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="tf-time">{t("departureTime")}</Label>
        <Input
          id="tf-time"
          type="time"
          value={form.departure_time}
          onChange={(e) => setForm({ ...form, departure_time: e.target.value })}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="tf-dir">{t("routeType")}</Label>
        <select id="tf-dir" className={selectClass} value={form.trip_direction} onChange={(e) => setForm({ ...form, trip_direction: e.target.value })}>
          <option value="up">{t("upTrip")}</option>
          <option value="down">{t("downTrip")}</option>
        </select>
      </div>
      {form.trip_direction === "up" && (
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input type="checkbox" checked={form.night_hold} onChange={(e) => setForm({ ...form, night_hold: e.target.checked })} />
          নাইট হোল্ড ট্রিপ
        </label>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="tf-fare">{t("fare")}</Label>
        <Input
          id="tf-fare"
          type="number"
          min={0}
          value={form.fare}
          onChange={(e) => setForm({ ...form, fare: e.target.value })}
        />
      </div>
      <Button type="submit" disabled={create.isPending} className="self-end">
        {t("createTrip")}
      </Button>
    </form>
  );
}

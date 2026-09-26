import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const generateDailySummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { data: isAdmin } = await sb.rpc("has_role", { _user_id: context.userId, _role: "master_admin" });
    if (!isAdmin) throw new Error("শুধু মাষ্টার অ্যাডমিন");

    const [{ data: trips }, { data: schedules }, { data: points }] = await Promise.all([
      sb.from("trips").select("id, departure_time, total_seats, route, schedule_id, vehicles(vehicle_number)").eq("departure_date", data.date),
      sb.from("schedules").select("id, route, departure_time, vehicles(vehicle_number)").eq("departure_date", data.date),
      sb.from("booking_points").select("id, name"),
    ]);
    const tripIds = (trips ?? []).map((t) => t.id);
    const [{ data: bookings }, { data: changes }] = tripIds.length
      ? await Promise.all([
          sb.from("seat_bookings").select("trip_id, booking_point_id, seat_numbers, amount, status").in("trip_id", tripIds),
          sb.from("change_log").select("trip_id, field, old_value, new_value").in("trip_id", tripIds),
        ])
      : [{ data: [] }, { data: [] }];

    const pname = new Map((points ?? []).map((p) => [p.id, p.name]));
    const active = (bookings ?? []).filter((b) => b.status !== "cancelled");
    const byPoint: Record<string, { seats: number; amount: number }> = {};
    for (const b of active) {
      const k = pname.get(b.booking_point_id ?? "") ?? "অজানা";
      byPoint[k] ??= { seats: 0, amount: 0 };
      byPoint[k].seats += b.seat_numbers.length;
      byPoint[k].amount += Number(b.amount);
    }
    const tripStats = (trips ?? []).map((t) => {
      const booked = active.filter((b) => b.trip_id === t.id).reduce((a, b) => a + b.seat_numbers.length, 0);
      return { vehicle: t.vehicles?.vehicle_number, time: t.departure_time?.slice(0, 5), route: t.route, total: t.total_seats, booked };
    });
    const scheduledNoTrip = (schedules ?? []).filter((s) => !(trips ?? []).some((t) => t.schedule_id === s.id));
    const facts = {
      date: data.date, trips: tripStats, bookingsByPoint: byPoint,
      cancelled: (bookings ?? []).length - active.length,
      schedulesWithoutTrip: scheduledNoTrip.map((s) => ({ vehicle: s.vehicles?.vehicle_number, time: s.departure_time?.slice(0, 5), route: s.route })),
      changes: changes ?? [],
    };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env["LOVABLE_API_KEY"]}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "তুমি একটি বাস কাউন্টার বুকিং সিস্টেমের অপারেশন বিশ্লেষক। বাংলায় সংক্ষিপ্ত, কার্যকর সারসংক্ষেপ দাও মার্কডাউন বুলেটে: ১) দৈনিক আসন বুকিং ও ভরাট হার, ২) সবচেয়ে ব্যস্ত বুকিং পয়েন্ট, ৩) সম্ভাব্য সমস্যা (কম ভরাট ট্রিপ, ট্রিপ ছাড়া শিডিউল, পরিবর্তন, বাতিল), ৪) করণীয় পরামর্শ। শুধু দেয়া তথ্য ব্যবহার করো।" },
          { role: "user", content: JSON.stringify(facts) },
        ],
      }),
    });
    if (res.status === 429) throw new Error("অনেক বেশি অনুরোধ, একটু পরে চেষ্টা করুন");
    if (res.status === 402) throw new Error("AI ক্রেডিট শেষ");
    if (!res.ok) throw new Error("AI সারসংক্ষেপ তৈরি ব্যর্থ");
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return { summary: json.choices?.[0]?.message?.content ?? "", facts };
  });

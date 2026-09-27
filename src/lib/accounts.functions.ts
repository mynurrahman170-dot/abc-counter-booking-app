import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { staffEmail, staffPassword, normalizeLoginId } from "./staff-credentials";

const createSchema = z.object({
  role: z.enum(["moderator", "booking_point"]),
  name: z.string().trim().min(2).max(80),
  loginId: z.string().trim().min(3).max(40),
  pin: z.string().trim().min(4).max(20),
  bookingPointId: z.string().uuid().optional().nullable(),
});

export const createStaffAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isMaster } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "master_admin",
    });
    if (!isMaster) throw new Error("Forbidden");

    const loginId = normalizeLoginId(data.loginId);
    if (!loginId) throw new Error("Invalid ID");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: staffEmail(data.role, loginId),
      password: staffPassword(loginId, data.pin),
      email_confirm: true,
      user_metadata: {
        name: data.name.trim(),
        login_id: loginId,
        role: data.role,
        booking_point_id: data.bookingPointId ?? "",
      },
    });
    if (error) throw new Error(error.message);
    const uid = created.user.id;
    // No signup trigger exists, so write profile + role rows directly.
    await supabaseAdmin.from("profiles").upsert({
      id: uid,
      name: data.name.trim(),
      login_id: loginId,
      email: created.user.email ?? null,
      booking_point_id: data.bookingPointId ?? null,
    });
    const { data: hasRole } = await supabaseAdmin
      .from("user_roles").select("id").eq("user_id", uid).maybeSingle();
    if (!hasRole) await supabaseAdmin.from("user_roles").insert({ user_id: uid, role: data.role });
    return { ok: true };
  });

export const listStaffAccounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isMaster } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "master_admin",
    });
    if (!isMaster) throw new Error("Forbidden");

    const { data: profiles } = await context.supabase
      .from("profiles")
      .select("id, name, login_id, email, booking_point_id, created_at")
      .order("created_at", { ascending: false });
    const { data: roles } = await context.supabase.from("user_roles").select("user_id, role");

    return (profiles ?? []).map((p) => ({
      ...p,
      role: roles?.find((r) => r.user_id === p.id)?.role ?? null,
    }));
  });

export const deleteStaffAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: isMaster } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "master_admin",
    });
    if (!isMaster) throw new Error("Forbidden");
    if (data.userId === context.userId) throw new Error("Cannot delete yourself");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const resetSchema = z.object({
  userId: z.string().uuid(),
  pin: z.string().trim().min(4).max(20),
});

/** Master admin resets a staff PIN (password is derived from login id + PIN). */
export const resetStaffPin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => resetSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isMaster } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "master_admin",
    });
    if (!isMaster) throw new Error("Forbidden");

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("login_id")
      .eq("id", data.userId)
      .maybeSingle();
    const loginId = normalizeLoginId(profile?.login_id ?? "");
    if (!loginId) throw new Error("This account has no login ID");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: staffPassword(loginId, data.pin),
    });
    if (error) throw new Error(error.message);
    return { ok: true, loginId };
  });


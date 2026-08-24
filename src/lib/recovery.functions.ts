import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { staffEmail, staffPassword, normalizeLoginId } from "./staff-credentials";

const recoverSchema = z.object({
  code: z.string().trim().min(4).max(64),
  role: z.enum(["master", "moderator", "booking_point"]),
  identifier: z.string().trim().min(3).max(255),
  newSecret: z.string().trim().min(4).max(72),
});

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Recover any account with the shared secret code — no email required. */
export const recoverWithCode = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => recoverSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: setting } = await supabaseAdmin
      .from("recovery_settings")
      .select("code_hash")
      .maybeSingle();
    if (!setting?.code_hash) throw new Error("RECOVERY_UNAVAILABLE");

    const given = await sha256Hex(data.code);
    if (given !== setting.code_hash) throw new Error("INVALID_CODE");

    const email =
      data.role === "master"
        ? data.identifier.toLowerCase()
        : staffEmail(data.role, data.identifier);

    const { data: list, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (listError) throw new Error(listError.message);
    const user = list.users.find((u) => (u.email ?? "").toLowerCase() === email.toLowerCase());
    if (!user) throw new Error("ACCOUNT_NOT_FOUND");

    const password =
      data.role === "master"
        ? data.newSecret
        : staffPassword(normalizeLoginId(data.identifier), data.newSecret);

    const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, { password });
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("credential_requests").insert({
      name: data.role === "master" ? email : normalizeLoginId(data.identifier),
      login_id: data.role === "master" ? null : normalizeLoginId(data.identifier),
      role: data.role === "master" ? "master_admin" : data.role,
      message: "Recovered with secret code",
      status: "handled",
      handled_at: new Date().toISOString(),
    });

    return { ok: true as const };
  });

/** Master admin can rotate the shared secret code. */
export const setRecoveryCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ code: z.string().trim().min(4).max(64) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: isMaster } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "master_admin",
    });
    if (!isMaster) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("recovery_settings")
      .upsert({ id: true, code_hash: await sha256Hex(data.code), updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

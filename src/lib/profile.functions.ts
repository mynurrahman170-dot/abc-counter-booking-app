import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Makes sure the signed-in user has a profile row and a role row.
 * Needed because auth.users has no signup trigger in this project.
 */
export const ensureProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    const user = userRes?.user;
    if (!user) throw new Error("User not found");
    const meta = (user.user_metadata ?? {}) as Record<string, string | undefined>;

    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id, name")
      .eq("id", user.id)
      .maybeSingle();

    if (!existing) {
      await supabaseAdmin.from("profiles").insert({
        id: user.id,
        name: (meta['name'] ?? "").trim() || (user.email ?? "").split("@")[0] || "Admin",
        login_id: meta['login_id'] ?? null,
        email: user.email ?? null,
        booking_point_id: meta['booking_point_id'] ? meta['booking_point_id'] : null,
      });
    }

    const { data: roleRow } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!roleRow) {
      const { count } = await supabaseAdmin
        .from("user_roles")
        .select("id", { count: "exact", head: true })
        .eq("role", "master_admin");

      const metaRole = meta['role'];
      const role =
        !count || count === 0
          ? "master_admin"
          : metaRole === "moderator" || metaRole === "booking_point"
            ? metaRole
            : "booking_point";

      await supabaseAdmin.from("user_roles").insert({ user_id: user.id, role });
    }

    return { ok: true };
  });

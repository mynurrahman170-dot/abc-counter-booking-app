import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ensureProfile } from "@/lib/profile.functions";

export type Session = {
  userId: string;
  email: string | null;
  name: string;
  loginId: string | null;
  bookingPointId: string | null;
  bookingPointName: string | null;
  pointType: "master" | "normal" | null;
  role: "master_admin" | "moderator" | "booking_point" | null;
};

export function useAuth() {
  return useQuery<Session | null>({
    queryKey: ["session-profile"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return null;

      const load = async () => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("name, login_id, booking_point_id")
          .eq("id", user.id)
          .maybeSingle();
        const { data: roleRow } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();
        return { profile, roleRow };
      };

      let { profile, roleRow } = await load();
      if (!profile || !roleRow) {
        try {
          await ensureProfile();
          ({ profile, roleRow } = await load());
        } catch {
          /* ignore */
        }
      }


      let bookingPointName: string | null = null;
      let pointType: "master" | "normal" | null = null;
      if (profile?.booking_point_id) {
        const { data: bp } = await supabase
          .from("booking_points")
          .select("name, point_type")
          .eq("id", profile.booking_point_id)
          .maybeSingle();
        bookingPointName = bp?.name ?? null;
        pointType = bp?.point_type === "master" ? "master" : "normal";
      }

      return {
        userId: user.id,
        email: user.email ?? null,
        name: profile?.name ?? "",
        loginId: profile?.login_id ?? null,
        bookingPointId: profile?.booking_point_id ?? null,
        bookingPointName,
        pointType,
        role: (roleRow?.role as Session["role"]) ?? null,
      };
    },
  });
}

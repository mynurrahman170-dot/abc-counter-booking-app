import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Calculator, Armchair, BarChart3, History, Sparkles, Bus, CalendarClock, LayoutDashboard, LogIn, LogOut, MapPin, Route as RouteIcon, Ticket, User, UserCog, Users } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, type TKey } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";

const items: {
  to: string;
  key: TKey;
  icon: typeof Bus;
  roles?: ("master_admin" | "moderator" | "booking_point")[];
}[] = [
  { to: "/dashboard", key: "dashboard", icon: LayoutDashboard },
  { to: "/seat-booking", key: "seatBooking", icon: Armchair },
  { to: "/bookings", key: "bookingsList", icon: Ticket },
  { to: "/reports", key: "reports", icon: BarChart3 },
  { to: "/schedule", key: "scheduleBoard", icon: CalendarClock },
  { to: "/daily-schedule", key: "dailySchedule", icon: CalendarClock },
  { to: "/reconcile", key: "reconcile", icon: Calculator },
  { to: "/vehicles", key: "vehicles", icon: Bus, roles: ["master_admin", "moderator"] },
  { to: "/routes", key: "routes", icon: RouteIcon },
  { to: "/booking-points", key: "bookingPoints", icon: MapPin, roles: ["master_admin", "moderator"] },
  { to: "/supervisors", key: "supervisors", icon: UserCog, roles: ["master_admin", "moderator"] },
  { to: "/change-history", key: "changeHistory", icon: History },
  { to: "/ai-summary", key: "aiSummary", icon: Sparkles, roles: ["master_admin"] },
  { to: "/accounts", key: "accounts", icon: Users, roles: ["master_admin"] },
];

export function AppSidebar() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  const visible = items.filter((i) => !i.roles || (session?.role && i.roles.includes(session.role)));


  const roleLabel =
    session?.role === "master_admin"
      ? t("saAdmin")
      : session?.role === "moderator"
      ? t("moderator")
      : session?.role === "booking_point"
      ? t("bookingPoint")
      : null;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-1 py-1.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <Bus className="size-4" />
          </span>
          <span className="truncate font-display text-base uppercase tracking-wide">
            {t("appName")}
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("dashboard")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visible.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild isActive={pathname === item.to} tooltip={t(item.key)}>
                    <Link to={item.to} className="flex items-center gap-2">
                      <item.icon className="size-4" />
                      <span>{t(item.key)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <div className="flex items-center gap-2 rounded-md px-2 py-2 text-sm">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-sidebar-primary/10 text-sidebar-primary">
                    <User className="size-4" />
                  </span>
                  <div className="flex flex-col overflow-hidden">
                    <span className="truncate font-medium">{session?.name || t("guest")}</span>
                    {roleLabel ? (
                      <span className="truncate text-xs text-accent">{roleLabel}</span>
                    ) : null}
                    {session?.bookingPointName ? (
                      <span className="truncate text-xs text-muted-foreground">{session.bookingPointName}</span>
                    ) : null}
                  </div>
                </div>
              </SidebarMenuItem>
              {session ? (
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={signOut} tooltip={t("logout")}>
                    <LogOut className="size-4" />
                    <span>{t("logout")}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip={t("login")}>
                    <Link to="/" className="flex items-center gap-2">
                      <LogIn className="size-4" />
                      <span>{t("login")}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarFooter>
    </Sidebar>
  );
}

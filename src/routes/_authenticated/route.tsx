import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { LanguageToggle, useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const { t } = useI18n();
  const { data: session } = useAuth();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="flex h-14 items-center gap-3 border-b border-border bg-card px-3">
            <SidebarTrigger />
            <span className="font-display text-lg uppercase tracking-wide">{t("appName")}</span>
            <div className="ml-auto flex items-center gap-3">
              {session?.name ? (
                <span className="hidden text-xs text-muted-foreground sm:inline">
                  {t("signedInAs")}: <strong className="text-foreground">{session.name}</strong>
                </span>
              ) : null}
              <LanguageToggle />
            </div>
          </header>
          <main className="flex-1 bg-background p-4 sm:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

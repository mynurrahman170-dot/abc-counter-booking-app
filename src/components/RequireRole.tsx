import type { ReactNode } from "react";

import { useAuth, type Session } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";

type Role = NonNullable<Session["role"]>;

/** Renders children only when the signed-in user's role is allowed. */
export function RequireRole({ allow, children }: { allow: Role[]; children: ReactNode }) {
  const { t } = useI18n();
  const { data: session, isLoading } = useAuth();

  if (isLoading) return <p className="text-muted-foreground">{t("loading")}</p>;
  if (!session || !session.role || !allow.includes(session.role)) {
    return <p className="text-muted-foreground">{t("accessDenied")}</p>;
  }
  return <>{children}</>;
}

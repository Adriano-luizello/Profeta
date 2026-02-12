import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getDashboardKpis } from "@/lib/dashboard-data";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

async function logoutAction() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const [kpisResult, { data: profetaUser }] = await Promise.all([
      getDashboardKpis(supabase, user.id),
      supabase
        .from("profeta_users")
        .select("organization_id")
        .eq("id", user.id)
        .maybeSingle(),
    ]);

    const produtosEmRisco = kpisResult?.produtosEmRisco ?? 0;

    let organizationName: string | null = null;
    let plan: string | null = null;
    if (profetaUser?.organization_id) {
      const { data: org } = await supabase
        .from("organizations")
        .select("name, plan")
        .eq("id", profetaUser.organization_id)
        .maybeSingle();
      organizationName = org?.name ?? null;
      plan = org?.plan ?? null;
    }

    return (
      <DashboardShell
        userEmail={user.email ?? ""}
        organizationName={organizationName}
        plan={plan}
        produtosEmRisco={produtosEmRisco}
        logoutAction={logoutAction}
      >
        {children}
      </DashboardShell>
    );
  } catch (err) {
    console.error("[DashboardLayout] Error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="max-w-md space-y-4 rounded-xl border border-profeta-border bg-profeta-card p-6">
          <h2 className="text-lg font-semibold text-profeta-text-primary">
            Erro ao carregar
          </h2>
          <p className="text-sm text-profeta-text-secondary">{message}</p>
          <a
            href="/login"
            className="inline-block text-sm text-profeta-green hover:underline"
          >
            Voltar ao login
          </a>
        </div>
      </div>
    );
  }
}

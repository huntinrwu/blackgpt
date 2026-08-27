import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface Summary {
  total_users: number;
  new_users: number;
  dau: number;
  wau: number;
  mau: number;
  returning_users: number;
  total_messages: number;
  messages_per_user: number;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
  daily: { day: string; users: number; messages: number; cost_usd: number }[];
  sources: { source: string; visits: number }[];
}

const RANGES = [7, 30, 90];

const Stat = ({ label, value, hint }: { label: string; value: string | number; hint?: string }) => (
  <div className="rounded-xl border border-border bg-card p-4">
    <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="mt-1 text-2xl font-bold font-display text-gradient-gold">{value}</p>
    {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
  </div>
);

const Analytics = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth?next=/analytics");
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase.functions
      .invoke("analytics-summary", { body: { days } })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) setError("You need admin access to view analytics.");
        else {
          setError(null);
          setData(data as unknown as Summary);
        }
        setLoading(false);
      });
    return () => { cancelled = true; };

  }, [user, authLoading, days, navigate]);

  const maxMessages = Math.max(1, ...(data?.daily ?? []).map((d) => d.messages));

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")} aria-label="Back to chat">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-bold font-display">
          <span className="text-gradient-gold">BlackGPT</span> Analytics
        </h1>
        <div className="ml-auto flex gap-1">
          {RANGES.map((r) => (
            <Button
              key={r}
              size="sm"
              variant={days === r ? "default" : "ghost"}
              onClick={() => setDays(r)}
            >
              {r}d
            </Button>
          ))}
        </div>
      </header>

      <div className="mx-auto w-full max-w-4xl p-4">
        {loading && <p className="text-muted-foreground text-sm">Loading the numbers…</p>}
        {error && <p className="text-destructive text-sm">{error}</p>}

        {data && !error && (
          <div className="space-y-6">
            <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat label="Total users" value={data.total_users} hint={`${data.new_users} new in ${days}d`} />
              <Stat label="Daily active" value={data.dau} />
              <Stat label="Weekly active" value={data.wau} />
              <Stat label="Monthly active" value={data.mau} />
              <Stat label="Returning" value={data.returning_users} hint="active on 2+ days" />
              <Stat label="Messages" value={data.total_messages} />
              <Stat label="Msgs / user" value={data.messages_per_user} />
              <Stat
                label="Token cost"
                value={`$${Number(data.cost_usd).toFixed(2)}`}
                hint={`${data.tokens_in.toLocaleString()} in / ${data.tokens_out.toLocaleString()} out`}
              />
            </section>

            <section>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Daily activity
              </h2>
              <div className="rounded-xl border border-border bg-card p-4">
                {data.daily.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No activity yet.</p>
                ) : (
                  <div className="flex h-40 items-end gap-1">
                    {data.daily.map((d) => (
                      <div key={d.day} className="group flex flex-1 flex-col items-center justify-end gap-1">
                        <div
                          className="w-full rounded-t bg-primary/70 transition-colors group-hover:bg-primary"
                          style={{ height: `${(d.messages / maxMessages) * 100}%` }}
                          title={`${d.day}: ${d.messages} messages, ${d.users} users`}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Where they come from
              </h2>
              <div className="divide-y divide-border rounded-xl border border-border bg-card">
                {data.sources.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">No traffic sources yet.</p>
                ) : (
                  data.sources.map((s) => (
                    <div key={s.source} className="flex items-center justify-between px-4 py-2 text-sm">
                      <span className="truncate">{s.source}</span>
                      <span className="text-muted-foreground">{s.visits}</span>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
};

export default Analytics;

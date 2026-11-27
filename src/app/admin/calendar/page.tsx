import Link from "next/link";
import { redirect } from "next/navigation";
import { and, gte, isNull, lt } from "drizzle-orm";
import { db, DB_ACTIVE } from "@/db/client";
import { emailCampaigns, productOverrides, tools } from "@/db/schema";
import { getAdminIdentity, roleCan } from "@/lib/admin";

export const dynamic = "force-dynamic";

interface CalendarEvent {
  at: number;
  kind: "tool" | "promo" | "campaign";
  label: string;
  href: string;
}

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function parseMonth(key: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(key);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return { year, month };
}

function monthKeyOf(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function shiftMonth(year: number, month: number, delta: number): string {
  const date = new Date(year, month - 1 + delta, 1);
  return monthKeyOf(date.getFullYear(), date.getMonth() + 1);
}

const KIND_STYLE: Record<CalendarEvent["kind"], string> = {
  tool: "bg-accent-soft text-accent",
  promo: "bg-warning/15 text-warning",
  campaign: "bg-success/15 text-success",
};

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/admin");
  if (!roleCan(identity.role, "catalog")) redirect("/admin?error=forbidden");

  const sp = await searchParams;
  const parsed = parseMonth(String(sp.month ?? "")) ?? parseMonth(currentMonthKey())!;
  const { year, month } = parsed;
  const start = new Date(year, month - 1, 1).getTime();
  const end = new Date(year, month, 1).getTime();

  const events: CalendarEvent[] = [];

  if (DB_ACTIVE) {
    try {
      const scheduled = await db
        .select({ id: tools.id, name: tools.name, publishAt: tools.publishAt })
        .from(tools)
        .where(
          and(
            isNull(tools.deletedAt),
            gte(tools.publishAt, start),
            lt(tools.publishAt, end),
          ),
        );
      for (const row of scheduled) {
        if (!row.publishAt) continue;
        events.push({
          at: row.publishAt,
          kind: "tool",
          label: `Publish: ${row.name}`,
          href: `/admin/tools/${row.id}`,
        });
      }
    } catch {
      // tools unavailable
    }

    try {
      const campaigns = await db
        .select({
          id: emailCampaigns.id,
          subject: emailCampaigns.subject,
          scheduledAt: emailCampaigns.scheduledAt,
          status: emailCampaigns.status,
        })
        .from(emailCampaigns)
        .where(
          and(
            gte(emailCampaigns.scheduledAt, start),
            lt(emailCampaigns.scheduledAt, end),
          ),
        );
      for (const row of campaigns) {
        if (!row.scheduledAt) continue;
        events.push({
          at: row.scheduledAt,
          kind: "campaign",
          label: `Campaign: ${row.subject}`,
          href: "/admin/campaigns",
        });
      }
    } catch {
      // campaigns table may be empty/unavailable
    }

    try {
      const overrides = await db.select().from(productOverrides);
      for (const row of overrides) {
        const productName = row.name ?? row.productId;
        if (row.promoStartsAt && row.promoStartsAt >= start && row.promoStartsAt < end) {
          events.push({
            at: row.promoStartsAt,
            kind: "promo",
            label: `Promo mulai: ${productName}`,
            href: "/admin/products",
          });
        }
        if (row.promoEndsAt && row.promoEndsAt >= start && row.promoEndsAt < end) {
          events.push({
            at: row.promoEndsAt,
            kind: "promo",
            label: `Promo berakhir: ${productName}`,
            href: "/admin/products",
          });
        }
      }
    } catch {
      // overrides unavailable
    }
  }

  events.sort((a, b) => a.at - b.at);
  const byDay = new Map<number, CalendarEvent[]>();
  for (const event of events) {
    const day = new Date(event.at).getDate();
    const list = byDay.get(day) ?? [];
    list.push(event);
    byDay.set(day, list);
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstWeekday = new Date(year, month - 1, 1).getDay(); // 0 = Sunday
  const leadingBlanks = (firstWeekday + 6) % 7; // Monday-first
  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="py-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Editorial Calendar</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Jadwal publish tool, promo produk, dan email campaign dalam satu tampilan.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Link href={`/admin/calendar?month=${shiftMonth(year, month, -1)}`} className="btn-secondary !px-2.5 !py-1">
            ←
          </Link>
          <span className="font-medium">{monthLabel}</span>
          <Link href={`/admin/calendar?month=${shiftMonth(year, month, 1)}`} className="btn-secondary !px-2.5 !py-1">
            →
          </Link>
        </div>
      </div>

      <div className="card mt-6 overflow-x-auto p-4">
        <div className="grid min-w-[720px] grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wider text-muted-foreground">
          {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((day) => (
            <div key={day} className="pb-1">{day}</div>
          ))}
          {Array.from({ length: leadingBlanks }).map((_, index) => (
            <div key={`blank-${index}`} />
          ))}
          {Array.from({ length: daysInMonth }, (_, index) => index + 1).map((day) => {
            const dayEvents = byDay.get(day) ?? [];
            return (
              <div
                key={day}
                className={`min-h-[92px] rounded-lg border border-border p-1.5 text-left ${
                  dayEvents.length > 0 ? "bg-muted/30" : ""
                }`}
              >
                <span className="text-[10px] font-semibold text-muted-foreground">{day}</span>
                <div className="mt-1 space-y-0.5">
                  {dayEvents.slice(0, 4).map((event, index) => (
                    <Link
                      key={`${event.kind}-${index}`}
                      href={event.href}
                      className={`block truncate rounded px-1 py-0.5 text-[9px] ${KIND_STYLE[event.kind]}`}
                      title={event.label}
                    >
                      {event.label}
                    </Link>
                  ))}
                  {dayEvents.length > 4 && (
                    <span className="block text-[9px] text-muted-foreground">
                      +{dayEvents.length - 4} lagi
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card mt-4 p-5">
        <h2 className="font-semibold">Agenda bulan ini ({events.length})</h2>
        {events.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Belum ada jadwal. Atur “Jadwal publish” di edit tool, promo di Produk &amp; Harga, atau
            schedule campaign.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border text-sm">
            {events.map((event, index) => (
              <li key={index} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="min-w-0">
                  <span className={`mr-2 rounded px-1.5 py-0.5 text-[10px] ${KIND_STYLE[event.kind]}`}>
                    {event.kind}
                  </span>
                  <Link href={event.href} className="hover:text-accent">
                    {event.label}
                  </Link>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(event.at).toLocaleString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

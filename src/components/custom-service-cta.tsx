import { CalendarClock, Mail, Sparkles } from "lucide-react";

const CONTACT_EMAIL = "aktifkoding@gmail.com";
const SCHEDULE_URL = "https://cal.com/aktifkoding-1qk4c6/15min";
const MAILTO = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Konsultasi aplikasi web/mobile kustom")}`;

// CTA jasa pembuatan aplikasi kustom: kontak email langsung + booking call.
export function CustomServiceCta({ compact = false }: { compact?: boolean }) {
  return (
    <section
      className={`rounded-xl border border-accent/30 bg-accent-soft/40 ${
        compact ? "p-5" : "mt-12 p-6 sm:p-8"
      }`}
    >
      <h2 className={`flex items-center gap-2 font-semibold ${compact ? "text-sm" : "text-lg"}`}>
        <Sparkles className="h-4 w-4 shrink-0 text-accent" aria-hidden />
        Butuh aplikasi web atau mobile kustom?
      </h2>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        Kami bantu rancang dan bangun aplikasi sesuai kebutuhan bisnis Anda — dari MVP sampai
        produksi. Hubungi langsung lewat email atau jadwalkan call 15 menit.
      </p>
      <div className={`flex flex-col gap-2 ${compact ? "mt-3" : "mt-4 sm:flex-row"}`}>
        <a
          href={MAILTO}
          className="btn-secondary inline-flex items-center justify-center gap-2 text-xs"
        >
          <Mail className="h-3.5 w-3.5" aria-hidden />
          {CONTACT_EMAIL}
        </a>
        <a
          href={SCHEDULE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary inline-flex items-center justify-center gap-2 text-xs"
        >
          <CalendarClock className="h-3.5 w-3.5" aria-hidden />
          Jadwalkan call 15 menit
        </a>
      </div>
    </section>
  );
}

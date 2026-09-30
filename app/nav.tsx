"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Logo from "./logo";
import ThemeToggle from "./theme-toggle";

const links: { href: string; label: string; short?: string }[] = [
  { href: "/", label: "Overview" },
  { href: "/instruments", label: "Instruments" },
  { href: "/ideas", label: "Investment Recommendations", short: "Recommendations" },
  { href: "/ipo", label: "IPOs" },
  { href: "/news", label: "News impact" },
];

// NSE cash market: Mon–Fri, 09:15–15:30 IST.
// ponytail: ignores exchange holidays; add the NSE holiday list if the badge being wrong on holidays matters.
function marketOpen(now: Date) {
  const ist = new Date(now.getTime() + (330 + now.getTimezoneOffset()) * 60_000);
  const mins = ist.getHours() * 60 + ist.getMinutes();
  const weekday = ist.getDay() >= 1 && ist.getDay() <= 5;
  return weekday && mins >= 555 && mins < 930;
}

function MarketBadge() {
  const [open, setOpen] = useState<boolean | null>(null);
  useEffect(() => {
    const tick = () => setOpen(marketOpen(new Date()));
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);
  if (open === null) return null;
  return (
    <span className="hidden items-center gap-2 text-xs text-text-2 sm:inline-flex" title="NSE trading hours: Mon–Fri, 9:15–15:30 IST">
      {open ? <span className="live-dot" /> : <span className="h-[7px] w-[7px] rounded-full bg-text-3" />}
      NSE {open ? "open" : "closed"}
    </span>
  );
}

export default function Nav() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-6 px-4 sm:gap-8 lg:px-8">
        <Link href="/" aria-label="Sutra home" className="flex shrink-0 items-center">
          <Logo />
        </Link>
        <nav className="no-scrollbar flex h-14 min-w-0 gap-4 overflow-x-auto overflow-y-hidden sm:gap-6" aria-label="Main">
          {links.map((l) => (
            <Link key={l.href} href={l.href} aria-current={(l.href === "/" ? path === "/" : path.startsWith(l.href)) ? "page" : undefined} className="tab shrink-0 whitespace-nowrap">
              {l.short ? (
                <>
                  <span className="hidden 2xl:inline">{l.label}</span>
                  <span className="2xl:hidden">{l.short}</span>
                </>
              ) : l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-4">
          <MarketBadge />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

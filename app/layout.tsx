import type { Metadata } from "next";
import { Geist, Instrument_Serif } from "next/font/google";
import "./globals.css";
import Logo from "./logo";
import Nav from "./nav";

const sans = Geist({ variable: "--f-sans", subsets: ["latin"] });
const serif = Instrument_Serif({ variable: "--f-serif", subsets: ["latin"], weight: "400", style: "italic" });

export const metadata: Metadata = {
  title: { default: "Sutra · Markets, threaded to your money", template: "%s · Sutra" },
  description: "Sutra threads India and global market news to the stocks, funds, bonds and gold you follow, with a calm daily overview and a view by time horizon.",
  applicationName: "Sutra",
};

const themeScript = `try{document.documentElement.dataset.theme=localStorage.getItem("theme")||(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light")}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${sans.variable} ${serif.variable} h-full`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full">
        <Nav />
        {children}
        <footer className="border-t border-line">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-4 py-6 lg:px-8">
            <Logo size={20} />
            <p className="meta">Markets, threaded to your money. For information only, not investment advice.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}

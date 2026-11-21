import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "فعاليات البيت",
  description: "أسئلة وفعاليات عائلية بإدارة المقدم",
  appleWebApp: {
    capable: true,
    title: "فعاليات البيت",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

const themeBoot = `try{var raw=localStorage.getItem("trivia.theme");var theme=raw?JSON.parse(raw):null;var ids=["kraft","candy","meadow","tide","comic","ash"];var patterns=["dots","waves","halftone"];var palette=theme&&ids.indexOf(theme.palette)>=0?theme.palette:"kraft";var pattern=theme&&patterns.indexOf(theme.pattern)>=0?theme.pattern:"dots";var root=document.documentElement;root.dataset.palette=palette;root.dataset.pattern=pattern;root.removeAttribute("data-mode");}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ar"
      dir="rtl"
      data-palette="kraft"
      data-pattern="dots"
      className={`${cairo.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body className="min-h-dvh antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

import type { ReactNode } from "react";

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-7xl px-6 lg:px-12 ${className}`}>{children}</div>;
}

export function Section({ children, tone = "surface", className = "", id }: { children: ReactNode; tone?: "surface" | "low" | "white" | "dark"; className?: string; id?: string }) {
  const bg = { surface: "bg-surface", low: "bg-surface-container-low", white: "bg-surface-container-lowest", dark: "bg-primary-container text-on-primary" }[tone];
  return (
    <section id={id} className={`w-full py-16 lg:py-20 ${bg} ${className}`}>
      <Container>{children}</Container>
    </section>
  );
}

export function Eyebrow({ children, dark = false }: { children?: ReactNode; dark?: boolean }) {
  if (!children) return null;
  return <span className={`block text-eyebrow uppercase ${dark ? "text-secondary-fixed" : "text-secondary"}`}>{children}</span>;
}

export function SectionTitle({ eyebrow, title, subtitle, dark = false, center = false }: { eyebrow?: string; title?: string; subtitle?: string; dark?: boolean; center?: boolean }) {
  if (!title && !eyebrow) return null;
  return (
    <div className={`mb-10 max-w-3xl ${center ? "mx-auto text-center" : ""}`}>
      <Eyebrow dark={dark}>{eyebrow}</Eyebrow>
      {title && <h2 className={`mt-3 text-headline-lg-mobile lg:text-headline-lg ${dark ? "text-on-primary" : "text-on-surface"}`}>{title}</h2>}
      {subtitle && <p className={`mt-4 text-body-lg ${dark ? "text-on-primary-container" : "text-on-surface-variant"}`}>{subtitle}</p>}
    </div>
  );
}

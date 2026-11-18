"use client";
import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { useDict } from "./LangProvider";

export function BackToTop() {
  const d = useDict();
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  if (!show) return null;
  return (
    <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label={d.backToTop}
      className="fixed bottom-6 end-6 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-on-secondary shadow-lg">
      <Icon name="arrow_upward" />
    </button>
  );
}

import { useEffect } from "react";

/**
 * Locks the page behind a modal (overflow: hidden on <html> and <body>) while the component is mounted,
 * and restores whatever was there before. The scrollbar's width is added back as padding so the page
 * doesn't jump sideways when the scrollbar disappears.
 */
export function useScrollLock() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prev = { html: html.style.overflow, body: body.style.overflow, pad: body.style.paddingRight };
    const scrollbar = window.innerWidth - html.clientWidth; // measured before the lock
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
    return () => {
      html.style.overflow = prev.html;
      body.style.overflow = prev.body;
      body.style.paddingRight = prev.pad;
    };
  }, []);
}

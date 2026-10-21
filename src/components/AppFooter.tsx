/** Centered credit line at the bottom of every page. Sits in the normal flow (not fixed), so it never covers anything. */
export function AppFooter() {
  return (
    <footer className="px-6 pt-10 pb-[max(2rem,env(safe-area-inset-bottom))] text-center text-xs leading-relaxed text-muted-foreground">
      <p>Hecho por Lalo para los que ven mucho cine</p>
      <p>© 2026. ALL RIGHTS RESERVED.</p>
    </footer>
  );
}

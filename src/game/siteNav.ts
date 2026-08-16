/**
 * Appends a making-of link to every `.level-nav` on the page.
 */
export function addHowItWasMadeLink(): void {
  const navs = Array.from(document.querySelectorAll(".level-nav"));
  for (const nav of navs) {
    if (!(nav instanceof HTMLElement) || nav.querySelector('a[href="how.html"]')) {
      continue;
    }
    nav.append(" · ");
    const link = document.createElement("a");
    link.href = "how.html";
    link.textContent = "How this was made";
    nav.append(link);
  }
}

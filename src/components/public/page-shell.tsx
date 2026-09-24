import { ReactNode } from "react";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

export function PageShell({ children }: { children: ReactNode }) {
  return <><SiteHeader /><main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">{children}</main><SiteFooter /></>;
}

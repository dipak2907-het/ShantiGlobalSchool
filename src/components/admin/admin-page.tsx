import { ReactNode } from "react";
import { AdminShell } from "./admin-shell";

export function AdminPage({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return <AdminShell><header className="mb-8"><h1 className="text-3xl font-bold">{title}</h1>{description && <p className="mt-2 text-slate-600">{description}</p>}</header>{children}</AdminShell>;
}

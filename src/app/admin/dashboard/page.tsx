import Link from "next/link";
import { AdminPage } from "@/components/admin/admin-page";

const actions = [
  ["Publish notice", "/admin/notices"], ["Upload gallery photos", "/admin/gallery"],
  ["Add student", "/admin/students"], ["Manage timetable", "/admin/timetables"],
  ["Start live event", "/admin/live"], ["Review inquiries", "/admin/inquiries"],
];

export default function DashboardPage() {
  return <AdminPage title="Dashboard" description="Quick actions for school operations. Access is restricted by your assigned role."><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{actions.map(([label, href]) => <Link key={href} href={href} className="rounded-xl bg-white p-6 font-semibold shadow-sm ring-1 ring-slate-200 hover:ring-blue-600">{label} →</Link>)}</div></AdminPage>;
}

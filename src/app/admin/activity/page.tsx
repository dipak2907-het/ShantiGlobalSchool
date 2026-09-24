import { AdminPage } from "@/components/admin/admin-page";

export default function ActivityPage() {
  return <AdminPage title="Activity log" description="Records sensitive content changes for principal/admin review."><section className="rounded-xl bg-white p-6 shadow-sm"><p>Activity records are automatically written by database triggers for notices, gallery items, students, and live events.</p></section></AdminPage>;
}

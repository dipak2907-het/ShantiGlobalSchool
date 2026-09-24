import { NoticesView } from "@/components/public/notices-view";
import { PageHeading } from "@/components/public/page-heading";
import { PageShell } from "@/components/public/page-shell";

export default function NoticesPage() {
  return <PageShell><PageHeading title="Notices and announcements" description="Search notices, newest first." /><NoticesView /></PageShell>;
}

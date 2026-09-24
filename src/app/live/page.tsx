import { PageHeading } from "@/components/public/page-heading";
import { PageShell } from "@/components/public/page-shell";
import { LiveEvent } from "@/components/public/live-event";
import { schoolContent } from "@/config/school";

export default function LivePage() {
  return <PageShell><PageHeading title="Live event" description={schoolContent.live.description} /><LiveEvent variant="page" /></PageShell>;
}

import { PageHeading } from "@/components/public/page-heading";
import { PageShell } from "@/components/public/page-shell";
import { TimetableView } from "@/components/public/timetable-view";

export default function ClassTimetablePage() {
  return <PageShell><PageHeading title="Class timetable" description="Choose a standard and section to view its weekly timetable." /><TimetableView /></PageShell>;
}

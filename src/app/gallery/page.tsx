import { GalleryView } from "@/components/public/gallery-view";
import { PageHeading } from "@/components/public/page-heading";
import { PageShell } from "@/components/public/page-shell";

export default function GalleryPage() {
  return <PageShell><PageHeading title="Gallery" description="PLACEHOLDER: Browse school moments by year and event." /><GalleryView /></PageShell>;
}

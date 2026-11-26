import { notFound } from "next/navigation";
import { sectionForSlug } from "@/lib/types";

/**
 * Unknown top-level addresses land in [section]. They're refused here, above the loading screen, so they still
 * answer with a real 404 (once the loading screen has been sent, the status can no longer change).
 */
export default async function SectionLayout({ children, params }: { children: React.ReactNode; params: Promise<{ section: string }> }) {
  if (!sectionForSlug((await params).section)) notFound();
  return children;
}

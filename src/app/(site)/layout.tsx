import { SiteHeader } from "@/components/site-header";
import { Suspense } from "react";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Suspense fallback={null}><SiteHeader /></Suspense>
      {children}
    </div>
  );
}

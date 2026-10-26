import { redirect } from "next/navigation";

// Browser view and downloaded HTML share one authenticated renderer.
export default async function ReportPage({params}:{params:Promise<{id:string}>}) {
  const {id}=await params;
  redirect(`/api/reports/${encodeURIComponent(id)}/document`);
}

import { redirect } from "next/navigation";

/**
 * Assessment entry point.
 * Without a database, generates a UUID and redirects to the question page.
 * With a database, would POST to /api/assessment to create a DB record first.
 */
export default function AssessmentStartPage() {
  const assessmentId = crypto.randomUUID();
  redirect(`/assessment/${assessmentId}`);
}

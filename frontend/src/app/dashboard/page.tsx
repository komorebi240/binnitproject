"use client";

import { redirect } from "next/navigation";

/** /dashboard has no content of its own — land on the first real section. */
export default function DashboardIndexPage() {
  redirect("/dashboard/departments");
}

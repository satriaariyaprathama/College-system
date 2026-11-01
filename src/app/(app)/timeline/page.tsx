import { redirect } from "next/navigation";

export default function TimelineRedirectPage() {
  redirect("/review?tab=timeline");
}

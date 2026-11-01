import { redirect } from "next/navigation";

export default function LearningRedirectPage() {
  redirect("/projects?tab=learning");
}

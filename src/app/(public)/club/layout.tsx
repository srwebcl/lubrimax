import { notFound } from "next/navigation";
import { CLUB_ENABLED } from "@/lib/features";

// Club LUBRIMAX en stand by: /club responde 404 hasta reactivarlo
// (ver src/lib/features.ts).
export default function ClubLayout({ children }: { children: React.ReactNode }) {
  if (!CLUB_ENABLED) notFound();
  return children;
}

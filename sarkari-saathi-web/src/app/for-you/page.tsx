import type { Metadata } from "next";
import ForYouView from "@/components/foryou/ForYouView";

export const metadata: Metadata = { title: "Schemes for me" };

export default function ForYouPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <ForYouView />
    </div>
  );
}

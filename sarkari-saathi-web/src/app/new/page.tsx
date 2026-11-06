import type { Metadata } from "next";
import NewSchemesView from "@/components/newschemes/NewSchemesView";

export const metadata: Metadata = { title: "New schemes" };

export default function NewSchemesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <NewSchemesView />
    </div>
  );
}

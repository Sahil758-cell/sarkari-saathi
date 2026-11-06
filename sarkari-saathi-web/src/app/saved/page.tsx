import type { Metadata } from "next";
import SavedView from "@/components/saved/SavedView";

export const metadata: Metadata = { title: "Saved profiles" };

export default function SavedPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <SavedView />
    </div>
  );
}

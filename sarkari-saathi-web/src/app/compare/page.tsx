import type { Metadata } from "next";
import { Suspense } from "react";
import { Spinner } from "@/components/Feedback";
import CompareView from "@/components/compare/CompareView";

export const metadata: Metadata = { title: "Compare schemes" };

export default function ComparePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Suspense fallback={<Spinner />}>
        <CompareView />
      </Suspense>
    </div>
  );
}

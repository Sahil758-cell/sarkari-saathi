import type { Metadata } from "next";
import { Suspense } from "react";
import { Spinner } from "@/components/Feedback";
import ResultsView from "@/components/results/ResultsView";

export const metadata: Metadata = { title: "Your matching schemes" };

export default function ResultsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Suspense fallback={<Spinner />}>
        <ResultsView />
      </Suspense>
    </div>
  );
}

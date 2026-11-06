import type { Metadata } from "next";
import { Suspense } from "react";
import CheckWizard from "@/components/check/CheckWizard";
import { Spinner } from "@/components/Feedback";

export const metadata: Metadata = { title: "Find my schemes" };

export default function CheckPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Suspense fallback={<Spinner />}>
        <CheckWizard />
      </Suspense>
    </div>
  );
}

import type { Metadata } from "next";
import { Suspense } from "react";
import AssistantView from "@/components/assistant/AssistantView";
import { Spinner } from "@/components/Feedback";

export const metadata: Metadata = { title: "Ask AI" };

export default function AssistantPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <Suspense fallback={<Spinner />}>
        <AssistantView />
      </Suspense>
    </div>
  );
}

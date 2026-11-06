import type { Metadata } from "next";
import { Suspense } from "react";
import { Spinner } from "@/components/Feedback";
import SearchView from "@/components/search/SearchView";

export const metadata: Metadata = { title: "Search schemes" };

export default function SearchPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Suspense fallback={<Spinner />}>
        <SearchView />
      </Suspense>
    </div>
  );
}

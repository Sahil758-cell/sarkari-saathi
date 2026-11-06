import { Suspense } from "react";
import { Spinner } from "@/components/Feedback";
import SchemeDetailView from "@/components/scheme/SchemeDetailView";

// `params` is runtime data, so it is read inside a Suspense boundary
// (Cache Components prerenders the shell and streams the rest).
async function SchemeContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <SchemeDetailView slug={slug} />;
}

export default function SchemePage({ params }: PageProps<"/schemes/[slug]">) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Suspense fallback={<Spinner />}>
        <SchemeContent params={params} />
      </Suspense>
    </div>
  );
}

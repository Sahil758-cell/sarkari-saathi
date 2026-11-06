import type { Metadata } from "next";
import DocumentsView from "@/components/documents/DocumentsView";

export const metadata: Metadata = { title: "Common documents" };

export default function DocumentsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <DocumentsView />
    </div>
  );
}

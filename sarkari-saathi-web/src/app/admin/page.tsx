import type { Metadata } from "next";
import AdminView from "@/components/admin/AdminView";

// Not linked from the site; the review API itself needs the server's ADMIN_SECRET.
export const metadata: Metadata = { title: "Review", robots: { index: false, follow: false } };

export default function AdminPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <AdminView />
    </div>
  );
}

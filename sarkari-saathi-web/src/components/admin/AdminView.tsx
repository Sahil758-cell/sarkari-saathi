"use client";

import { ExternalLink, Flag, Lock, ShieldAlert, ShieldCheck, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ErrorBox, Spinner } from "@/components/Feedback";
import {
  adminApi,
  ApiError,
  type AdminEdit,
  type AdminReport,
  type AdminScheme,
} from "@/lib/api";
import { useFetch } from "@/lib/hooks";

// Review screen for the team (English only). Schemes found by live search start
// unverified; here a person checks them against the official page, fixes
// mistakes, and either verifies or deletes them. Users' "report a problem"
// messages show up here too. Needs the server's ADMIN_SECRET.

const REASONS: Record<string, string> = {
  wrong_info: "Wrong information",
  outdated: "Out of date",
  broken_link: "Broken link",
  other: "Other",
};

function SchemeEditor({
  scheme,
  secret,
  onChanged,
}: {
  scheme: AdminScheme;
  secret: string;
  onChanged: () => void;
}) {
  const [benefits, setBenefits] = useState(scheme.benefits_summary ?? "");
  const [conditions, setConditions] = useState(scheme.other_conditions.join("\n"));
  const [documents, setDocuments] = useState(scheme.documents_required.join("\n"));
  const [link, setLink] = useState(scheme.application_link ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const lines = (text: string) =>
    text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

  async function run(action: () => Promise<unknown>, done: string) {
    setBusy(true);
    setMessage("");
    try {
      await action();
      setMessage(done);
      onChanged();
    } catch (e) {
      setMessage(e instanceof ApiError ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  function save() {
    const body: AdminEdit = {
      benefits_summary: benefits.trim(),
      other_conditions: lines(conditions),
      documents_required: lines(documents),
      application_link: link.trim(),
    };
    void run(() => adminApi.edit(secret, scheme.slug, body), "Saved");
  }

  const fieldClass =
    "w-full rounded-lg border border-line bg-surface p-2 text-sm focus:border-primary";

  return (
    <div className="mt-4 space-y-3 border-t border-line pt-4">
      <label className="block text-xs font-semibold text-muted">
        Benefits
        <textarea value={benefits} onChange={(e) => setBenefits(e.target.value)} rows={2} className={fieldClass} />
      </label>
      <label className="block text-xs font-semibold text-muted">
        Eligibility rules (one per line)
        <textarea value={conditions} onChange={(e) => setConditions(e.target.value)} rows={4} className={fieldClass} />
      </label>
      <label className="block text-xs font-semibold text-muted">
        Documents (one per line)
        <textarea value={documents} onChange={(e) => setDocuments(e.target.value)} rows={3} className={fieldClass} />
      </label>
      <label className="block text-xs font-semibold text-muted">
        Application link (empty = none)
        <input value={link} onChange={(e) => setLink(e.target.value)} className={fieldClass} />
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={save}
          className="rounded-full border border-line px-4 py-1.5 text-sm font-semibold hover:bg-canvas disabled:opacity-60"
        >
          Save changes
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            void run(() => adminApi.verify(secret, scheme.slug, !scheme.verified), scheme.verified ? "Unverified" : "Verified")
          }
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
        >
          {scheme.verified ? <ShieldAlert size={14} aria-hidden /> : <ShieldCheck size={14} aria-hidden />}
          {scheme.verified ? "Mark unverified" : "Mark verified"}
        </button>
        {confirmDelete ? (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => void run(() => adminApi.remove(secret, scheme.slug), "Deleted")}
              className="rounded-full bg-danger px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              Yes, delete for good
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="rounded-full border border-line px-4 py-1.5 text-sm font-semibold hover:bg-canvas"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-danger/30 px-4 py-1.5 text-sm font-semibold text-danger hover:bg-danger-light"
          >
            <Trash2 size={14} aria-hidden />
            Delete
          </button>
        )}
        {message ? <span className="text-sm text-muted">{message}</span> : null}
      </div>
    </div>
  );
}

function Dashboard({ secret }: { secret: string }) {
  const data = useFetch(`admin:${secret}`, async () => {
    const [schemes, reports] = await Promise.all([adminApi.schemes(secret), adminApi.reports(secret)]);
    return { schemes: schemes.results, reports: reports.results };
  });
  const [open, setOpen] = useState<string>();

  if (data.error) {
    const wrong = data.error instanceof ApiError && data.error.status === 401;
    const off = data.error instanceof ApiError && data.error.status === 503;
    return (
      <ErrorBox
        message={
          wrong
            ? "Wrong admin secret."
            : off
              ? "Admin is not set up: add ADMIN_SECRET to the server's environment."
              : "Could not load. Is the server awake?"
        }
        onRetry={data.reload}
      />
    );
  }
  if (!data.data) return <Spinner />;

  const { schemes, reports }: { schemes: AdminScheme[]; reports: AdminReport[] } = data.data;
  const resolve = async (id: string) => {
    await adminApi.resolve(secret, id);
    data.reload();
  };

  return (
    <div className="space-y-10">
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-xl font-bold">
          <Flag size={18} aria-hidden /> Reports from users ({reports.length})
        </h2>
        {reports.length === 0 ? (
          <p className="text-sm text-muted">No open reports.</p>
        ) : (
          <ul className="space-y-2">
            {reports.map((r) => (
              <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl bg-surface p-4 ring-1 ring-line">
                <div className="min-w-0">
                  <Link href={`/schemes/${encodeURIComponent(r.slug)}`} className="font-semibold text-primary hover:underline">
                    {r.scheme_name ?? r.slug}
                  </Link>
                  <p className="text-sm">
                    <span className="font-semibold">{REASONS[r.reason] ?? r.reason}</span>
                    {r.note ? ` — ${r.note}` : ""}
                  </p>
                  <p className="text-xs text-faint">{r.created?.slice(0, 10)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void resolve(r.id)}
                  className="rounded-full border border-line px-3 py-1 text-xs font-semibold hover:bg-canvas"
                >
                  Mark resolved
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold">Schemes found by live search ({schemes.length})</h2>
        <ul className="space-y-3">
          {schemes.map((s) => (
            <li key={s.slug} className="rounded-xl bg-surface p-4 shadow-card ring-1 ring-line">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-bold">{s.scheme_name}</h3>
                  <p className="text-xs text-muted">
                    {s.state?.join(", ") || "Central"} · {s.date_added?.slice(0, 10)}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold">
                    {s.verified ? (
                      <span className="rounded-full bg-primary-light px-2 py-0.5 text-primary">Verified</span>
                    ) : (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">Unverified</span>
                    )}
                    {s.open_reports > 0 ? (
                      <span className="rounded-full bg-danger-light px-2 py-0.5 text-danger">
                        {s.open_reports} report{s.open_reports > 1 ? "s" : ""}
                      </span>
                    ) : null}
                    {s.source_url ? (
                      <a href={s.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                        Source <ExternalLink size={12} aria-hidden />
                      </a>
                    ) : null}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(open === s.slug ? undefined : s.slug)}
                  className="rounded-full border border-line px-4 py-1.5 text-sm font-semibold hover:bg-canvas"
                >
                  {open === s.slug ? "Close" : "Review"}
                </button>
              </div>
              {open === s.slug ? (
                <SchemeEditor key={`${s.slug}-${s.verified}`} scheme={s} secret={secret} onChanged={data.reload} />
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default function AdminView() {
  const [typed, setTyped] = useState("");
  const [secret, setSecret] = useState("");

  return (
    <>
      <h1 className="mb-6 text-2xl font-extrabold sm:text-3xl">Review</h1>
      {secret ? (
        <Dashboard secret={secret} />
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSecret(typed.trim());
          }}
          className="flex max-w-md flex-wrap gap-2"
        >
          <label htmlFor="admin-secret" className="sr-only">
            Admin secret
          </label>
          <div className="relative min-w-[14rem] flex-1">
            <Lock size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-faint" aria-hidden />
            <input
              id="admin-secret"
              type="password"
              autoComplete="off"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="Admin secret"
              className="w-full rounded-full border border-line bg-surface py-3 pl-10 pr-4 text-sm focus:border-primary"
            />
          </div>
          <button
            type="submit"
            disabled={!typed.trim()}
            className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
          >
            Open
          </button>
        </form>
      )}
    </>
  );
}

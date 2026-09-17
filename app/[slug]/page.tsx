"use client";

import { useState, useEffect, use } from "react";
import { supabase } from "@/lib/supabase";
import type { Batch } from "@/lib/batches";
import BatchCard from "../components/BatchCard"; // Adjust paths based on your folder layout!

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Reusable Win95 borders — matches page.tsx / UploadForm.tsx / BatchCard.tsx tokens
const inset =
  "border-2 border-t-[#808080] border-l-[#808080] border-r-[#ffffff] border-b-[#ffffff]";
const raised =
  "border-2 border-t-[#ffffff] border-l-[#ffffff] border-r-[#808080] border-b-[#808080] active:border-t-[#808080] active:border-l-[#808080] active:border-r-[#ffffff] active:border-b-[#ffffff]";

export default function SharedSlugPage({ params }: PageProps) {
  // Unwrap the dynamic route params using React.use() uwu~
  const { slug } = use(params);

  const [batch, setBatch] = useState<Batch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function fetchSharedThread() {
      setLoading(true);
      setError(null);
      try {
        const now = new Date().toISOString();

        const { data, error: dbError } = await supabase
          .from("batches")
          .select(
            `
            id,
            slug,
            expires_at,
            files ( id, filename, storage_path, size, mime_type )
          `,
          )
          .eq("slug", slug)
          .gt("expires_at", now)
          .single(); // We expect exactly one record! OwoO

        if (dbError) {
          throw new Error(
            "This thread could not be found, or it may have fully loomed and dissolved.",
          );
        }

        if (ignore) return; // slug changed or component unmounted mid-flight — drop this response

        if (data) {
          setBatch(data as unknown as Batch);
        }
      } catch (err) {
        if (ignore) return;
        setError(
          err instanceof Error ? err.message : "An unknown error occurred.",
        );
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    if (slug) {
      fetchSharedThread();
    }

    return () => {
      ignore = true;
    };
  }, [slug]);

  return (
    <main className="min-h-screen bg-[#008080] font-serif text-black p-4 sm:p-8 flex items-center justify-center">
      {/* 📁 Same Windows 95 Explorer Window Container as the home page uwu~ */}
      <div className="w-full max-w-4xl bg-[#c0c0c0] border-2 border-t-[#ffffff] border-l-[#ffffff] border-r-[#404040] border-b-[#404040] shadow-[3px_3px_0px_#000000] p-[2px] flex flex-col font-mono text-xs">

        {/* 🗔 Title Bar */}
        <div className="bg-gradient-to-r from-[#000080] to-[#1084d0] px-2 py-1 flex items-center justify-between text-white font-bold select-none">
          <span className="flex items-center gap-1.5 truncate">
            {/* Lucide Folder Icon */}
            <svg
              className="w-3.5 h-3.5 shrink-0 stroke-current text-white"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L8.6 3.3A2 2 0 0 0 6.9 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
            </svg>
            Exploring - C:\looming_\shared\{slug}
          </span>
          <div className="flex gap-1 shrink-0">
            <button
              type="button"
              aria-hidden="true"
              tabIndex={-1}
              className="w-4 h-3.5 bg-[#c0c0c0] border border-t-[#ffffff] border-l-[#ffffff] border-r-[#404040] border-b-[#404040] text-black text-[9px] flex items-center justify-center font-bold leading-none active:border-t-[#404040] active:border-l-[#404040] active:border-r-[#ffffff] active:border-b-[#ffffff] active:pt-0.5 active:pl-0.5"
            >
              _
            </button>
            <button
              type="button"
              aria-hidden="true"
              tabIndex={-1}
              className="w-4 h-3.5 bg-[#c0c0c0] border border-t-[#ffffff] border-l-[#ffffff] border-r-[#404040] border-b-[#404040] text-black flex items-center justify-center font-bold leading-none active:border-t-[#404040] active:border-l-[#404040] active:border-r-[#ffffff] active:border-b-[#ffffff] active:pt-0.5 active:pl-0.5"
            >
              <span className="w-2 h-2 border border-black inline-block"></span>
            </button>
            <a
              href="/"
              aria-label="Close and return to looming_"
              className="w-4 h-3.5 bg-[#c0c0c0] border border-t-[#ffffff] border-l-[#ffffff] border-r-[#404040] border-b-[#404040] text-black text-[11px] flex items-center justify-center font-bold leading-none active:border-t-[#404040] active:border-l-[#404040] active:border-r-[#ffffff] active:border-b-[#ffffff] active:pt-0.5 active:pl-0.5"
            >
              &#215;
            </a>
          </div>
        </div>

        {/* 🌐 Toolbar & Address Box */}
        <div className="flex items-center gap-2 p-1.5 border-b border-white shadow-[0_1px_0_#808080] bg-[#c0c0c0]">
          <a
            href="/"
            className="text-[#000080] font-bold hover:underline whitespace-nowrap flex items-center gap-1"
          >
            {/* Lucide ArrowUp / CornerLeftUp Icon */}
            <svg
              className="w-3.5 h-3.5 stroke-current"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m9 14-5-5 5-5" />
              <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11" />
            </svg>
            Up
          </a>
          <span className="text-[#404040] font-bold">Address:</span>
          <div className={`flex-1 bg-white ${inset} px-2 py-0.5 flex items-center gap-1.5 min-w-0`}>
            {/* Lucide FolderOpen Icon */}
            <svg
              className="w-3.5 h-3.5 shrink-0 stroke-current text-[#000080]"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m6 14 1.5-2.9A2 2 0 0 1 9.27 10H22l-2 9H4Z" />
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            <span className="font-bold text-[#000080] truncate">
              C:\looming_\shared\{slug}
            </span>
          </div>
        </div>

        {/* 🖥️ Content Area */}
        <div className="p-3 min-h-[300px] flex flex-col gap-3">
          <div className="flex items-center justify-between border-b-2 border-dotted border-[#808080] pb-1">
            <span className="font-bold text-[#000080]">
              INCOMING THREAD TRANSMISSION
            </span>
            <span className="text-[10px] text-[#000080] font-bold flex items-center gap-1">
              {loading ? (
                <>
                  {/* Lucide Loader2 / Hourglass Icon */}
                  <svg
                    className="w-3 h-3 animate-spin stroke-current"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  retrieving...
                </>
              ) : error ? (
                <>
                  {/* Lucide XCircle / Unlink Icon */}
                  <svg
                    className="w-3 h-3 stroke-current text-[#800000]"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="m15 9-6 6" />
                    <path d="m9 9 6 6" />
                  </svg>
                  severed
                </>
              ) : (
                <>
                  {/* Lucide Radio / CircleDot Icon */}
                  <svg
                    className="w-3 h-3 stroke-current text-[#000080]"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  shared terminal active
                </>
              )}
            </span>
          </div>

          {loading ? (
            <p className="text-[#808080] p-2 flex items-center gap-2">
              <svg
                className="w-4 h-4 animate-spin stroke-current"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              retrieving shared drop files...
            </p>
          ) : error ? (
            <div className={`bg-white ${inset} p-5 text-center space-y-2`}>
              <p className="text-[#800000] font-bold flex items-center justify-center gap-1.5">
                {/* Lucide AlertTriangle Icon */}
                <svg
                  className="w-4 h-4 stroke-current"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                link status: severed
              </p>
              <p className="text-[#404040]">{error}</p>
              <a
                href="/"
                className={`inline-flex items-center gap-1.5 mt-2 px-4 py-1 ${raised} bg-[#c0c0c0] text-black font-bold`}
              >
                {/* Lucide ArrowLeft Icon */}
                <svg
                  className="w-3.5 h-3.5 stroke-current"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m12 19-7-7 7-7" />
                  <path d="M19 12H5" />
                </svg>
                back to looming_
              </a>
            </div>
          ) : batch ? (
            <BatchCard batch={batch} />
          ) : null}
        </div>

        {/* 📊 Taskbar Status Strip */}
        <footer className="border-t border-white shadow-[inset_0_1px_0_#808080] p-1 flex gap-2 bg-[#c0c0c0] text-[10px]">
          <div className="flex-1 border border-t-[#808080] border-l-[#808080] border-r-[#ffffff] border-b-[#ffffff] px-2 py-0.5 text-[#404040]">
            {batch ? "1 object(s) found" : loading ? "Syncing DB..." : "0 object(s) found"}
          </div>
          <div className="flex-1 border border-t-[#808080] border-l-[#808080] border-r-[#ffffff] border-b-[#ffffff] px-2 py-0.5 text-[#404040] text-right font-bold">
            shared terminal view
          </div>
        </footer>

      </div>
    </main>
  );
}
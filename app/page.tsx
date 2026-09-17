"use client";

import { useState, useEffect, useCallback } from "react";
import UploadForm from "./components/UploadForm";
import BatchCard from "./components/BatchCard";
import { supabase } from "@/lib/supabase";
import type { Batch } from "@/lib/batches";

const OWNED_SLUGS_KEY = "looming_owned_slugs";
const AUTO_REFRESH_MS = 60_000;

function readOwnedSlugs(): string[] {
  const raw = localStorage.getItem(OWNED_SLUGS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    console.warn("⚠️ owned_slugs in localStorage was corrupted, resetting");
    localStorage.removeItem(OWNED_SLUGS_KEY);
    return [];
  }
}

function writeOwnedSlugs(slugs: string[]) {
  localStorage.setItem(OWNED_SLUGS_KEY, JSON.stringify(slugs));
}

export default function Home() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sysTime, setSysTime] = useState<string>("");

  // 📡 Fetch only the threads that belong to THIS browser! uwu~
  const fetchMyLiveThreads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const mySlugs = readOwnedSlugs();

      if (mySlugs.length === 0) {
        setBatches([]);
        return;
      }

      const now = new Date().toISOString();

      const { data, error: fetchError } = await supabase
        .from("batches")
        .select(
          `
          id,
          slug,
          expires_at,
          files ( id, filename, storage_path, size, mime_type )
        `,
        )
        .gt("expires_at", now)
        .in("slug", mySlugs)
        .order("expires_at", { ascending: true });

      if (fetchError) throw fetchError;
      setBatches((data ?? []) as unknown as Batch[]);
    } catch (err) {
      console.error("❌ Error fetching your personal threads:", err);
      setError("couldn't reach the drive — try refreshing (っ×_×)っ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyLiveThreads();

    // Clock updater for Win95 taskbar status cell =3
    const updateClock = () => {
      setSysTime(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    };
    updateClock();
    const clockTimer = setInterval(updateClock, 1000);

    // Soft auto-refresh so expired batches quietly drop off the list
    const refreshTimer = setInterval(fetchMyLiveThreads, AUTO_REFRESH_MS);

    return () => {
      clearInterval(clockTimer);
      clearInterval(refreshTimer);
    };
  }, [fetchMyLiveThreads]);

  function handleUploadSuccess(newSlug: string) {
    const currentSlugs = readOwnedSlugs();
    const updatedSlugs = currentSlugs.includes(newSlug)
      ? currentSlugs
      : [...currentSlugs, newSlug];
    writeOwnedSlugs(updatedSlugs);
    fetchMyLiveThreads();
  }

  return (
    <main className="min-h-screen bg-[#008080] font-serif text-black p-4 sm:p-8 flex items-center justify-center">
      {/* 📁 Outer Windows 95 Explorer Window Container OwO */}
      <div className="w-full max-w-4xl bg-[#c0c0c0] border-2 border-t-[#ffffff] border-l-[#ffffff] border-r-[#404040] border-b-[#404040] shadow-[3px_3px_0px_#000000] p-[2px] flex flex-col font-mono text-xs">

        {/* 🗔 Title Bar >w< */}
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
            Exploring - C:\looming_\active_drops
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
              type="button"
              aria-hidden="true"
              tabIndex={-1}
              className="w-4 h-3.5 bg-[#c0c0c0] border border-t-[#ffffff] border-l-[#ffffff] border-r-[#404040] border-b-[#404040] text-black text-[11px] flex items-center justify-center font-bold leading-none active:border-t-[#404040] active:border-l-[#404040] active:border-r-[#ffffff] active:border-b-[#ffffff] active:pt-0.5 active:pl-0.5"
            >
              &#215;
            </a>
          </div>
        </div>

        {/* 📑 Menu Bar :-3 */}
        <div className="flex gap-4 px-2 py-1 border-b border-[#808080] bg-[#c0c0c0] text-black select-none">
          <span className="cursor-pointer hover:bg-[#000080] hover:text-white px-1">
            <u className="no-underline underline">F</u>ile
          </span>
          <span className="cursor-pointer hover:bg-[#000080] hover:text-white px-1">
            <u className="no-underline underline">E</u>dit
          </span>
          <span className="cursor-pointer hover:bg-[#000080] hover:text-white px-1">
            <u className="no-underline underline">V</u>iew
          </span>
          <span className="cursor-pointer hover:bg-[#000080] hover:text-white px-1">
            <u className="no-underline underline">T</u>ools
          </span>
          <span className="cursor-pointer hover:bg-[#000080] hover:text-white px-1">
            <u className="no-underline underline">H</u>elp
          </span>
        </div>

        {/* 🌐 Toolbar & Address Box x3 */}
        <div className="flex items-center gap-2 p-1.5 border-b border-white shadow-[0_1px_0_#808080] bg-[#c0c0c0]">
          <span className="text-[#404040] font-bold">Address:</span>
          <div className="flex-1 bg-white border-2 border-t-[#808080] border-l-[#808080] border-r-[#ffffff] border-b-[#ffffff] px-2 py-0.5 flex items-center gap-1.5">
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
              C:\looming_\active_drops
            </span>
          </div>
        </div>

        {/* 🖥️ Main Workspace Split View ^w^ */}
        <div className="flex flex-col md:flex-row gap-2 p-1.5 min-h-[480px]">

          {/* 🌲 Left Sidebar Tree >:-3 */}
          <aside className="w-full md:w-56 bg-white border-2 border-t-[#808080] border-l-[#808080] border-r-[#ffffff] border-b-[#ffffff] p-2 space-y-1 select-none overflow-y-auto">
            <div className="text-black flex items-center gap-1">
              {/* Lucide Monitor Icon */}
              <svg
                className="w-3.5 h-3.5 shrink-0 stroke-current"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="20" height="14" x="2" y="3" rx="2" />
                <line x1="12" x2="12" y1="17" y2="21" />
                <line x1="8" x2="16" y1="21" y2="21" />
              </svg>
              Desktop
            </div>
            <div className="text-black pl-2 flex items-center gap-1">
              └
              {/* Lucide HardDrive Icon */}
              <svg
                className="w-3.5 h-3.5 shrink-0 stroke-current"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="22" x2="2" y1="12" y2="12" />
                <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
                <line x1="6" x2="6.01" y1="16" y2="16" />
                <line x1="10" x2="10.01" y1="16" y2="16" />
              </svg>
              (C:) Hard Drive
            </div>
            <div className="text-black pl-5 flex items-center gap-1">
              └
              {/* Lucide Folder Icon */}
              <svg
                className="w-3.5 h-3.5 shrink-0 stroke-current"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L8.6 3.3A2 2 0 0 0 6.9 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
              </svg>
              looming_
            </div>
            <div className="bg-[#000080] text-white pl-8 py-0.5 flex items-center gap-1 font-bold">
              ├
              {/* Lucide FolderOpen Icon */}
              <svg
                className="w-3.5 h-3.5 shrink-0 stroke-current text-white"
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
              active_drops ({batches.length})
            </div>
            <div className="text-black pl-8 flex items-center gap-1">
              └
              {/* Lucide Trash2 Icon */}
              <svg
                className="w-3.5 h-3.5 shrink-0 stroke-current"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                <line x1="10" x2="10" y1="11" y2="17" />
                <line x1="14" x2="14" y1="11" y2="17" />
              </svg>
              trash_bin
            </div>
            <div className="text-black pl-2 flex items-center gap-1">
              └
              {/* Lucide Network / Globe Icon */}
              <svg
                className="w-3.5 h-3.5 shrink-0 stroke-current"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                <path d="M2 12h20" />
              </svg>
              Network Places
            </div>
          </aside>

          {/* 📄 Main Content Area UwUwU */}
          <section className="flex-1 flex flex-col gap-2">

            {/* Upload Area Component Box */}
            <div className="bg-white border-2 border-t-[#808080] border-l-[#808080] border-r-[#ffffff] border-b-[#ffffff] p-3">
              <h2 className="text-[11px] font-bold text-[#000080] mb-2 uppercase tracking-wider flex items-center gap-1.5">
                {/* Lucide Sparkles Icon */}
                <svg
                  className="w-3.5 h-3.5 shrink-0 stroke-current text-[#000080]"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                </svg>
                Drop a new thread into folder
              </h2>
              <UploadForm onUploadComplete={handleUploadSuccess} />
            </div>

            {/* Live Threads View */}
            <div className="flex-1 bg-white border-2 border-t-[#808080] border-l-[#808080] border-r-[#ffffff] border-b-[#ffffff] p-3 overflow-y-auto space-y-3">
              <div className="flex items-center justify-between border-b-2 border-dotted border-[#808080] pb-1">
                <span className="font-bold text-[#000080]">
                  CONTENTS OF C:\LOOMING_\ACTIVE_DROPS
                </span>
                <span className="text-[10px] text-[#000080] font-bold flex items-center gap-1">
                  {loading ? (
                    <>
                      {/* Lucide Loader2 Spinner Icon */}
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
                      syncing...
                    </>
                  ) : (
                    <>
                      {/* Lucide CircleDot Status Icon */}
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
                      local context active
                    </>
                  )}
                </span>
              </div>

              {error ? (
                <div className="text-xs text-red-700 bg-red-50 border border-red-300 p-2 flex items-center justify-between gap-2">
                  <span>{error}</span>
                  <button
                    onClick={fetchMyLiveThreads}
                    className="underline font-bold hover:text-red-900"
                  >
                    retry
                  </button>
                </div>
              ) : loading && batches.length === 0 ? (
                <p className="text-xs text-[#808080] p-2 flex items-center gap-2">
                  <svg
                    className="w-3.5 h-3.5 animate-spin stroke-current"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  assembling your dashboard threads...
                </p>
              ) : batches.length === 0 ? (
                <p className="text-xs text-[#808080] p-2">
                  you haven&apos;t dropped any files from this browser yet! (・w・)
                </p>
              ) : (
                <div className="space-y-3">
                  {batches.map((batch) => (
                    <BatchCard
                      key={batch.id}
                      batch={batch}
                      isOwner={true}
                      onDeleteComplete={fetchMyLiveThreads}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* 📊 Windows 95 Taskbar Status Strip (づOwO)づ */}
        <footer className="border-t border-white shadow-[inset_0_1px_0_#808080] p-1 flex gap-2 bg-[#c0c0c0] text-[10px]">
          <div className="flex-2 border border-t-[#808080] border-l-[#808080] border-r-[#ffffff] border-b-[#ffffff] px-2 py-0.5 text-[#404040]">
            {batches.length} object(s) active
          </div>
          <div className="flex-1 border border-t-[#808080] border-l-[#808080] border-r-[#ffffff] border-b-[#ffffff] px-2 py-0.5 text-[#404040]">
            {error ? "Error" : loading ? "Syncing DB..." : "Ready"}
          </div>
          <div className="flex-1 border border-t-[#808080] border-l-[#808080] border-r-[#ffffff] border-b-[#ffffff] px-2 py-0.5 text-[#404040] text-right font-bold">
            {sysTime || "12:00 PM"}
          </div>
        </footer>

      </div>
    </main>
  );
}
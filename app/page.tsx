"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  ChangeEvent,
  KeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import UploadForm, { UploadFormRef } from "./components/UploadForm";
import BatchCard from "./components/BatchCard";
import { supabase } from "@/lib/supabase";
import type { Batch } from "@/lib/batches";
import { createPortal } from "react-dom";

const OWNED_SLUGS_KEY = "looming_owned_slugs";
const AUTO_REFRESH_MS = 60_000;

// Only ever allow slugs that could plausibly exist — anything outside this
// shape gets rejected client-side before it ever becomes a route =3
const SLUG_PATTERN = /^[a-z0-9-]{1,64}$/;

// Fixed, non-editable label for the fake Win95 address bar — the real route
// is just /[slug] (or "/" for active), never anything the prefix could hide >w<
const ADDRESS_PREFIX = "C:\\looming_\\";
const DEFAULT_ADDRESS_SLUG = "active";

function readOwnedSlugs(): string[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(OWNED_SLUGS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    console.warn(
      "[WARNING] owned_slugs in localStorage was corrupted, resetting ;w;",
    );
    localStorage.removeItem(OWNED_SLUGS_KEY);
    return [];
  }
}

function writeOwnedSlugs(slugs: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(OWNED_SLUGS_KEY, JSON.stringify(slugs));
}

export default function Home() {
  const router = useRouter();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sysTime, setSysTime] = useState<string>("");
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Address bar state — the input only ever holds the editable part (a slug,
  // or "active"); the "C:\looming_\" prefix is a fixed label rendered
  // separately, same pattern as the shared-thread page =3
  const [addressSlug, setAddressSlug] = useState<string>(DEFAULT_ADDRESS_SLUG);
  const [addressFocused, setAddressFocused] = useState(false);
  const [navChecking, setNavChecking] = useState(false);
  const [navError, setNavError] = useState<string | null>(null);
  const addressInputRef = useRef<HTMLInputElement>(null);

  // Refs x3
  const uploadFormRef = useRef<UploadFormRef | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sanitize on every keystroke — only letters, numbers, and dashes ever land
  // in state, so there's nothing dangerous left to sanitize later >w<
  const handleAddressChange = (e: ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "")
      .slice(0, 64);
    setAddressSlug(cleaned);
    if (navError) setNavError(null);
  };

  useEffect(() => {
    if (isHelpOpen) {
      document.documentElement.style.overflow = "hidden";
    } else {
      document.documentElement.style.overflow = "";
    }
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [isHelpOpen]);

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
      console.error("[ERROR] Error fetching your personal threads:", err);
      setError("couldn't reach the drive — try refreshing (っ×_×)っ");
    } finally {
      setLoading(false);
    }
  }, []);

  // submitAddress needs to call the LATEST fetchMyLiveThreads for the
  // "active" no-op-refresh case, without pulling it into its own dependency
  // array — a ref keeps that safe without reordering declarations uwu~
  const fetchMyLiveThreadsRef = useRef(fetchMyLiveThreads);
  useEffect(() => {
    fetchMyLiveThreadsRef.current = fetchMyLiveThreads;
  }, [fetchMyLiveThreads]);

  // Heavy-security version: we NEVER push a route we haven't confirmed
  // exists. "active" just means "stay here, refresh" since that's what this
  // page already is. Anything else gets verified against Supabase first —
  // if it's not there, we show an inline message and never navigate uwu
  const submitAddress = useCallback(async () => {
    if (navChecking) return;

    setNavError(null);
    const sanitizedSlug = addressSlug;

    if (!sanitizedSlug || sanitizedSlug === DEFAULT_ADDRESS_SLUG) {
      setAddressSlug(DEFAULT_ADDRESS_SLUG);
      fetchMyLiveThreadsRef.current?.();
      return;
    }

    if (!SLUG_PATTERN.test(sanitizedSlug)) {
      setNavError("invalid path — check the address and try again");
      return;
    }

    try {
      setNavChecking(true);
      const now = new Date().toISOString();
      const { data, error: checkError } = await supabase
        .from("batches")
        .select("id")
        .eq("slug", sanitizedSlug)
        .gt("expires_at", now)
        .maybeSingle();

      if (checkError) {
        console.error("Address bar existence check failed:", checkError);
        setNavError("couldn't verify that path — try again");
        return;
      }

      if (!data) {
        setNavError("no thread found at that path");
        return;
      }

      router.push(`/${sanitizedSlug}`);
    } finally {
      setNavChecking(false);
    }
  }, [addressSlug, navChecking, router]);

  // enterKeyHint="go" swaps the mobile keyboard's return key to say "Go"
  // instead of a newline glyph — still fires a normal Enter keydown, so this
  // covers both desktop and mobile.
  const handleAddressKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submitAddress();
    }
  };

  useEffect(() => {
    fetchMyLiveThreads();

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

  // File menu click handler >w< — opens the hidden picker, same as the
  // dropzone's own picker, so "File" in the menu bar actually does something
  const handleFileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  // Was previously an empty no-op — files picked via the menu bar's hidden
  // input never reached the upload form. Now routed through the same
  // addFiles() the dropzone uses UwU
  const handleMenuFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFormRef.current?.addFiles(e.target.files);
    }
    // reset so picking the same file twice in a row still fires onChange
    e.target.value = "";
  };

  return (
    <>
      {/* Stricter main wrapper with fixed h-dvh and hidden overflow so it never stretches! ^w^ */}
      <main className="fixed inset-0 h-screen w-screen overflow-hidden bg-[#008080] font-serif text-black p-4 sm:p-8 flex items-center justify-center">
        {/* Hidden File Input for Menu Trigger =3 */}
        <input
          type="file"
          multiple
          ref={fileInputRef}
          className="hidden"
          onChange={handleMenuFileChange}
        />

        {/* Outer Windows 95 Explorer Window Container OwO */}
        <div className="w-full max-w-4xl h-full max-h-[90vh] bg-[#c0c0c0] border-2 border-t-[#ffffff] border-l-[#ffffff] border-r-[#404040] border-b-[#404040] shadow-[3px_3px_0px_#000000] p-[2px] flex flex-col font-mono text-xs overflow-hidden">
          {/* Title Bar >w< */}
          <div className="bg-gradient-to-r from-[#000080] to-[#1084d0] px-2 py-1 flex items-center justify-between text-white font-bold select-none shrink-0">
            <span className="flex items-center gap-1.5 truncate">
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
              Exploring - C:\looming_\active
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
              <button
                type="button"
                aria-hidden="true"
                tabIndex={-1}
                className="w-4 h-3.5 bg-[#c0c0c0] border border-t-[#ffffff] border-l-[#ffffff] border-r-[#404040] border-b-[#404040] text-black text-[11px] flex items-center justify-center font-bold leading-none active:border-t-[#404040] active:border-l-[#404040] active:border-r-[#ffffff] active:border-b-[#ffffff] active:pt-0.5 active:pl-0.5"
              >
                &#215;
              </button>
            </div>
          </div>

          {/* Menu Bar :-3 */}
          <div className="flex gap-4 px-2 py-1 border-b border-[#808080] bg-[#c0c0c0] text-black select-none overflow-x-auto no-scrollbar shrink-0">
            <span
              onClick={handleFileClick}
              style={{ touchAction: "manipulation" }}
              className="cursor-pointer hover:bg-[#000080] hover:text-white px-1 py-0.5 whitespace-nowrap active:translate-y-0.5"
            >
              <u className="no-underline underline">F</u>ile
            </span>
            <span className="cursor-default text-[#808080] px-1 py-0.5 whitespace-nowrap">
              <u className="no-underline underline">E</u>dit
            </span>
            <span className="cursor-default text-[#808080] px-1 py-0.5 whitespace-nowrap">
              <u className="no-underline underline">V</u>iew
            </span>
            <span className="cursor-default text-[#808080] px-1 py-0.5 whitespace-nowrap">
              <u className="no-underline underline">T</u>ools
            </span>
            <span
              onClick={(e) => {
                e.stopPropagation();
                setIsHelpOpen(true);
              }}
              style={{ touchAction: "manipulation" }}
              className="cursor-pointer hover:bg-[#000080] hover:text-white px-1 py-0.5 whitespace-nowrap active:translate-y-0.5"
            >
              <u className="no-underline underline">H</u>elp
            </span>
          </div>

          {/* Toolbar & Address Box x3 */}
          <div className="flex flex-wrap items-center gap-2 p-1.5 border-b border-white shadow-[0_1px_0_#808080] bg-[#c0c0c0] shrink-0">
            <span className="text-[#404040] font-bold select-none">
              Address:
            </span>
            <div className="flex-1 flex items-start gap-1.5 min-w-[140px]">
              <div className="flex-1 flex flex-col min-w-0">
                <div className="bg-white border-2 border-t-[#808080] border-l-[#808080] border-r-[#ffffff] border-b-[#ffffff] px-2 py-1.5 sm:py-0.5 flex items-center gap-1.5 min-w-0">
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
                  <span className="flex items-center min-w-0 flex-1">
                    <span
                      onClick={() => addressInputRef.current?.focus()}
                      className={`font-bold text-[#000080] select-none whitespace-nowrap cursor-text ${
                        addressFocused ? "hidden sm:inline" : "inline"
                      }`}
                    >
                      {ADDRESS_PREFIX}
                    </span>
                    <input
                      ref={addressInputRef}
                      id="win95-address"
                      type="text"
                      inputMode="text"
                      enterKeyHint="go"
                      value={addressSlug}
                      onChange={handleAddressChange}
                      onKeyDown={handleAddressKeyDown}
                      onFocus={() => setAddressFocused(true)}
                      onBlur={() => setAddressFocused(false)}
                      disabled={navChecking}
                      spellCheck={false}
                      autoCapitalize="off"
                      autoCorrect="off"
                      autoComplete="off"
                      style={{ touchAction: "manipulation" }}
                      className="w-full font-bold text-[#000080] bg-transparent outline-none p-0 m-0 border-none h-auto font-mono text-xs disabled:opacity-60"
                    />
                  </span>
                  {navChecking && (
                    <svg
                      className="w-3 h-3 shrink-0 animate-spin stroke-current text-[#000080]"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                  )}
                </div>
                {navError && (
                  <span
                    className="text-[#800000] font-bold mt-0.5 px-1"
                    role="alert"
                    aria-live="polite"
                  >
                    {navError}
                  </span>
                )}
              </div>
              {/* Go button — mobile only, same reasoning as the shared-thread
                page: a real Enter key exists on desktop, mobile needs a
                visible tap target uwu~ */}
              <button
                type="button"
                onClick={submitAddress}
                disabled={navChecking || !addressSlug}
                style={{ touchAction: "manipulation" }}
                className="sm:hidden shrink-0 px-3 py-1.5 border-2 border-t-[#ffffff] border-l-[#ffffff] border-r-[#808080] border-b-[#808080] active:border-t-[#808080] active:border-l-[#808080] active:border-r-[#ffffff] active:border-b-[#ffffff] bg-[#c0c0c0] text-black font-bold disabled:opacity-40"
              >
                Go
              </button>
            </div>
          </div>

          {/* Main Workspace Split View — using flex-1 min-h-0 to contain scrolling! ^w^ */}
          <div className="flex flex-col md:flex-row gap-2 p-1.5 flex-1 min-h-0 overflow-hidden">
            {/* Left Sidebar Tree >:-3 */}
            <aside className="w-full md:w-56 bg-white border-2 border-t-[#808080] border-l-[#808080] border-r-[#ffffff] border-b-[#ffffff] p-2 space-y-1 select-none overflow-y-auto shrink-0 md:h-full">
              <div className="text-black flex items-center gap-1">
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
                  <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 1-1.79 1.11z" />
                  <line x1="6" x2="6.01" y1="16" y2="16" />
                  <line x1="10" x2="10.01" y1="16" y2="16" />
                </svg>
                (C:) Hard Drive
              </div>
              <div className="text-black pl-5 flex items-center gap-1">
                └
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
                active ({batches.length})
              </div>
              <div className="text-black pl-8 flex items-center gap-1">
                └
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

            {/* Main Content Area UwUwU */}
            <section className="flex-1 flex flex-col gap-2 min-h-0 overflow-hidden">
              {/* Upload Area Component Box shrink-0 to preserve upload height */}
              <div className="bg-white border-2 border-t-[#808080] border-l-[#808080] border-r-[#ffffff] border-b-[#ffffff] p-3 shrink-0">
                <h2 className="text-[11px] font-bold text-[#000080] mb-2 uppercase tracking-wider flex items-center gap-1.5">
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
                <UploadForm
                  ref={uploadFormRef}
                  onUploadComplete={handleUploadSuccess}
                />
              </div>

              {/* Live Threads View handles its own overflow now =3 */}
              <div className="flex-1 bg-white border-2 border-t-[#808080] border-l-[#808080] border-r-[#ffffff] border-b-[#ffffff] p-3 overflow-y-auto space-y-3">
                <div className="flex items-center justify-between border-b-2 border-dotted border-[#808080] pb-1">
                  <span className="font-bold text-[#000080]">
                    CONTENTS OF C:\LOOMING_\ACTIVE
                  </span>
                  <span
                    className="text-[10px] text-[#000080] font-bold flex items-center gap-1"
                    aria-live="polite"
                  >
                    {loading ? (
                      <>
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
                  <div
                    className="text-xs text-red-700 bg-red-50 border border-red-300 p-2 flex items-center justify-between gap-2"
                    role="alert"
                    aria-live="polite"
                  >
                    <span>{error}</span>
                    <button
                      onClick={fetchMyLiveThreads}
                      style={{ touchAction: "manipulation" }}
                      className="underline font-bold hover:text-red-900 py-1"
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
                    you haven&apos;t dropped any files from this browser yet!
                    (・w・)
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

          {/* Windows 95 Taskbar Status Strip (づOwO)づ */}
          <footer className="border-t border-white shadow-[inset_0_1px_0_#808080] p-1 flex flex-col sm:flex-row gap-2 bg-[#c0c0c0] text-[10px] shrink-0">
            {/* was "flex-2" — not a real Tailwind utility by default, so this
              segment never actually got its intended 2x share of the row.
              flex-[2] is the arbitrary-value equivalent that actually works */}
            <div className="flex-[2] border border-t-[#808080] border-l-[#808080] border-r-[#ffffff] border-b-[#ffffff] px-2 py-0.5 text-[#404040]">
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
      {mounted &&
        isHelpOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-black/30 p-3 sm:p-4"
            role="presentation"
            onMouseDown={() => setIsHelpOpen(false)}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="help-modal-title"
              className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-md flex-col overflow-hidden bg-[#c0c0c0] border-2 border-t-[#ffffff] border-l-[#ffffff] border-r-[#404040] border-b-[#404040] shadow-[3px_3px_0px_#000000] p-[2px] font-mono text-xs"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="flex min-h-7 shrink-0 items-center justify-between gap-2 bg-gradient-to-r from-[#000080] to-[#1084d0] px-2 py-1 text-white font-bold select-none">
                <span
                  id="help-modal-title"
                  className="flex min-w-0 items-center gap-1.5"
                >
                  <svg
                    className="h-3.5 w-3.5 shrink-0 stroke-current text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <line x1="12" x2="12.01" y1="17" y2="17" />
                  </svg>

                  <span className="truncate">Help - How to use looming_</span>
                </span>

                <button
                  type="button"
                  aria-label="Close help"
                  onClick={() => setIsHelpOpen(false)}
                  style={{ touchAction: "manipulation" }}
                  className="flex h-4 w-5 shrink-0 items-center justify-center bg-[#c0c0c0] border border-t-[#ffffff] border-l-[#ffffff] border-r-[#404040] border-b-[#404040] text-[11px] font-bold leading-none text-black active:border-t-[#404040] active:border-l-[#404040] active:border-r-[#ffffff] active:border-b-[#ffffff] active:pt-0.5 active:pl-0.5 sm:h-3.5 sm:w-4"
                >
                  &#215;
                </button>
              </div>

              <div className="min-h-0 overflow-y-auto overscroll-contain bg-[#c0c0c0] p-3 sm:p-4">
                <div className="bg-white border-2 border-t-[#808080] border-l-[#808080] border-r-[#ffffff] border-b-[#ffffff] p-3 text-black leading-relaxed">
                  <p className="mb-2 font-bold text-[#000080]">
                    Welcome to looming_ File Transfer! (✿◠w◠)
                  </p>

                  <ul className="list-disc space-y-1.5 pl-4 text-[11px]">
                    <li>
                      <b>Upload Files:</b> Use the dropzone or click <u>F</u>ile
                      on the menu bar to stage files (up to 50MB per file) x3!
                    </li>

                    <li>
                      <b>Custom Slugs:</b> Choose your own custom drop slug (min
                      5 alphanumeric/dash characters) or leave it blank to
                      generate a random one =3.
                    </li>

                    <li>
                      <b>Ephemeral Storage:</b> Set thread expiration between 1
                      to 5 days before files auto-delete UwU~.
                    </li>

                    <li>
                      <b>Browser Context:</b> Active threads you create are
                      tracked locally in your browser memory so you can manage
                      them {">w<"}!
                    </li>
                  </ul>
                </div>

                <div className="flex justify-end pt-3">
                  <button
                    type="button"
                    onClick={() => setIsHelpOpen(false)}
                    style={{ touchAction: "manipulation" }}
                    className="min-w-16 px-4 py-1.5 bg-[#c0c0c0] border-2 border-t-[#ffffff] border-l-[#ffffff] border-r-[#404040] border-b-[#404040] text-black font-bold text-xs active:border-t-[#404040] active:border-l-[#404040] active:border-r-[#ffffff] active:border-b-[#ffffff]"
                  >
                    OK
                  </button>
                </div>
              </div>
            </section>
          </div>,
          document.body,
        )}
    </>
  );
}

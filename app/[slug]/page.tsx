"use client";

import {
  useState,
  useEffect,
  useRef,
  use,
  KeyboardEvent,
  ChangeEvent,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Batch } from "@/lib/batches";
import BatchCard from "@/app/components/BatchCard";

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Reusable Win95 borders — matches page.tsx / UploadForm.tsx / BatchCard.tsx tokens
const inset =
  "border-2 border-t-[#808080] border-l-[#808080] border-r-[#ffffff] border-b-[#ffffff]";
const raised =
  "border-2 border-t-[#ffffff] border-l-[#ffffff] border-r-[#808080] border-b-[#808080] active:border-t-[#808080] active:border-l-[#808080] active:border-r-[#ffffff] active:border-b-[#ffffff]";

// Only ever allow slugs that could plausibly exist — anything outside this
// shape gets rejected client-side before it ever becomes a route =3
const SLUG_PATTERN = /^[a-z0-9-]{1,64}$/;

// The "C:\looming_\shared\" prefix is purely cosmetic flavor text for the fake
// Win95 explorer bar — the REAL route is just /[slug], no "shared" segment.
// It's a fixed, non-editable label, not part of the input value at all >w<
const ADDRESS_PREFIX = "C:\\looming_\\shared\\";

export default function SharedSlugPage({ params }: PageProps) {
  // Unwrap the dynamic route params using React.use() uwu~
  const { slug } = use(params);
  const router = useRouter();

  const [batch, setBatch] = useState<Batch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // The input only ever holds the slug part — the prefix above it is a fixed
  // label, so there's no prefix-stripping to do and no way to escape the
  // namespace from this box at all ^w^
  const [addressSlug, setAddressSlug] = useState(slug ?? "");

  // Feedback for the address bar itself, separate from the page-level fetch error qwq
  const [navChecking, setNavChecking] = useState(false);
  const [navError, setNavError] = useState<string | null>(null);

  // Keep the editable part in sync when slug changes =3
  // Keep the editable part in sync when slug changes =3
  useEffect(() => {
    if (slug) {
      setAddressSlug(slug);
      setNavError(null);
    }
  }, [slug]);

  // Hide the fixed prefix while typing so the slug input isn't squeezed into
  // a sliver on narrow screens — and let tapping/clicking the prefix itself
  // focus the input, since it's meant to read as one continuous address =3
  const [addressFocused, setAddressFocused] = useState(false);
  const addressInputRef = useRef<HTMLInputElement>(null);

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

  // Heavy-security version: we NEVER push a route we haven't confirmed exists.
  // The prefix is fixed, so the only thing we're ever navigating to is
  // /<slug> — and only once Supabase confirms that slug is real uwu
  // Shared by both the Enter key and the mobile "Go" button, so behavior is
  // identical no matter how it's triggered.
  const submitAddress = async () => {
    if (navChecking) return;

    setNavError(null);
    const sanitizedSlug = addressSlug;

    if (!sanitizedSlug) {
      setNavError("enter a thread id");
      return;
    }

    // Belt-and-suspenders — onChange already filters every keystroke, this
    // just guards against anything that slips in some other way =33
    if (!SLUG_PATTERN.test(sanitizedSlug)) {
      setNavError("invalid path — check the address and try again");
      return;
    }

    // Verify the batch actually exists (and hasn't expired) BEFORE navigating.
    // This is what actually kills the 404 case: if it's not there, we never push.
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
  };

  // enterKeyHint="go" on the input swaps the mobile keyboard's return key to
  // say "Go" instead of showing a newline glyph — this still fires a normal
  // Enter keydown, so this handler covers both desktop and mobile keyboards.
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submitAddress();
    }
  };

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
          .maybeSingle(); // was .single() — that throws on 0 rows AND masks real errors as "not found" OwO~

        if (ignore) return; // slug changed or component unmounted mid-flight — drop this response

        if (dbError) {
          // Log the real error instead of silently relabeling everything as
          // "not found" — network/permission/schema errors were previously
          // indistinguishable from an expired/missing thread qwq
          console.error("Failed to fetch shared thread:", dbError);
          throw new Error(
            "Something went wrong loading this thread. Please try again in a moment.",
          );
        }

        if (!data) {
          // Genuinely missing or expired — this is the one case that gets the
          // "loomed and dissolved" message
          throw new Error(
            "This thread could not be found, or it may have fully loomed and dissolved.",
          );
        }

        setBatch(data as unknown as Batch);
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
    // min-h-dvh instead of min-h-screen — 100vh includes mobile browser chrome
    // (address bar, keyboard) and causes jumpy layout on phones; dvh tracks the
    // actual visible viewport uwu~
    <main className="min-h-dvh bg-[#008080] font-serif text-black p-4 sm:p-8 flex items-center justify-center">
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
        <div className="flex flex-wrap items-center gap-2 p-1.5 border-b border-white shadow-[0_1px_0_#808080] bg-[#c0c0c0]">
          <a
            href="/"
            style={{ touchAction: "manipulation" }}
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
          <div className="flex-1 flex items-start gap-1.5 min-w-[140px]">
            <div className="flex-1 flex flex-col min-w-0">
              <div
                className={`bg-white ${inset} px-2 py-1.5 sm:py-0.5 flex items-center gap-1.5 min-w-0`}
              >
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
                    type="text"
                    inputMode="text"
                    enterKeyHint="go"
                    value={addressSlug}
                    onChange={handleAddressChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setAddressFocused(true)}
                    onBlur={() => setAddressFocused(false)}
                    disabled={navChecking}
                    spellCheck={false}
                    autoCapitalize="off"
                    autoCorrect="off"
                    style={{ touchAction: "manipulation" }}
                    className="font-bold text-[#000080] bg-transparent outline-none w-full border-none p-0 disabled:opacity-60"
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
            {/* Go button — mobile only. Desktop users have a real Enter key,
                mobile users get a visible tap target since enterKeyHint="go"
                isn't discoverable/consistent enough to rely on alone uwu~ */}
            <button
              type="button"
              onClick={submitAddress}
              disabled={navChecking || !addressSlug}
              style={{ touchAction: "manipulation" }}
              className={`sm:hidden shrink-0 px-3 py-1.5 ${raised} bg-[#c0c0c0] text-black font-bold disabled:opacity-40`}
            >
              Go
            </button>
          </div>
        </div>

        {/* 🖥️ Content Area */}
        <div className="p-3 min-h-[300px] flex flex-col gap-3">
          <div className="flex items-center justify-between border-b-2 border-dotted border-[#808080] pb-1">
            <span className="font-bold text-[#000080]">
              INCOMING THREAD TRANSMISSION
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
                  retrieving...
                </>
              ) : error ? (
                <>
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
                <svg
                  className="w-4 h-4 stroke-current"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 1 1.73-3Z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                link status: severed
              </p>
              <p className="text-[#404040]">{error}</p>
              <a
                href="/"
                style={{ touchAction: "manipulation" }}
                className={`inline-flex items-center gap-1.5 mt-2 px-4 py-1.5 sm:py-1 ${raised} bg-[#c0c0c0] text-black font-bold`}
              >
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
        <footer className="border-t border-white shadow-[inset_0_1px_0_#808080] p-1 flex flex-col sm:flex-row gap-2 bg-[#c0c0c0] text-[10px]">
          <div className="flex-1 border border-t-[#808080] border-l-[#808080] border-r-[#ffffff] border-b-[#ffffff] px-2 py-0.5 text-[#404040]">
            {batch
              ? "1 object(s) found"
              : loading
                ? "Syncing DB..."
                : "0 object(s) found"}
          </div>
          <div className="flex-1 border border-t-[#808080] border-l-[#808080] border-r-[#ffffff] border-b-[#ffffff] px-2 py-0.5 text-[#404040] text-right font-bold">
            shared terminal view
          </div>
        </footer>
      </div>
    </main>
  );
}

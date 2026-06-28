"use client";

import { useState, useEffect, use } from "react";
import { supabase } from "@/lib/supabase";
import type { Batch } from "@/lib/batches";
import BatchCard from "../components/BatchCard"; // Adjust paths based on your folder layout!

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function SharedSlugPage({ params }: PageProps) {
  // Unwrap the dynamic route params using React.use() uwu~
  const { slug } = use(params);

  const [batch, setBatch] = useState<Batch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSharedThread() {
      try {
        const now = new Date().toISOString();

        // Fetch this specific tokenized thread, making sure it hasn't expired!
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

        if (data) {
          setBatch(data as unknown as Batch);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unknown error occurred.",
        );
      } finally {
        setLoading(false);
      }
    }

    if (slug) {
      fetchSharedThread();
    }
  }, [slug]);

  return (
    <main className="min-h-screen bg-[#14151A] text-[#EDEAE3] p-6 sm:p-12">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Cozy Navigation Back Header */}
        <header className="flex items-center justify-between border-b border-[#2A2C35] pb-4">
          <a
            href="/"
            className="text-sm font-mono text-[#8A8D98] hover:text-[#6C7BFF] transition-colors"
          >
            ← back to looming_
          </a>
          {/* 📱 Hidden on mobile screens, pops up seamlessly on desktop! uwu~ */}
          <span className="hidden sm:inline text-xs font-mono text-[#8A8D98]">
            shared terminal view
          </span>
        </header>

        {/* Dynamic Display Board */}
        {loading ? (
          <p className="text-sm font-mono text-[#8A8D98]">
            retrieving shared drop files...
          </p>
        ) : error ? (
          <div className="bg-[#1B1C22] p-6 rounded-xl border border-[#FF9F4A]/30 text-center space-y-3">
            <p className="text-sm font-mono text-[#FF9F4A]">
              ✦ link status: severed ✦
            </p>
            <p className="text-xs text-[#8A8D98]">{error}</p>
          </div>
        ) : batch ? (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between px-1 gap-1.5 sm:gap-0">
              <div className="text-xs font-mono uppercase text-[#8A8D98]">
                ✦ incoming thread transmission
              </div>
              {/* 📱 Mobile status tag moves down here beneath the label context! >w< */}
              <span className="text-[10px] sm:hidden font-mono text-[#6C7BFF] self-start">
                ● shared terminal active
              </span>
            </div>

            {/* Your beautiful edge-to-edge adaptive component! =3 */}
            <BatchCard batch={batch} />
          </div>
        ) : null}
      </div>
    </main>
  );
}

"use client";

import { useState, useEffect } from "react";
import UploadForm from "./components/UploadForm";
import BatchCard from "./components/BatchCard";
import { supabase } from "@/lib/supabase";
import type { Batch } from "@/lib/batches";

export default function Home() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);

  // 📡 Fetch only the threads that belong to THIS browser! uwu~
  async function fetchMyLiveThreads() {
    setLoading(true);
    try {
      // 1. Grab our list of owned slugs from localStorage
      const savedSlugsJson = localStorage.getItem("looming_owned_slugs");
      const mySlugs: string[] = savedSlugsJson
        ? JSON.parse(savedSlugsJson)
        : [];

      // If the user hasn't uploaded anything yet, don't even waste a database network hit!
      if (mySlugs.length === 0) {
        setBatches([]);
        setLoading(false);
        return;
      }

      const now = new Date().toISOString();

      // 2. Query Supabase, filtering ONLY for slugs matching this person's local history array! >w<
      const { data, error } = await supabase
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
        .in("slug", mySlugs) // 🔒 The magic filter clause!
        .order("expires_at", { ascending: true });

      if (error) throw error;
      if (data) setBatches(data as unknown as Batch[]);
    } catch (err) {
      console.error("❌ Error fetching your personal threads:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMyLiveThreads();
  }, []);

  // 📝 3. When an upload finishes, track the new slug inside localStorage before refreshing!
  function handleUploadSuccess(newSlug: string) {
    const savedSlugsJson = localStorage.getItem("looming_owned_slugs");
    const currentSlugs: string[] = savedSlugsJson
      ? JSON.parse(savedSlugsJson)
      : [];

    // Add the fresh slug and commit back to storage cache
    const updatedSlugs = [...currentSlugs, newSlug];
    localStorage.setItem("looming_owned_slugs", JSON.stringify(updatedSlugs));

    // Pull down the updated listing
    fetchMyLiveThreads();
  }

  return (
    <main className="min-h-screen bg-[#14151A] text-[#EDEAE3] p-6 sm:p-12">
      <div className="max-w-3xl mx-auto space-y-12">
        <header className="border-b border-[#2A2C35] pb-6">
          <h1 className="text-3xl font-mono tracking-tight font-bold text-[#6C7BFF]">
            looming_
          </h1>
          <p className="text-sm text-[#8A8D98] mt-2">
            your cozy, transient personal dashboard. your friends can access
            your threads via their direct URLs! ^w^
          </p>
        </header>

        <section className="space-y-4">
          <h2 className="text-xs font-mono tracking-wider uppercase text-[#8A8D98]">
            ✦ drop a new thread
          </h2>
          <div className="bg-[#1B1C22] p-6 rounded-xl border border-[#2A2C35]">
            <UploadForm onUploadComplete={handleUploadSuccess} />
          </div>
        </section>

        <section className="space-y-6">
          {/* 📱 Swapped flex to flex-col on mobile, sm:flex-row on desktop! uwu~ */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#2A2C35] pb-2 gap-1.5 sm:gap-0">
            <h2 className="text-xs font-mono tracking-wider uppercase text-[#8A8D98]">
              ✦ your active drops ({batches.length})
            </h2>

            {/* 📱 On mobile, this will sit nicely right below the title instead of getting crushed on the right edge! >w< */}
            <span className="text-[10px] sm:text-xs font-mono text-[#6C7BFF] self-start sm:self-auto">
              {loading ? "⏳ syncing..." : "● local context active"}
            </span>
          </div>

          {loading && batches.length === 0 ? (
            <p className="text-sm font-mono text-[#8A8D98]">
              assembling your dashboard threads...
            </p>
          ) : batches.length === 0 ? (
            <p className="text-sm font-mono text-[#8A8D98]">
              you haven't dropped any files from this browser yet! (・w・)
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {batches.map((batch) => (
                <BatchCard
                  key={batch.id}
                  batch={batch}
                  isOwner={true} // 🔒 Explicitly flag true because these are our local storage keys! uwu~
                  onDeleteComplete={fetchMyLiveThreads} // Trigger refresh on drop completion!
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

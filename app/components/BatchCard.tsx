"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { Batch } from "@/lib/batches";
import { getPublicUrl } from "@/lib/batches";
import {
  isImage,
  getFileGlyph,
  formatBytes,
  getTimeLeft,
} from "@/lib/fileDisplay";
import { downloadBatchAsZip } from "@/lib/zipDownload";

interface BatchCardProps {
  batch: Batch;
  isOwner?: boolean;
  onDeleteComplete?: () => void;
}

export default function BatchCard({
  batch,
  isOwner = false,
  onDeleteComplete,
}: BatchCardProps) {
  const [copied, setCopied] = useState(false);
  const [zipping, setZipping] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [timeLeft, setTimeLeftState] = useState({
    label: "loading...",
    urgency: 0,
  });

  useEffect(() => {
    setTimeLeftState(getTimeLeft(batch.expires_at));
  }, [batch.expires_at]);

  const { label, urgency } = timeLeft;
  const threadOpacity = 1 - urgency * 0.75;

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/${batch.slug}`
      : `/${batch.slug}`;

  async function handleCopyLink() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  async function handleZipDownload() {
    setZipping(true);
    try {
      await downloadBatchAsZip(batch.slug, batch.files);
    } finally {
      setZipping(false);
    }
  }

  async function handleDeleteThread() {
    if (
      !confirm("Are you sure you want to sever this thread permanently? (´W`);")
    )
      return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("batches")
        .delete()
        .eq("slug", batch.slug);
      if (error) throw error;

      const savedSlugsJson = localStorage.getItem("looming_owned_slugs");
      if (savedSlugsJson) {
        const currentSlugs: string[] = JSON.parse(savedSlugsJson);
        localStorage.setItem(
          "looming_owned_slugs",
          JSON.stringify(currentSlugs.filter((s) => s !== batch.slug)),
        );
      }
      if (onDeleteComplete) onDeleteComplete();
    } catch (err) {
      alert("Failed to delete thread safely.");
      console.error(err);
    } finally {
      setDeleting(false);
    }
  }

  return (
    /* 💻 Keep the main outer card spanning full width on ALL screens! uwu~ */
    <div className="relative pl-4 sm:pl-5 rounded-lg bg-[#1B1C22] border border-[#2A2C35] overflow-hidden w-full">
      {/* The fading thread */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-full"
        style={{
          background: urgency > 0.7 ? "#FF9F4A" : "#6C7BFF",
          opacity: threadOpacity,
          transition: "opacity 0.6s ease, background 0.6s ease",
        }}
      />

      <div className="p-4 sm:p-5">
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
            <span className="font-mono text-sm text-[#EDEAE3]">
              /{batch.slug}
            </span>
            <span
              className="font-mono text-[10px] sm:text-xs px-2 py-0.5 rounded-full whitespace-nowrap"
              style={{
                color: urgency > 0.7 ? "#FF9F4A" : "#8A8D98",
                border: `1px solid ${urgency > 0.7 ? "#FF9F4A" : "#2A2C35"}`,
              }}
            >
              {label}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-start sm:justify-end overflow-x-auto no-scrollbar">
            {isOwner && (
              <button
                onClick={handleDeleteThread}
                disabled={deleting}
                className="text-xs font-mono px-2.5 py-1.5 rounded-md bg-[#23242C] text-[#FF9F4A] border border-[#FF9F4A]/20 active:bg-[#2A2C35] transition-colors disabled:opacity-40 whitespace-nowrap"
              >
                {deleting ? "shredding…" : "delete"}
              </button>
            )}
            <button
              onClick={handleCopyLink}
              className="text-xs font-mono px-2.5 py-1.5 rounded-md bg-[#23242C] text-[#EDEAE3] active:bg-[#2A2C35] transition-colors whitespace-nowrap"
            >
              {copied ? "copied" : "copy link"}
            </button>
            {batch.files.length > 1 && (
              <button
                onClick={handleZipDownload}
                disabled={zipping}
                className="text-xs font-mono px-2.5 py-1.5 rounded-md bg-[#6C7BFF] text-[#14151A] active:opacity-80 disabled:opacity-50 transition-opacity whitespace-nowrap"
              >
                {zipping ? "zipping…" : "download all (.zip)"}
              </button>
            )}
          </div>
        </div>

        {/* 💻 THE LAYOUT MATRIX: Stacks vertically on mobile, switches to strict grids on desktop! =3 */}
        <div className="flex flex-col gap-4 sm:grid sm:grid-cols-2 md:grid-cols-3 justify-start items-stretch">
          {batch.files.map((file) => (
            <FileTile key={file.id} file={file} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// UNIFIED RESPONSIVE SUB-COMPONENT
// ==========================================
function FileTile({ file }: { file: Batch["files"][number] }) {
  const url = getPublicUrl(file.storage_path);
  const showImage = isImage(file.mime_type);

  async function handleDownload(e: React.MouseEvent) {
    e.preventDefault();
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = file.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Download failed:", err);
      window.open(url, "_blank");
    }
  }

  return (
    /* ⚡ THE FIXED CLASS: w-full pushes it edge-to-edge on mobile, sm:w-auto fits the desktop grid slots! >w< */
    <div className="w-full sm:w-auto flex flex-col gap-2 p-3 rounded-md bg-[#14151A] border border-[#2A2C35] justify-between transition-transform duration-200">
      <div>
        {/* 📷 The Preview Frame: aspect-square and w-full makes sure the image scales seamlessly to match the full tile width on mobile screens! */}
        <div className="aspect-square w-full rounded-md bg-[#1B1C22] flex items-center justify-center overflow-hidden mb-2 select-none">
          {showImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt={file.filename}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-3xl text-[#6C7BFF]">
              {getFileGlyph(file.mime_type, file.filename)}
            </span>
          )}
        </div>

        <div className="min-w-0 px-0.5">
          <p
            className="text-xs text-[#EDEAE3] font-medium break-all line-clamp-1"
            title={file.filename}
          >
            {file.filename}
          </p>
          <p className="text-[10px] font-mono text-[#8A8D98] mt-0.5">
            {formatBytes(file.size)}
          </p>
        </div>
      </div>

      <button
        onClick={handleDownload}
        className="w-full text-xs font-mono text-center py-2 rounded-md bg-[#23242C] text-[#EDEAE3] active:bg-[#2A2C35] active:text-[#6C7BFF] transition-colors mt-1"
      >
        download
      </button>
    </div>
  );
}

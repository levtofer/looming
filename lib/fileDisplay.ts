// lib/fileDisplay.ts

import {
  Image as ImageIcon,
  FileText,
  Archive,
  Music,
  Film,
  Paperclip,
  type LucideIcon,
} from "lucide-react";

export function isImage(mimeType?: string): boolean {
  if (!mimeType) return false;
  return mimeType.startsWith("image/");
}

export function getFileGlyph(mimeType: string | undefined, filename: string): LucideIcon {
  const safeMime = mimeType || "";
  const safeName = filename || "";

  if (isImage(safeMime)) return ImageIcon;
  if (safeMime.includes("pdf")) return FileText;
  if (safeMime.includes("zip") || safeMime.includes("rar")) return Archive;
  if (safeMime.includes("audio") || safeMime.includes("mp3")) return Music;
  if (safeMime.includes("video") || safeMime.includes("mp4")) return Film;

  const ext = safeName.split(".").pop()?.toLowerCase();
  if (["zip", "rar", "7z"].includes(ext || "")) return Archive;

  return Paperclip;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function getTimeLeft(expiresAt: string): {
  label: string;
  urgency: number;
} {
  const totalDuration = 24 * 60 * 60 * 1000; // 1 day base window
  const now = new Date().getTime();
  const expiry = new Date(expiresAt).getTime();
  const timeLeft = expiry - now;

  if (timeLeft <= 0) {
    return { label: "expired", urgency: 1 };
  }

  const hoursLeft = Math.max(0, Math.floor(timeLeft / (1000 * 60 * 60)));
  const urgency = Math.min(1, Math.max(0, 1 - timeLeft / totalDuration));

  if (hoursLeft === 0) {
    const minsLeft = Math.floor(timeLeft / (1000 * 60));
    return { label: `${minsLeft}m left`, urgency: 0.95 };
  }

  return { label: `${hoursLeft}h left`, urgency };
}
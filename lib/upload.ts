import { supabase } from "./supabase";
import { resolveSlug } from "./slugs";

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB per file, hard cap
export const SOFT_BATCH_WARNING_BYTES = 200 * 1024 * 1024; // 200MB total, soft warning only

export interface UploadResult {
  slug: string;
  batchId: string;
}

/**
 * Checks per-file size limit. Returns a list of filenames that exceed it,
 * empty array if all good.
 */
export function getOversizedFiles(files: File[]): string[] {
  return files.filter((f) => f.size > MAX_FILE_SIZE_BYTES).map((f) => f.name);
}

/**
 * Returns true if the batch's combined size exceeds the soft warning threshold.
 * Caller decides what to do with this (e.g. show a snackbar, but don't block).
 */
export function exceedsSoftWarning(files: File[]): boolean {
  const total = files.reduce((sum, f) => sum + f.size, 0);
  return total > SOFT_BATCH_WARNING_BYTES;
}

/**
 * Uploads a full batch: resolves slug, creates batch row, uploads each file
 * to storage, inserts file rows. Rolls back (deletes batch + any uploaded
 * storage objects) if anything fails partway through.
 */
export async function uploadBatch(
  files: File[],
  expiryDays: number,
  customSlug: string | null,
): Promise<UploadResult> {
  if (files.length === 0) {
    throw new Error("No files to upload.");
  }

  const oversized = getOversizedFiles(files);
  if (oversized.length > 0) {
    throw new Error(
      `These files exceed the 50MB limit: ${oversized.join(", ")}`,
    );
  }

  // Step 1: resolve slug (throws if custom slug invalid/taken, or pool empty)
  const slug = await resolveSlug(customSlug);

  // Step 2: create the batch row
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiryDays);

  const { data: batch, error: batchError } = await supabase
    .from("batches")
    .insert({ slug, expires_at: expiresAt.toISOString() })
    .select("id, slug")
    .single();

  if (batchError || !batch) {
    throw new Error("Failed to create batch. Try again.");
  }

  // Step 3: upload each file to storage, tracking what succeeded for rollback
  const uploadedPaths: string[] = [];

  try {
    for (const file of files) {
      const storagePath = `${slug}/${crypto.randomUUID()}-${file.name}`;

      // Inside lib/upload.ts -> uploadBatch function
      const { error: uploadError } = await supabase.storage
        .from("looming-files")
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(
          `Failed to upload "${file.name}": ${uploadError.message}`,
        );
      }

      uploadedPaths.push(storagePath);

      // Step 4: insert the file row immediately after each successful upload
      const { error: fileRowError } = await supabase.from("files").insert({
        batch_id: batch.id,
        filename: file.name,
        storage_path: storagePath,
        size: file.size,
        mime_type: file.type || "application/octet-stream",
      });

      if (fileRowError) {
        throw new Error(`Failed to save record for "${file.name}".`);
      }
    }
  } catch (err) {
    // Rollback: remove any storage objects we managed to upload, and the batch row
    // (files rows cascade-delete automatically via the FK).
    if (uploadedPaths.length > 0) {
      await supabase.storage.from("looming-files").remove(uploadedPaths);
    }
    await supabase.from("batches").delete().eq("id", batch.id);

    throw err;
  }

  return { slug: batch.slug, batchId: batch.id };
}

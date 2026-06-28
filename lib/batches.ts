// lib/batches.ts

export interface BatchFile {
  id: string
  filename: string
  storage_path: string
  size: number
  mime_type: string
}

export interface Batch {
  id: string
  slug: string
  expires_at: string
  files: BatchFile[]
}

export function getPublicUrl(storagePath: string): string {
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co'
  return `${projectUrl}/storage/v1/object/public/looming-files/${storagePath}`
}
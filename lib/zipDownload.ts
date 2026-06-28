import JSZip from 'jszip'
import { getPublicUrl } from './batches'
import type { BatchFile } from './batches'

/** Fetches every file in a batch and triggers a single zip download. */
export async function downloadBatchAsZip(slug: string, files: BatchFile[]): Promise<void> {
  const zip = new JSZip()

  const fetches = files.map(async (file) => {
    const url = getPublicUrl(file.storage_path)
    const response = await fetch(url)
    const blob = await response.blob()
    zip.file(file.filename, blob)
  })

  await Promise.all(fetches)

  const zipBlob = await zip.generateAsync({ type: 'blob' })
  const downloadUrl = URL.createObjectURL(zipBlob)

  const link = document.createElement('a')
  link.href = downloadUrl
  link.download = `${slug}.zip`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(downloadUrl)
}
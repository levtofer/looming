// lib/fileDisplay.ts

export function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/')
}

export function getFileGlyph(mimeType: string, filename: string): string {
  if (isImage(mimeType)) return '📷'
  if (mimeType.includes('pdf')) return '📄'
  if (mimeType.includes('zip') || mimeType.includes('rar')) return '📦'
  if (mimeType.includes('audio') || mimeType.includes('mp3')) return '🎵'
  if (mimeType.includes('video') || mimeType.includes('mp4')) return '🎬'

  const ext = filename.split('.').pop()?.toLowerCase()
  if (['zip', 'rar', '7z'].includes(ext || '')) return '📦'

  return '📎'
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export function getTimeLeft(expiresAt: string) {
  const totalDuration = 24 * 60 * 60 * 1000 // 1 day base window
  const now = new Date().getTime()
  const expiry = new Date(expiresAt).getTime()
  const timeLeft = expiry - now

  if (timeLeft <= 0) {
    return { label: 'expired', urgency: 1 }
  }

  const hoursLeft = Math.max(0, Math.floor(timeLeft / (1000 * 60 * 60)))
  const urgency = Math.min(1, Math.max(0, 1 - (timeLeft / totalDuration)))

  if (hoursLeft === 0) {
    const minsLeft = Math.floor(timeLeft / (1000 * 60))
    return { label: `${minsLeft}m left`, urgency: 0.95 }
  }

  return { label: `${hoursLeft}h left`, urgency }
}
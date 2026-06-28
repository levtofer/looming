import { supabase } from './supabase'

/**
 * Validates a custom slug: min 5 letters, only letters/numbers/hyphens,
 * and must not collide with an existing ACTIVE batch.
 * Returns null if valid, or an error message string if not.
 */
export async function validateCustomSlug(slug: string): Promise<string | null> {
  const trimmed = slug.trim().toLowerCase()

  if (trimmed.length < 5) {
    return 'Slug must be at least 5 characters.'
  }

  if (!/^[a-z0-9-]+$/.test(trimmed)) {
    return 'Slug can only contain letters, numbers, and hyphens.'
  }

  // Check collision against active (non-expired) batches only.
  const { data, error } = await supabase
    .from('batches')
    .select('id')
    .eq('slug', trimmed)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (error) {
    console.error('Slug validation query failed:', error)
    return 'Could not validate slug right now, try again.'
  }

  if (data) {
    return 'That slug is already taken. Try another.'
  }

  return null
}

/**
 * Pops one slug from the fallback_slugs pool (delete-on-use).
 * Throws if the pool is empty — you'll want to top it up via the dashboard.
 */
export async function popFallbackSlug(): Promise<string> {
  const { data, error } = await supabase
    .from('fallback_slugs')
    .select('id, slug')
    .limit(1)
    .maybeSingle()

  if (error || !data) {
    throw new Error(
      'No fallback slugs available. Add more rows to fallback_slugs in Supabase.'
    )
  }

  // Delete it so it can't be handed out twice.
  const { error: deleteError } = await supabase
    .from('fallback_slugs')
    .delete()
    .eq('id', data.id)

  if (deleteError) {
    console.error('Failed to delete used fallback slug:', deleteError)
    // Not fatal — worst case the slug could theoretically be reused later,
    // but we still return it so the upload doesn't fail.
  }

  return data.slug
}

/**
 * Resolves the final slug to use for a new batch: either the validated
 * custom slug, or a popped fallback. Throws on validation failure.
 */
export async function resolveSlug(customSlug: string | null): Promise<string> {
  if (customSlug && customSlug.trim().length > 0) {
    const error = await validateCustomSlug(customSlug)
    if (error) throw new Error(error)
    return customSlug.trim().toLowerCase()
  }

  return popFallbackSlug()
}
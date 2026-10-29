/** Converts a camelCase-keyed object (the app's domain shape) into the
 * snake_case shape Postgres/Supabase columns use, so the sync queue can push
 * records straight through without a per-table mapping function. */
export function camelToSnake(input: Record<string, unknown>): Record<string, unknown> {
  const output: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(input)) {
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
    output[snakeKey] = value
  }
  return output
}

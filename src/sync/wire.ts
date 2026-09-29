import { serializeCharacter } from '@/db/transfer'
import type { Character } from '@/db/db'

/** App folder in the backend (Drive folder name; WebDAV default collection). */
export const APP_FOLDER = 'charasheet'
export const INDEX_NAME = 'index.json'

export interface IndexEntry {
  id: string
  /** Backend file token: Drive file id, or WebDAV file name under the collection. */
  fileId: string
  /** SHA-256 (hex) of the character YAML at last push. */
  hash: string
  name: string
  updatedAt: number
  /** Set when the character was deleted by any device. */
  deletedAt?: number
  /** Tombstone came from a cloud opt-out (origin device keeps local copy). */
  optedOut?: boolean
}

export interface DriveIndex {
  entries: Record<string, IndexEntry>
}

/** Stable hash input: exported YAML without ids/timestamps. */
export function characterPayload(character: Character): string {
  return serializeCharacter(character)
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}
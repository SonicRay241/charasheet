import { getValidAccessToken } from './google-auth'
import { serializeCharacter } from '@/db/transfer'
import type { Character } from '@/db/db'

const APP_FOLDER = 'charasheet'
const INDEX_NAME = 'index.json'

export interface IndexEntry {
  id: string
  /** Drive file id of this character's YAML. */
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

async function driveFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getValidAccessToken()
  if (!token) throw new Error('Not connected to Google Drive.')
  const response = await fetch(`https://www.googleapis.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  })
  if (response.status === 401) {
    throw new Error('Google Drive session expired. Reconnect to continue.')
  }
  if (!response.ok) {
    const text = await response.text()
    const error: Error & { status?: number } = new Error(
      `Drive request failed: ${response.status} ${text}`,
    )
    error.status = response.status
    throw error
  }
  return response
}

interface DriveFile {
  id: string
  name: string
}

async function listFiles(folderId: string): Promise<DriveFile[]> {
  const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`)
  const response = await driveFetch(
    `/drive/v3/files?q=${query}&fields=files(id,name)&pageSize=100`,
  )
  const json = (await response.json()) as { files: DriveFile[] }
  return json.files ?? []
}

async function findFileByName(folderId: string, name: string): Promise<string | null> {
  const files = await listFiles(folderId)
  return files.find((file) => file.name === name)?.id ?? null
}

async function ensureFolder(): Promise<string> {
  const query = encodeURIComponent(
    `mimeType = 'application/vnd.google-apps.folder' and name = '${APP_FOLDER}' and trashed = false`,
  )
  const response = await driveFetch('/drive/v3/files?q=' + query + '&fields=files(id)')
  const json = (await response.json()) as { files: { id: string }[] }
  if (json.files?.length) return json.files[0].id

  const created = await driveFetch('/drive/v3/files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: APP_FOLDER, mimeType: 'application/vnd.google-apps.folder' }),
  })
  const folder = (await created.json()) as { id: string }
  return folder.id
}

/** Content-addressed upload: multipart create, or patch when file id is known. */
export async function uploadFile(
  name: string,
  content: string,
  fileId?: string,
): Promise<string> {
  if (fileId) {
    try {
      const metadata = JSON.stringify({ name })
      const blob = new Blob([content], { type: 'application/yaml' })
      const form = new FormData()
      form.append('metadata', new Blob([metadata], { type: 'application/json' }))
      form.append('file', blob)
      const response = await driveFetch(
        `/upload/drive/v3/files/${fileId}?uploadType=multipart`,
        { method: 'PATCH', body: form },
      )
      const json = (await response.json()) as { id: string }
      return json.id
    } catch (error) {
      // The file may have been deleted by another device (opt-out, delete)
      // while this machine still held a stale fileId — fall back to a
      // fresh create rather than failing the whole sync.
      if (isNotFound(error)) {
        // Fall through to create below.
      } else {
        throw error
      }
    }
  }

  const folderId = await ensureFolder()
  const metadata = JSON.stringify({ name, parents: [folderId] })
  const blob = new Blob([content], { type: 'application/yaml' })
  const form = new FormData()
  form.append('metadata', new Blob([metadata], { type: 'application/json' }))
  form.append('file', blob)
  const response = await driveFetch('/upload/drive/v3/files?uploadType=multipart&fields=id', {
    method: 'POST',
    body: form,
  })
  const json = (await response.json()) as { id: string }
  return json.id
}

export async function downloadFile(fileId: string): Promise<string> {
  const response = await driveFetch(`/drive/v3/files/${fileId}?alt=media`)
  return response.text()
}

export async function deleteFile(fileId: string): Promise<void> {
  await driveFetch(`/drive/v3/files/${fileId}`, { method: 'DELETE' })
}

export async function readIndex(): Promise<{ index: DriveIndex; fileId: string | null }> {
  const folderId = await ensureFolder()
  const fileId = await findFileByName(folderId, INDEX_NAME)
  if (!fileId) return { index: { entries: {} }, fileId: null }
  try {
    const raw = await downloadFile(fileId)
    const parsed = JSON.parse(raw) as DriveIndex
    return { index: { entries: parsed.entries ?? {} }, fileId }
  } catch (error) {
    // Corrupt index: start fresh rather than failing forever, but say so —
    // a silent reset can quietly forget tombstones.
    console.error(
      'charasheet index.json is corrupt and was reset to empty; ' +
        'deleted/opted-out tombstones may be forgotten. ' +
        (error instanceof Error ? error.message : String(error)),
    )
    return { index: { entries: {} }, fileId }
  }
}

export async function writeIndex(index: DriveIndex, fileId?: string): Promise<string> {
  const content = JSON.stringify(index, null, 2)
  return uploadFile(INDEX_NAME, content, fileId)
}

export function isNotFound(error: unknown): boolean {
  const status = (error as (Error & { status?: number }) | null)?.status
  return status === 404
}

export { APP_FOLDER, INDEX_NAME }
import { useEffect, useState } from 'react'
import { isDriveConnected, subscribeDriveConnection } from '@/sync/google-auth'

/**
 * Reactively tracks Google Drive connection state. `isDriveConnected()` is a
 * localStorage read, so without this hook UI would miss connect/disconnect
 * events that happen elsewhere (e.g. the footer connecting in a popup).
 */
export function useDriveConnected(): boolean {
  const [connected, setConnected] = useState(isDriveConnected())
  useEffect(() => subscribeDriveConnection(setConnected), [])
  return connected
}
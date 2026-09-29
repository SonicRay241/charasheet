import { useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { connectWebdav, verifyWebdav } from '@/sync/adapters/webdav'
import { setActiveSource } from '@/sync/sync-sources'
import { runSyncNow } from './sync-actions'

interface WebdavConnectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Login form for a WebDAV server. An empty prefix defaults to "/charasheet". */
export function WebdavConnectDialog({ open, onOpenChange }: WebdavConnectDialogProps) {
  const [baseUrl, setBaseUrl] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [prefix, setPrefix] = useState('/')
  const [connecting, setConnecting] = useState(false)

  function handleConnect(): void {
    let url: URL
    try {
      url = new URL(baseUrl)
    } catch {
      toast.error('Base URL must be a valid URL, e.g. https://example.com/dav')
      return
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      toast.error('Base URL must start with http:// or https://')
      return
    }
    if (!username) {
      toast.error('Username is required')
      return
    }
    setConnecting(true)
    // Verify credentials and collection access with a real PROPFIND before
    // persisting anything.
    verifyWebdav({ baseUrl, username, password, prefixKey: prefix })
      .then(() => {
        connectWebdav({ baseUrl, username, password, prefixKey: prefix })
        setActiveSource('webdav')
        onOpenChange(false)
        toast.success('Connected to WebDAV')
        runSyncNow()
      })
      .catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : 'Connection failed'),
      )
      .finally(() => setConnecting(false))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Connect to WebDAV</DialogTitle>
          <DialogDescription>
            Files are stored in a “charasheet” folder on your server. The prefix
            defaults to /; set it to relocate that folder (e.g. /Sync/Docs →
            /Sync/Docs/charasheet).
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="webdav-base-url">Base URL</Label>
            <Input
              id="webdav-base-url"
              placeholder="https://example.com/remote.php/dav/files/me"
              value={baseUrl}
              autoComplete="url"
              onChange={(event) => setBaseUrl(event.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="webdav-username">Username</Label>
            <Input
              id="webdav-username"
              value={username}
              autoComplete="username"
              onChange={(event) => setUsername(event.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="webdav-password">Password</Label>
            <Input
              id="webdav-password"
              type="password"
              value={password}
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="webdav-prefix">Prefix path (optional)</Label>
            <Input
              id="webdav-prefix"
              placeholder="/"
              value={prefix}
              onChange={(event) => setPrefix(event.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConnect} disabled={connecting}>
            {connecting ? 'Connecting...' : 'Connect'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
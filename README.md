# Charasheet
A dnd character sheet app

## Cloud sync (bring your own storage)

Optional Google Drive sync keeps characters across devices. Files live in a
`charasheet/` folder: one YAML per character plus an `index.json` manifest
(per-character SHA-256 content hash, Drive file id, `updatedAt`, and
delete/opt-out tombstones).

### Known limitations

- **index.json is an unsynchronized read-modify-write.** Two devices syncing
  at exactly the same time can clobber each other's index entries (Drive has
  no conditional PUT we use; adding ETag/if-match guards is future work).
  In practice the debounced per-edit sync and the 30s refocus throttle make
  simultaneous writes rare, and the per-field merge heals content drift —
  but the index itself is last-writer-wins.
- **A corrupt index.json resets to empty.** If the manifest cannot be parsed
  (partial upload, manual editing), sync starts from a blank index. Local
  characters are never lost, but tombstones may be forgotten: previously
  deleted characters can reappear (they will re-sync from whichever device
  still holds them), and re-pushed files may duplicate until the index
  settles.
- **Refresh tokens live in localStorage**, so an XSS would expose them. The
  blast radius is limited by the `drive.file` scope (only files the app
  created) and by the server-side token exchange keeping the client secret
  out of the browser.

### Deployment notes

- **Set `ALLOWED_ORIGINS` in production.** When empty, `/api/google-token`
  exchanges tokens for any `origin` the request claims — an open proxy for
  your Google credentials. Set it to your deployment origin, e.g.
  `ALLOWED_ORIGINS=https://your-prod-domain` in Vercel project settings.
  (`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` must also be set there; the
  same vars in `.env.local` serve `npm run dev` via the Vite middleware.)
import { Outlet, createRootRoute, Link } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { Toaster } from '@/components/ui/sonner'

export const Route = createRootRoute({
  component: () => (
    <>
      <div className="p-3 flex gap-4 uppercase tracking-widest text-sm text-primary">
        <Link to="/" className="px-1">
          CHARASHEET
        </Link>
      </div>
      <hr />
      <Outlet />
      <Toaster />
      <TanStackRouterDevtools position="bottom-right" />
    </>
  ),
  notFoundComponent: () => <div className="p-4">Page not found</div>,
})
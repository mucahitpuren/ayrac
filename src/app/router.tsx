import { CircleNotch } from '@phosphor-icons/react'
import { createBrowserRouter, Link, Navigate, Outlet, RouterProvider } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AppShell } from '@/app/AppShell'
import { AuthPage } from '@/features/auth/AuthPage'
import { useAuth } from '@/features/auth/AuthProvider'
import { AddCopyPage } from '@/features/book/AddCopyPage'
import { AddBookPage } from '@/features/book/AddBookPage'
import { CopyDetailPage } from '@/features/book/CopyDetailPage'
import { LibraryPage } from '@/features/library/LibraryPage'

// Shown while the stored session is being restored, so neither the login page nor an empty shell flashes.
function SessionLoading() {
  const { t } = useTranslation()
  return (
    <div role="status" className="flex min-h-dvh flex-col items-center justify-center gap-3 text-muted-foreground">
      <CircleNotch aria-hidden size={32} className="animate-spin" />
      <span className="text-base">{t('common.loading')}</span>
    </div>
  )
}

function RequireAuth() {
  const { status } = useAuth()
  if (status === 'loading') return <SessionLoading />
  if (status === 'signedOut') return <Navigate to="/login" replace />
  return <AppShell />
}

function PublicOnly() {
  const { status } = useAuth()
  if (status === 'loading') return <SessionLoading />
  if (status === 'signedIn') return <Navigate to="/" replace />
  return <Outlet />
}

function NotFound() {
  const { t } = useTranslation()
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-5 text-center">
      <p className="text-base">{t('common.notFound')}</p>
      <Link to="/" className="text-base font-semibold text-primary underline-offset-4 hover:underline">
        {t('common.backToLibrary')}
      </Link>
    </main>
  )
}

const router = createBrowserRouter([
  {
    element: <PublicOnly />,
    children: [
      { path: '/signup', element: <AuthPage mode="signup" /> },
      { path: '/login', element: <AuthPage mode="login" /> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      { path: '/', element: <LibraryPage /> },
      { path: '/kitap/yeni', element: <AddBookPage /> },
      { path: '/kitap/:copyId', element: <CopyDetailPage /> },
      { path: '/eser/:workId/nusha-ekle', element: <AddCopyPage /> },
    ],
  },
  { path: '*', element: <NotFound /> },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}

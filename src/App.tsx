import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter, Link, Navigate, RouterProvider } from 'react-router'
import { AppShell } from './app/AppShell'
import { Robot } from './components/Robot'
import { useT } from './i18n'
import HomePage from './pages/HomePage'

const PlayPage = lazy(() => import('./pages/PlayPage'))
const LevelsPage = lazy(() => import('./pages/LevelsPage'))
const ProgressPage = lazy(() => import('./pages/ProgressPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const AIInfoPage = lazy(() => import('./pages/AIInfoPage'))
const LearnPage = lazy(() => import('./pages/LearnPage'))
const WelcomePage = lazy(() => import('./pages/WelcomePage'))

function PageSkeleton() {
  const t = useT()
  return (
    <div className="flex flex-col gap-4 p-4 lg:p-8" role="status" aria-label={t.meta.loading}>
      <div className="h-10 w-2/3 max-w-md animate-pulse rounded-2xl bg-primary-50 motion-reduce:animate-none" />
      <div className="aspect-square w-full max-w-xl animate-pulse rounded-[26px] bg-primary-50 motion-reduce:animate-none lg:aspect-[16/9] lg:max-w-none" />
    </div>
  )
}

const page = (el: ReactNode) => <Suspense fallback={<PageSkeleton />}>{el}</Suspense>

function NotFound() {
  const t = useT()
  return (
    <div className="grid min-h-[70dvh] place-items-center p-6 text-center">
      <div>
        <div className="mx-auto w-fit">
          <Robot size={96} mood="oops" />
        </div>
        <h1 className="mt-4 text-3xl font-black">{t.errors.notFoundTitle}</h1>
        <p className="mt-2 text-ink-muted">{t.errors.notFoundBody}</p>
        <Link to="/" className="mt-5 inline-flex h-12 items-center rounded-[14px] bg-primary px-5 font-display font-extrabold text-white">
          {t.errors.home}
        </Link>
      </div>
    </div>
  )
}

const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/welcome', element: page(<WelcomePage />) },
      { path: '/levels', element: page(<LevelsPage />) },
      { path: '/play/:levelId', element: page(<PlayPage />) },
      { path: '/progress', element: page(<ProgressPage />) },
      { path: '/profile', element: page(<ProfilePage />) },
      { path: '/profile/ai', element: page(<AIInfoPage />) },
      { path: '/about/hybrid', element: <Navigate to="/profile/ai" replace /> },
      { path: '/learn', element: page(<LearnPage />) },
      { path: '*', element: <NotFound /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}

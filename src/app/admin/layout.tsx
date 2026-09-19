import { logoutAction } from '@/actions/auth'
import { isAdmin } from '@/lib/auth'

export default async function AdminLayout({ children }: LayoutProps<'/admin'>) {
  // Administrace je jedna stránka, takže navigace tu žádná není — zbyl
  // jen štítek a odhlášení. Přihlašovací obrazovka nemá ani to.
  if (!(await isAdmin())) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-6 pb-12">
        {children}
      </main>
    )
  }

  return (
    <>
      <div className="border-b border-rule bg-ink-raised">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-4 px-4 py-2">
          <span className="text-meta text-chalk-dim">Organizátor</span>
          <form action={logoutAction}>
            <button type="submit" className="text-meta text-chalk underline-offset-4 hover:underline">
              Odhlásit se
            </button>
          </form>
        </div>
      </div>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-6 pb-12 sm:pt-8">
        {children}
      </main>
    </>
  )
}

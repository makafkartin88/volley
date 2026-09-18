import { logoutAction } from '@/actions/auth'
import { AdminNav } from '@/components/AdminNav'
import { isAdmin } from '@/lib/auth'

export default async function AdminLayout({ children }: LayoutProps<'/admin'>) {
  // Přihlašovací obrazovka žádnou admin lištu nemá — není kam navigovat
  // a není co odhlašovat.
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
      <AdminNav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-6 pb-28 sm:pt-8 sm:pb-12">
        {children}
      </main>
    </>
  )
}

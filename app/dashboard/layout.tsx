import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Upload, Settings, LogOut } from 'lucide-react'
import { ChatSidebar } from '@/components/chat/ChatSidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="h-screen w-screen max-w-full flex overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <Link href="/dashboard" className="block">
            <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Profeta
            </h1>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <LayoutDashboard className="size-4" />
            Dashboard
          </Link>
          <Link
            href="/dashboard/upload"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Upload className="size-4" />
            Upload
          </Link>
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Settings className="size-4" />
            Configurações
          </Link>
        </nav>
        <div className="p-3 border-t border-gray-200 dark:border-gray-700">
          <p className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 truncate" title={user.email ?? ''}>
            {user.email}
          </p>
          <form action={async () => {
            'use server'
            const s = await createClient()
            await s.auth.signOut()
            redirect('/')
          }}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <LogOut className="size-4" />
              Sair
            </button>
          </form>
        </div>
      </aside>
      {/* Chat */}
      <div className="h-full shrink-0">
        <ChatSidebar />
      </div>
      {/* Main */}
      <main className="flex-1 min-h-0 min-w-0 overflow-auto">
        {children}
      </main>
    </div>
  )
}

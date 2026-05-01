import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { LogOut } from 'lucide-react'

export default async function Home() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-12 pb-6 border-b border-zinc-800">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Budget Dashboard</h1>
            <p className="text-zinc-400 mt-1">Welcome back, {user.email}</p>
          </div>
          <form action="/auth/signout" method="post">
            <button className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl transition-colors border border-zinc-800">
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </form>
        </header>

        <main className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-3xl p-6 shadow-2xl">
            <h2 className="text-lg font-medium text-white mb-2">Phase 1 Complete</h2>
            <p className="text-zinc-400 text-sm">
              Your Supabase schema and RLS policies are deployed, and authentication is working.
              Ready for Phase 2!
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

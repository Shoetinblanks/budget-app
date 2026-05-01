import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { LogOut, Settings } from 'lucide-react'
import Link from 'next/link'

export default async function Home() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('pay_frequency, round_up_target')
    .eq('id', user.id)
    .single()

  const roundUpTarget = profile?.round_up_target || 10
  const payFrequency = profile?.pay_frequency || 'bi-weekly'

  // Fetch accounts and expenses
  const { data: accounts } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', user.id)
  
  const { data: expenses } = await supabase
    .from('expenses')
    .select('*')
    .eq('user_id', user.id)

  // Calculate direct deposit requirements
  // Group expenses by account_code (or map them to account ids later)
  const accountMath = (accounts || []).map(account => {
    // Note: Since expenses.csv uses account codes like CHASECK, we match on account_code
    const accExpenses = (expenses || []).filter(e => e.account_code === account.account_code)
    
    // Sum bi-weekly amounts (for now assuming bi-weekly, but it can be dynamic later based on payFrequency)
    let requiredFunding = 0
    if (payFrequency === 'bi-weekly') {
      requiredFunding = accExpenses.reduce((sum, exp) => sum + (Number(exp.bi_weekly_amount) || 0), 0)
    } else {
      // Fallback or monthly logic could go here
      requiredFunding = accExpenses.reduce((sum, exp) => sum + (Number(exp.monthly_amount) || 0), 0)
    }

    // Round up to nearest multiple of roundUpTarget
    const directDeposit = Math.ceil(requiredFunding / roundUpTarget) * roundUpTarget

    return {
      name: account.name,
      code: account.account_code,
      required: requiredFunding,
      directDeposit: directDeposit
    }
  })

  const totalRequired = accountMath.reduce((sum, acc) => sum + acc.required, 0)
  const totalDirectDeposit = accountMath.reduce((sum, acc) => sum + acc.directDeposit, 0)

  return (
    <div className="min-h-screen bg-zinc-950 p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-12 pb-6 border-b border-zinc-800">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Budget Dashboard</h1>
            <p className="text-zinc-400 mt-1">Welcome back, {user.email}</p>
          </div>
          <div className="flex gap-4 items-center">
            <Link href="/settings" className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl transition-colors border border-zinc-800">
              <Settings className="w-4 h-4" />
              Settings
            </Link>
            <form action="/auth/signout" method="post">
              <button className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl transition-colors border border-zinc-800">
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </form>
          </div>
        </header>

        <main className="space-y-8">
          <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-3xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-medium text-white">Direct Deposit Routing</h2>
              <span className="px-3 py-1 bg-zinc-800 rounded-full text-xs text-zinc-300 font-medium">
                {payFrequency.replace('-', ' ').toUpperCase()} • Rounds to ${roundUpTarget}
              </span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-400">
                <thead className="text-xs uppercase text-zinc-500 bg-zinc-900/50">
                  <tr>
                    <th className="px-4 py-3 rounded-tl-xl">Account</th>
                    <th className="px-4 py-3 text-right">Required Funding</th>
                    <th className="px-4 py-3 text-right rounded-tr-xl">Target Direct Deposit</th>
                  </tr>
                </thead>
                <tbody>
                  {accountMath.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-zinc-500">
                        No accounts setup yet. Add accounts to see your routing.
                      </td>
                    </tr>
                  ) : (
                    accountMath.map((acc, idx) => (
                      <tr key={idx} className="border-b border-zinc-800/50 last:border-0">
                        <td className="px-4 py-4 font-medium text-zinc-300">{acc.name} <span className="text-zinc-600 text-xs ml-2">{acc.code}</span></td>
                        <td className="px-4 py-4 text-right">${acc.required.toFixed(2)}</td>
                        <td className="px-4 py-4 text-right font-medium text-emerald-400">${acc.directDeposit.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {accountMath.length > 0 && (
                  <tfoot className="border-t border-zinc-800 font-medium text-white">
                    <tr>
                      <td className="px-4 py-4">Total Paycheck Need</td>
                      <td className="px-4 py-4 text-right">${totalRequired.toFixed(2)}</td>
                      <td className="px-4 py-4 text-right text-emerald-400">${totalDirectDeposit.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Receipt, BarChart3, ShieldCheck, Wallet } from 'lucide-react'
import { User } from '@supabase/supabase-js'

interface Profile {
  friendly_name?: string
  round_up_target?: number
}

interface Account {
  name: string
  account_code: string
}

interface Expense {
  account_code: string
  bi_weekly_amount: number
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('direct-deposit')
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function loadDashboardData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      const { data: accounts } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
      
      const { data: expenses } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)

      setProfile(profile)
      setAccounts(accounts || [])
      setExpenses(expenses || [])
      setLoading(false)
    }

    loadDashboardData()
  }, [supabase, router])

  if (loading) return <div className="p-8 text-zinc-500 animate-pulse">Loading dashboard...</div>

  // Math for Direct Deposit
  const roundUpTarget = profile?.round_up_target || 10
  const accountMath = (accounts || []).map(account => {
    const accExpenses = (expenses || []).filter(e => e.account_code === account.account_code)
    const requiredFunding = accExpenses.reduce((sum, exp) => sum + (Number(exp.bi_weekly_amount) || 0), 0)
    const directDeposit = Math.ceil(requiredFunding / roundUpTarget) * roundUpTarget
    return { name: account.name, code: account.account_code, required: requiredFunding, directDeposit }
  })

  const totalRequired = accountMath.reduce((sum, acc) => sum + acc.required, 0)
  const totalDirectDeposit = accountMath.reduce((sum, acc) => sum + acc.directDeposit, 0)

  const tabs = [
    { id: 'expenses', label: 'Expenses', icon: Receipt },
    { id: 'summary', label: 'Summary Totals', icon: BarChart3 },
    { id: 'emergency', label: 'Emergency Fund', icon: ShieldCheck },
    { id: 'direct-deposit', label: 'Direct Deposit', icon: Wallet },
  ]

  return (
    <div className="min-h-screen bg-zinc-950 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Welcome back, <span className="text-emerald-500">{profile?.friendly_name || user?.email}</span>
          </h1>
          <p className="text-zinc-500 mt-2">Here is your financial overview for this pay period.</p>
        </header>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mb-8 bg-zinc-900/50 p-1.5 rounded-2xl border border-zinc-800 w-fit">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-zinc-800 text-white shadow-lg border border-zinc-700' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-emerald-500' : ''}`} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <main className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-3xl p-8 shadow-2xl">
          {activeTab === 'expenses' && (
            <div className="text-center py-20">
              <Receipt className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
              <h3 className="text-zinc-300 font-medium text-lg">Expenses Ledger</h3>
              <p className="text-zinc-500 text-sm mt-1">Coming soon in Phase 3.</p>
            </div>
          )}

          {activeTab === 'summary' && (
            <div className="text-center py-20">
              <BarChart3 className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
              <h3 className="text-zinc-300 font-medium text-lg">Summary Totals</h3>
              <p className="text-zinc-500 text-sm mt-1">Coming soon in Phase 4.</p>
            </div>
          )}

          {activeTab === 'emergency' && (
            <div className="text-center py-20">
              <ShieldCheck className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
              <h3 className="text-zinc-300 font-medium text-lg">Emergency Fund</h3>
              <p className="text-zinc-500 text-sm mt-1">Coming soon in Phase 5.</p>
            </div>
          )}

          {activeTab === 'direct-deposit' && (
            <div className="animate-in fade-in duration-500">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-bold text-white">Direct Deposit Routing</h3>
                <span className="px-3 py-1 bg-zinc-800 rounded-full text-xs text-zinc-400 font-medium border border-zinc-700">
                  Rounds to ${roundUpTarget}
                </span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-zinc-400">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-500 uppercase text-xs tracking-wider">
                      <th className="px-4 py-4">Account</th>
                      <th className="px-4 py-4 text-right">Required Funding</th>
                      <th className="px-4 py-4 text-right">Target Direct Deposit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {accountMath.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-12 text-center text-zinc-600">
                          No accounts configured yet.
                        </td>
                      </tr>
                    ) : (
                      accountMath.map((acc, idx) => (
                        <tr key={idx} className="group hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-5 font-medium text-zinc-200">
                            {acc.name} 
                            <span className="text-zinc-600 text-xs ml-2 font-normal">({acc.code})</span>
                          </td>
                          <td className="px-4 py-5 text-right">${acc.required.toFixed(2)}</td>
                          <td className="px-4 py-5 text-right font-bold text-emerald-400 font-mono">
                            ${acc.directDeposit.toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {accountMath.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-zinc-800 text-white font-bold">
                        <td className="px-4 py-6 text-lg">Total Need</td>
                        <td className="px-4 py-6 text-right text-lg">${totalRequired.toFixed(2)}</td>
                        <td className="px-4 py-6 text-right text-lg text-emerald-400 font-mono">
                          ${totalDirectDeposit.toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}


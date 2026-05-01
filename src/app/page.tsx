'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Receipt, BarChart3, ShieldCheck, Wallet, Plus, Trash2, Edit2, X, Save, CheckCircle2, Circle } from 'lucide-react'
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
  id?: string
  name: string
  monthly_amount: number
  bi_weekly_amount: number
  category: string
  fixed: boolean
  account_code: string
  due_date: string
}

interface IncomeSource {
  employer_name: string
  pay_frequency: string
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('expenses')
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([])
  const [loading, setLoading] = useState(true)
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [formState, setFormState] = useState<Expense>({
    name: '',
    monthly_amount: 0,
    bi_weekly_amount: 0,
    category: 'General',
    fixed: true,
    account_code: '',
    due_date: ''
  })

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

      const [pRes, aRes, eRes, iRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('accounts').select('*').eq('user_id', user.id),
        supabase.from('expenses').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('income_sources').select('*').eq('user_id', user.id)
      ])

      setProfile(pRes.data)
      setAccounts(aRes.data || [])
      setExpenses(eRes.data || [])
      setIncomeSources(iRes.data || [])
      
      // Default account code for form
      if (aRes.data?.[0]) {
        setFormState(prev => ({ ...prev, account_code: aRes.data[0].account_code }))
      }
      
      setLoading(false)
    }

    loadDashboardData()
  }, [supabase, router])

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const expenseData = {
      ...formState,
      user_id: user.id
    }

    let error
    if (editingExpense?.id) {
      const { error: err } = await supabase.from('expenses').update(expenseData).eq('id', editingExpense.id)
      error = err
    } else {
      const { error: err } = await supabase.from('expenses').insert(expenseData)
      error = err
    }

    if (!error) {
      setIsModalOpen(false)
      setEditingExpense(null)
      setFormState({ name: '', monthly_amount: 0, bi_weekly_amount: 0, category: 'General', fixed: true, account_code: accounts[0]?.account_code || '', due_date: '' })
      // Reload expenses
      const { data } = await supabase.from('expenses').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      setExpenses(data || [])
    }
  }

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Are you sure?')) return
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (!error) {
      setExpenses(expenses.filter(e => e.id !== id))
    }
  }

  const openEditModal = (expense: Expense) => {
    setEditingExpense(expense)
    setFormState(expense)
    setIsModalOpen(true)
  }

  if (loading) return <div className="p-8 text-zinc-500 animate-pulse">Loading dashboard...</div>

  // Math Logic
  const roundUpTarget = profile?.round_up_target || 10
  const accountMath = accounts.map(account => {
    const accExpenses = expenses.filter(e => e.account_code === account.account_code)
    const requiredFunding = accExpenses.reduce((sum, exp) => sum + (Number(exp.bi_weekly_amount) || 0), 0)
    const directDeposit = Math.ceil(requiredFunding / roundUpTarget) * roundUpTarget
    return { name: account.name, code: account.account_code, required: requiredFunding, directDeposit }
  })

  const totalBiWeekly = expenses.reduce((sum, e) => sum + (Number(e.bi_weekly_amount) || 0), 0)
  const totalMonthly = expenses.reduce((sum, e) => sum + (Number(e.monthly_amount) || 0), 0)
  const fixedExpenses = expenses.filter(e => e.fixed)
  const variableExpenses = expenses.filter(e => !e.fixed)
  
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
        <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              Welcome back, <span className="text-emerald-500">{profile?.friendly_name || user?.email}</span>
            </h1>
            <p className="text-zinc-500 mt-2">
              Managing <span className="text-zinc-300">{incomeSources.length}</span> income sources
            </p>
          </div>
          {activeTab === 'expenses' && (
            <button 
              onClick={() => {
                setEditingExpense(null)
                setFormState({ name: '', monthly_amount: 0, bi_weekly_amount: 0, category: 'General', fixed: true, account_code: accounts[0]?.account_code || '', due_date: '' })
                setIsModalOpen(true)
              }}
              className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold py-2.5 px-5 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              <Plus className="w-5 h-5" />
              Add Expense
            </button>
          )}
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
        <main className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-3xl p-6 md:p-8 shadow-2xl min-h-[400px]">
          {activeTab === 'expenses' && (
            <div className="animate-in fade-in duration-500">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-500 uppercase text-xs tracking-wider">
                      <th className="px-4 py-4">Name</th>
                      <th className="px-4 py-4">Category</th>
                      <th className="px-4 py-4">Fixed</th>
                      <th className="px-4 py-4 text-right">Monthly</th>
                      <th className="px-4 py-4 text-right">Bi-Weekly</th>
                      <th className="px-4 py-4 text-center">Account</th>
                      <th className="px-4 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {expenses.map((expense) => (
                      <tr key={expense.id} className="group hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-5 font-medium text-zinc-200">{expense.name}</td>
                        <td className="px-4 py-5 text-zinc-400">
                          <span className="px-2 py-1 bg-zinc-800 rounded-md text-[10px] uppercase tracking-tighter">
                            {expense.category}
                          </span>
                        </td>
                        <td className="px-4 py-5 text-zinc-400">
                          {expense.fixed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Circle className="w-4 h-4 text-zinc-700" />
                          )}
                        </td>
                        <td className="px-4 py-5 text-right text-zinc-300">${Number(expense.monthly_amount).toFixed(2)}</td>
                        <td className="px-4 py-5 text-right text-emerald-500 font-mono">${Number(expense.bi_weekly_amount).toFixed(2)}</td>
                        <td className="px-4 py-5 text-center text-zinc-500 text-xs font-mono">{expense.account_code}</td>
                        <td className="px-4 py-5 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => openEditModal(expense)} className="p-1.5 hover:bg-zinc-800 rounded-md text-zinc-500 hover:text-white transition-colors">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteExpense(expense.id!)} className="p-1.5 hover:bg-red-500/10 rounded-md text-zinc-500 hover:text-red-400 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {expenses.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-20 text-center text-zinc-600">
                          No expenses found. Click &quot;Add Expense&quot; to get started.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'summary' && (
            <div className="animate-in fade-in duration-500 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-zinc-950/50 border border-zinc-800 p-6 rounded-2xl">
                  <p className="text-zinc-500 text-xs uppercase font-bold tracking-widest mb-1">Total Bi-Weekly</p>
                  <p className="text-3xl font-bold text-white font-mono">${totalBiWeekly.toFixed(2)}</p>
                </div>
                <div className="bg-zinc-950/50 border border-zinc-800 p-6 rounded-2xl">
                  <p className="text-zinc-500 text-xs uppercase font-bold tracking-widest mb-1">Total Monthly</p>
                  <p className="text-3xl font-bold text-white font-mono">${totalMonthly.toFixed(2)}</p>
                </div>
                <div className="bg-zinc-950/50 border border-zinc-800 p-6 rounded-2xl">
                  <p className="text-emerald-500/70 text-xs uppercase font-bold tracking-widest mb-1">Fixed Bills</p>
                  <p className="text-3xl font-bold text-white font-mono">
                    ${fixedExpenses.reduce((sum, e) => sum + Number(e.bi_weekly_amount), 0).toFixed(2)}
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-1">{fixedExpenses.length} items</p>
                </div>
                <div className="bg-zinc-950/50 border border-zinc-800 p-6 rounded-2xl">
                  <p className="text-orange-500/70 text-xs uppercase font-bold tracking-widest mb-1">Variable</p>
                  <p className="text-3xl font-bold text-white font-mono">
                    ${variableExpenses.reduce((sum, e) => sum + Number(e.bi_weekly_amount), 0).toFixed(2)}
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-1">{variableExpenses.length} items</p>
                </div>
              </div>
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
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <h3 className="text-xl font-bold text-white">Direct Deposit Routing</h3>
                <div className="flex gap-2">
                  <span className="px-3 py-1 bg-zinc-800 rounded-full text-[10px] text-zinc-400 font-bold border border-zinc-700 uppercase tracking-wider">
                    {incomeSources.length} Sources
                  </span>
                  <span className="px-3 py-1 bg-emerald-500/10 rounded-full text-[10px] text-emerald-500 font-bold border border-emerald-500/20 uppercase tracking-wider">
                    Rounds to ${roundUpTarget}
                  </span>
                </div>
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
                            <span className="text-zinc-600 text-xs ml-2 font-normal font-mono">({acc.code})</span>
                          </td>
                          <td className="px-4 py-5 text-right font-mono text-zinc-400">${acc.required.toFixed(2)}</td>
                          <td className="px-4 py-5 text-right font-bold text-emerald-400 font-mono text-lg">
                            ${acc.directDeposit.toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {accountMath.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-zinc-800 text-white font-bold">
                        <td className="px-4 py-6 text-lg">Total Paycheck Need</td>
                        <td className="px-4 py-6 text-right text-lg font-mono text-zinc-300">${totalBiWeekly.toFixed(2)}</td>
                        <td className="px-4 py-6 text-right text-2xl text-emerald-400 font-mono">
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

      {/* Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-3xl p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-white">{editingExpense ? 'Edit Expense' : 'Add New Expense'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Expense Name</label>
                  <input 
                    required
                    value={formState.name}
                    onChange={e => setFormState({ ...formState, name: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g. Rent, Internet, Car Payment"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Monthly Amount</label>
                  <input 
                    type="number"
                    step="0.01"
                    value={formState.monthly_amount}
                    onChange={e => {
                      const val = Number(e.target.value)
                      setFormState({ ...formState, monthly_amount: val, bi_weekly_amount: Number((val / 2).toFixed(2)) })
                    }}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Bi-Weekly Amount</label>
                  <input 
                    type="number"
                    step="0.01"
                    value={formState.bi_weekly_amount}
                    onChange={e => setFormState({ ...formState, bi_weekly_amount: Number(e.target.value) })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Category</label>
                  <select 
                    value={formState.category}
                    onChange={e => setFormState({ ...formState, category: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Housing">Housing</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Transportation">Transportation</option>
                    <option value="Food">Food</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Target Account</label>
                  <select 
                    value={formState.account_code}
                    onChange={e => setFormState({ ...formState, account_code: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  >
                    {accounts.map(acc => (
                      <option key={acc.account_code} value={acc.account_code}>{acc.name} ({acc.account_code})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-zinc-950 rounded-2xl border border-zinc-800">
                <input 
                  type="checkbox"
                  id="fixed"
                  checked={formState.fixed}
                  onChange={e => setFormState({ ...formState, fixed: e.target.checked })}
                  className="w-5 h-5 rounded border-zinc-800 bg-zinc-900 text-emerald-500 focus:ring-emerald-500"
                />
                <label htmlFor="fixed" className="text-sm font-medium text-zinc-300 cursor-pointer">
                  Mark as Fixed Bill
                  <span className="block text-xs text-zinc-500 font-normal">Fixed bills are used for Emergency Fund calculations.</span>
                </label>
              </div>

              <button 
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold py-4 rounded-2xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                {editingExpense ? 'Update Expense' : 'Save Expense'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

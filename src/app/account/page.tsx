'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { User, DollarSign, Target, Shield, Plus, Trash2, Save } from 'lucide-react'
import CheckStubUploader from '@/components/CheckStubUploader'

interface IncomeSource {
  id?: string
  user_id?: string
  employer_name: string
  pay_frequency: string
  gross_amount?: number
  net_amount?: number
  taxes?: number
  deductions?: number
  isNew?: boolean
}

export default function AccountPage() {
  const [activeSection, setActiveSection] = useState('profile')
  const [friendlyName, setFriendlyName] = useState('')
  const [roundUpTarget, setRoundUpTarget] = useState<number>(10)
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([])
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      const { data: incomes } = await supabase
        .from('income_sources')
        .select('*')
        .eq('user_id', user.id)

      if (profile) {
        setFriendlyName(profile.friendly_name || '')
        setRoundUpTarget(profile.round_up_target || 10)
      }
      if (incomes) {
        setIncomeSources(incomes)
      }
      setLoading(false)
    }

    loadData()
  }, [supabase, router])

  const handleSaveProfile = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('profiles').upsert({
      id: user?.id,
      friendly_name: friendlyName,
      round_up_target: roundUpTarget,
    })
    if (error) setMessage({ type: 'error', text: error.message })
    else setMessage({ type: 'success', text: 'Profile updated!' })
    setSaving(false)
  }

  const handleAddIncome = () => {
    setIncomeSources([...incomeSources, { employer_name: '', pay_frequency: 'bi-weekly', gross_amount: 0, net_amount: 0, taxes: 0, deductions: 0, isNew: true }])
  }

  const handleRemoveIncome = async (index: number) => {
    const income = incomeSources[index]
    if (income.id) {
      await supabase.from('income_sources').delete().eq('id', income.id)
    }
    const newSources = [...incomeSources]
    newSources.splice(index, 1)
    setIncomeSources(newSources)
  }

  const handleSaveIncomes = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('income_sources').upsert(
      incomeSources.map(i => ({
        ...(i.id ? { id: i.id } : {}),
        user_id: user?.id,
        employer_name: i.employer_name,
        pay_frequency: i.pay_frequency,
        gross_amount: i.gross_amount || 0,
        net_amount: i.net_amount || 0,
        taxes: i.taxes || 0,
        deductions: i.deductions || 0,
      }))
    )
    if (error) setMessage({ type: 'error', text: error.message })
    else setMessage({ type: 'success', text: 'Income sources updated!' })
    setSaving(false)
  }

  const handleUpdateSecurity = async () => {
    setSaving(true)
    if (newEmail) {
      const { error } = await supabase.auth.updateUser({ email: newEmail })
      if (error) setMessage({ type: 'error', text: error.message })
      else setMessage({ type: 'success', text: 'Confirmation email sent to new address!' })
    }
    if (newPassword) {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) setMessage({ type: 'error', text: error.message })
      else setMessage({ type: 'success', text: 'Password updated!' })
    }
    setSaving(false)
  }

  if (loading) return <div className="p-8 text-zinc-500 animate-pulse">Loading account data...</div>

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 flex flex-col md:flex-row gap-8">
      {/* Sidebar */}
      <aside className="w-full md:w-64 space-y-2">
        <button 
          onClick={() => setActiveSection('profile')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeSection === 'profile' ? 'bg-blue-500 text-zinc-950 font-bold' : 'text-zinc-400 hover:bg-zinc-900'}`}
        >
          <User className="w-5 h-5" />
          Profile
        </button>
        <button 
          onClick={() => setActiveSection('income')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeSection === 'income' ? 'bg-blue-500 text-zinc-950 font-bold' : 'text-zinc-400 hover:bg-zinc-900'}`}
        >
          <DollarSign className="w-5 h-5" />
          Income Sources
        </button>
        <button 
          onClick={() => setActiveSection('defaults')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeSection === 'defaults' ? 'bg-blue-500 text-zinc-950 font-bold' : 'text-zinc-400 hover:bg-zinc-900'}`}
        >
          <Target className="w-5 h-5" />
          System Defaults
        </button>
        <button 
          onClick={() => setActiveSection('security')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeSection === 'security' ? 'bg-blue-500 text-zinc-950 font-bold' : 'text-zinc-400 hover:bg-zinc-900'}`}
        >
          <Shield className="w-5 h-5" />
          Security
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-3xl p-8 shadow-2xl min-h-[500px]">
        {message && (
          <div className={`mb-6 p-4 rounded-xl border ${message.type === 'success' ? 'bg-blue-500/10 border-blue-500/50 text-blue-400' : 'bg-red-500/10 border-red-500/50 text-red-400'}`}>
            {message.text}
          </div>
        )}

        {activeSection === 'profile' && (
          <section className="space-y-6 animate-in fade-in duration-300">
            <h2 className="text-2xl font-bold text-white mb-6">Profile Details</h2>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Friendly Name (Nickname)</label>
              <input 
                value={friendlyName}
                onChange={e => setFriendlyName(e.target.value)}
                placeholder="e.g. John's Budget"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button 
              onClick={handleSaveProfile}
              disabled={saving}
              className="bg-blue-500 hover:bg-blue-600 text-zinc-950 font-bold py-3 px-6 rounded-xl transition-colors flex items-center gap-2"
            >
              <Save className="w-5 h-5" />
              Save Profile
            </button>
          </section>
        )}

        {activeSection === 'income' && (
          <section className="space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Income Sources</h2>
              <button 
                onClick={handleAddIncome}
                className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Source
              </button>
            </div>
            
            <div className="space-y-4">
              {incomeSources.map((income, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-zinc-950/50 border border-zinc-800 rounded-2xl relative">
                  <button 
                    onClick={() => handleRemoveIncome(index)}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1 uppercase">Income Source Name</label>
                    <input 
                      value={income.employer_name}
                      onChange={e => {
                        const newS = [...incomeSources]
                        newS[index].employer_name = e.target.value
                        setIncomeSources(newS)
                      }}
                      placeholder="Employer Name"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1 uppercase">Frequency</label>
                    <select 
                      value={income.pay_frequency}
                      onChange={e => {
                        const newS = [...incomeSources]
                        newS[index].pay_frequency = e.target.value
                        setIncomeSources(newS)
                      }}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="weekly">Weekly</option>
                      <option value="bi-weekly">Bi-Weekly</option>
                      <option value="1st/15th">1st and 15th</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <CheckStubUploader onScanComplete={(res) => {
                      const newS = [...incomeSources]
                      newS[index].gross_amount = res.gross
                      newS[index].net_amount = res.net
                      newS[index].taxes = res.taxes
                      newS[index].deductions = res.deductions
                      setIncomeSources(newS)
                    }} />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1 uppercase">Gross Pay ($)</label>
                    <input 
                      type="number"
                      step="0.01"
                      value={income.gross_amount || ''}
                      onChange={e => {
                        const newS = [...incomeSources]
                        newS[index].gross_amount = Number(e.target.value)
                        setIncomeSources(newS)
                      }}
                      placeholder="e.g. 3000"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1 uppercase">Net Pay ($)</label>
                    <input 
                      type="number"
                      step="0.01"
                      value={income.net_amount || ''}
                      onChange={e => {
                        const newS = [...incomeSources]
                        newS[index].net_amount = Number(e.target.value)
                        setIncomeSources(newS)
                      }}
                      placeholder="e.g. 2500"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1 uppercase">Taxes ($)</label>
                    <input 
                      type="number"
                      step="0.01"
                      value={income.taxes || ''}
                      onChange={e => {
                        const newS = [...incomeSources]
                        newS[index].taxes = Number(e.target.value)
                        setIncomeSources(newS)
                      }}
                      placeholder="e.g. 400"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1 uppercase">Deductions ($)</label>
                    <input 
                      type="number"
                      step="0.01"
                      value={income.deductions || ''}
                      onChange={e => {
                        const newS = [...incomeSources]
                        newS[index].deductions = Number(e.target.value)
                        setIncomeSources(newS)
                      }}
                      placeholder="e.g. 100"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              ))}
            </div>

            {incomeSources.length > 0 && (
              <button 
                onClick={handleSaveIncomes}
                disabled={saving}
                className="bg-blue-500 hover:bg-blue-600 text-zinc-950 font-bold py-3 px-6 rounded-xl transition-colors flex items-center gap-2"
              >
                <Save className="w-5 h-5" />
                Save Income Sources
              </button>
            )}
          </section>
        )}

        {activeSection === 'defaults' && (
          <section className="space-y-6 animate-in fade-in duration-300">
            <h2 className="text-2xl font-bold text-white mb-6">System Defaults</h2>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Rounding Target ($)</label>
              <input 
                type="number"
                value={roundUpTarget}
                onChange={e => setRoundUpTarget(Number(e.target.value))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-2 text-sm text-zinc-500">How would you like your direct deposits rounded up?</p>
            </div>
            <button 
              onClick={handleSaveProfile}
              disabled={saving}
              className="bg-blue-500 hover:bg-blue-600 text-zinc-950 font-bold py-3 px-6 rounded-xl transition-colors flex items-center gap-2"
            >
              <Save className="w-5 h-5" />
              Save Defaults
            </button>
          </section>
        )}

        {activeSection === 'security' && (
          <section className="space-y-6 animate-in fade-in duration-300">
            <h2 className="text-2xl font-bold text-white mb-6">Security Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Update Email</label>
                <input 
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="Leave blank to keep current"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Update Password</label>
                <input 
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Leave blank to keep current"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <button 
              onClick={handleUpdateSecurity}
              disabled={saving}
              className="bg-blue-500 hover:bg-blue-600 text-zinc-950 font-bold py-3 px-6 rounded-xl transition-colors flex items-center gap-2"
            >
              <Shield className="w-5 h-5" />
              Update Credentials
            </button>
          </section>
        )}
      </main>
    </div>
  )
}

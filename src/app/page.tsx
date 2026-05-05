'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { 
  Receipt, BarChart3, Wallet, Plus, Trash2, Edit2, X, Save, CheckCircle2, Upload, 
  Search, ArrowUpDown, Settings, CheckSquare, Square, RotateCcw, Check, Briefcase, Tags
} from 'lucide-react'
import Papa from 'papaparse'
import { User } from '@supabase/supabase-js'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Profile, Category, Account, Expense, Transaction, IncomeSource, CategoryRule, DEFAULT_CATEGORIES, PRESET_COLORS, calcAmounts, getBaseAmount, fmt } from './types'

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('transactions')
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  
  // Data State
  const [accounts, setAccounts] = useState<Account[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([])
  const [categoryRules, setCategoryRules] = useState<CategoryRule[]>([])
  const [categories, setCategories] = useState<Category[]>([])

  const [loading, setLoading] = useState(true)
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([])
  const [isApplyingRules, setIsApplyingRules] = useState(false)
  const [isUndoing, setIsUndoing] = useState(false)
  
  // Filters & Pagination
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [txDisplayLimit, setTxDisplayLimit] = useState<number | 'all'>(50)

  // Modals & Forms
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false)
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false)
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false)

  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [editingRule, setEditingRule] = useState<CategoryRule | null>(null)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editingIncome, setEditingIncome] = useState<IncomeSource | null>(null)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)

  const [expenseForm, setExpenseForm] = useState<{name: string, amount: number, frequency: string, category: string, fixed: boolean, account_code: string, due_date: string, notes: string}>({
    name: '', amount: 0, frequency: 'monthly', category: 'General', fixed: true, account_code: '', due_date: '', notes: ''
  })
  const [expenseAmountStr, setExpenseAmountStr] = useState('')
  const [showNewCategoryInExpense, setShowNewCategoryInExpense] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatColor, setNewCatColor] = useState(PRESET_COLORS[0])
  const [ruleForm, setRuleForm] = useState<CategoryRule>({ merchant_pattern: '', category: 'General' })
  const [categoryForm, setCategoryForm] = useState<Category>({ name: '', color: PRESET_COLORS[0] })
  const [incomeForm, setIncomeForm] = useState<IncomeSource>({ employer_name: '', pay_date: '', pay_frequency: 'bi-weekly', gross_amount: 0, net_amount: 0 })
  const [incomeSortKey, setIncomeSortKey] = useState<'pay_date' | 'gross_amount' | 'net_amount'>('pay_date')
  const [incomeSortDir, setIncomeSortDir] = useState<'asc' | 'desc'>('desc')
  const [incomeGrossStr, setIncomeGrossStr] = useState('')
  const [incomeNetStr, setIncomeNetStr] = useState('')
  const [incomeImportMode, setIncomeImportMode] = useState<'form' | 'paste'>('form')
  const [incomePasteText, setIncomePasteText] = useState('')
  const [incomePastePreview, setIncomePastePreview] = useState<IncomeSource[]>([])
  const [accountForm, setAccountForm] = useState<Account>({ name: '', account_code: '', type: 'checking' })

  // Import State
  const [importPreview, setImportPreview] = useState<Transaction[]>([])
  const [importLoading, setImportLoading] = useState(false)
  const [flipAmounts, setFlipAmounts] = useState(false)
  const [autoFlipDetected, setAutoFlipDetected] = useState(false)

  const supabase = createClient()
  const router = useRouter()

  const loadDashboardData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setUser(user)

    const [pRes, aRes, eRes, iRes, tRes, rRes, cRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('accounts').select('*').eq('user_id', user.id),
      supabase.from('expenses').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('income_sources').select('*').eq('user_id', user.id).order('pay_date', { ascending: false }),
      supabase.from('transactions').select('*').eq('user_id', user.id).order('transaction_date', { ascending: false }),
      supabase.from('category_rules').select('*').eq('user_id', user.id),
      supabase.from('categories').select('*').eq('user_id', user.id).order('name')
    ])

    setProfile(pRes.data)
    setAccounts(aRes.data || [])
    setExpenses(eRes.data || [])
    setIncomeSources(iRes.data || [])
    setTransactions(tRes.data || [])
    setCategoryRules(rRes.data || [])

    let cats = cRes.data || []
    if (cats.length === 0) {
      // Seed default categories
      const { data: insertedCats } = await supabase.from('categories').insert(
        DEFAULT_CATEGORIES.map(c => ({ ...c, user_id: user.id }))
      ).select()
      if (insertedCats) cats = insertedCats
    }
    setCategories(cats)
    
    if (aRes.data?.[0]) setExpenseForm(prev => ({ ...prev, account_code: aRes.data[0].account_code }))
    if (cats?.[0]) setExpenseForm(prev => ({ ...prev, category: cats[0].name }))
    
    setLoading(false)
  }, [supabase, router])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  // --- Transactions ---

  const handleUndoLastImport = async () => {
    if (!confirm('Undo the last import? This deletes all transactions added in the last batch.')) return
    setIsUndoing(true)
    if (!user) return
    const { data: latest } = await supabase.from('transactions').select('created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1)
    if (latest && latest.length > 0) {
      const latestTime = new Date(latest[0].created_at)
      const windowStart = new Date(latestTime.getTime() - 5000).toISOString()
      const windowEnd = new Date(latestTime.getTime() + 1000).toISOString()
      const { error, count } = await supabase.from('transactions').delete().eq('user_id', user.id).gte('created_at', windowStart).lte('created_at', windowEnd)
      if (!error) {
        alert(`Successfully removed ${count || 'recent'} transactions.`)
        loadDashboardData()
      } else alert('Error: ' + error.message)
    } else alert('No transactions found to undo.')
    setIsUndoing(false)
  }

  const handleDeleteSelectedTx = async () => {
    if (selectedTransactions.length === 0 || !confirm(`Delete ${selectedTransactions.length} transactions?`)) return
    const { error } = await supabase.from('transactions').delete().in('id', selectedTransactions)
    if (!error) {
      loadDashboardData()
      setSelectedTransactions([])
    } else alert('Error: ' + error.message)
  }

  const handleInlineCategoryChange = async (t: Transaction, newCategory: string) => {
    if (!user) return
    await supabase.from('transactions').update({ category: newCategory }).eq('id', t.id)
    setTransactions(transactions.map(tr => tr.id === t.id ? { ...tr, category: newCategory } : tr))
    const matchingRule = categoryRules.find(r => t.description.toLowerCase().includes(r.merchant_pattern.toLowerCase()))
    if (matchingRule && matchingRule.category !== newCategory) {
      if (confirm(`Update existing rule for "${matchingRule.merchant_pattern}" to ${newCategory}?`)) {
        await supabase.from('category_rules').update({ category: newCategory }).eq('id', matchingRule.id)
        setCategoryRules(categoryRules.map(r => r.id === matchingRule.id ? { ...r, category: newCategory } : r))
      }
    }
  }

  // --- Import Logic ---

  const processCSVFile = (file: File) => {
    setImportLoading(true)
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: (results) => {
        const rawData = results.data as Record<string, string>[]
        // Auto-detect flip
        let posCount = 0, totalValid = 0
        rawData.forEach(row => {
          const amtStr = row['Amount']?.toString().replace(/[$,]/g, '')
          if (amtStr) {
            const val = parseFloat(amtStr)
            if (!isNaN(val) && val !== 0) {
              totalValid++
              if (val > 0) posCount++
            }
          }
        })
        const shouldFlip = totalValid > 0 && (posCount / totalValid) > 0.6
        setFlipAmounts(shouldFlip)
        setAutoFlipDetected(shouldFlip)
        setImportPreview(mapCSVToTransactions(rawData, shouldFlip))
        setImportLoading(false)
      }
    })
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processCSVFile(file)
  }

  const mapCSVToTransactions = (data: Record<string, string>[], flip: boolean): Transaction[] => {
    return data.map(row => {
      const amtStr = row['Amount']?.toString().replace(/[$,]/g, '') || '0'
      const baseAmt = parseFloat(amtStr)
      const amt = baseAmt * (flip ? -1 : 1)
      const t: Transaction = {
        transaction_date: row['Date'] || row['Transaction Date'] || '',
        description: row['Description'] || '',
        category: row['Category'] || categories[0]?.name || 'General',
        amount: isNaN(amt) ? 0 : amt,
        memo: row['Memo'] || row['Location'] || ''
      }
      if (row['Post Date']) t.post_date = row['Post Date']
      if (row['Type']) t.type = row['Type']

      const rule = categoryRules.find(r => t.description.toLowerCase().includes(r.merchant_pattern.toLowerCase()))
      if (rule) t.category = rule.category
      return t
    })
  }

  const handleImportTransactions = async () => {
    if (!user) return
    setImportLoading(true)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data: existing } = await supabase.from('transactions').select('transaction_date, amount, description').eq('user_id', user.id).gte('transaction_date', thirtyDaysAgo)
    
    const toInsert = importPreview.filter(t => {
      return !existing?.some(e => 
        new Date(e.transaction_date).toLocaleDateString() === new Date(t.transaction_date).toLocaleDateString() &&
        Math.abs(e.amount - t.amount) < 0.01 && e.description.toLowerCase() === t.description.toLowerCase()
      )
    }).map(t => ({ ...t, user_id: user.id }))
    
    if (toInsert.length > 0) {
      const { error } = await supabase.from('transactions').insert(toInsert)
      if (error) alert('Error: ' + error.message)
      else alert(`Imported ${toInsert.length} transactions. (${importPreview.length - toInsert.length} duplicates skipped)`)
    } else alert('No new transactions to import. All duplicates.')
    
    setIsImportModalOpen(false)
    setImportPreview([])
    loadDashboardData()
    setImportLoading(false)
  }

  // --- Expenses ---

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    const amt = parseCurrencyInput(expenseAmountStr)
    const { monthly, biWeekly } = calcAmounts(amt, expenseForm.frequency)
    const expenseData: Expense = { 
      user_id: user.id, name: expenseForm.name, frequency: expenseForm.frequency,
      monthly_amount: monthly, bi_weekly_amount: biWeekly, 
      category: expenseForm.category, fixed: expenseForm.fixed, 
      account_code: expenseForm.account_code, due_date: expenseForm.due_date,
      notes: expenseForm.notes || ''
    }
    const { error } = editingExpense?.id 
      ? await supabase.from('expenses').update(expenseData).eq('id', editingExpense.id)
      : await supabase.from('expenses').insert(expenseData)

    if (!error) {
      setIsExpenseModalOpen(false)
      loadDashboardData()
    } else alert('Error: ' + error.message)
  }

  const handleSaveNewCategoryInline = async () => {
    if (!user || !newCatName.trim()) return
    const { data, error } = await supabase.from('categories').insert({ name: newCatName.trim(), color: newCatColor, user_id: user.id }).select().single()
    if (!error && data) {
      setCategories(prev => [...prev, data])
      setExpenseForm(f => ({ ...f, category: data.name }))
      setNewCatName('')
      setNewCatColor(PRESET_COLORS[0])
      setShowNewCategoryInExpense(false)
    } else alert('Error: ' + error?.message)
  }

  // --- Income ---

  const parseCurrencyInput = (val: string): number => {
    return parseFloat(val.replace(/[$,]/g, '')) || 0
  }

  const handleSaveIncome = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    const incData = {
      ...incomeForm,
      gross_amount: parseCurrencyInput(incomeGrossStr),
      net_amount: parseCurrencyInput(incomeNetStr),
      employer_name: '',
      user_id: user.id
    }
    const { error } = editingIncome?.id
      ? await supabase.from('income_sources').update(incData).eq('id', editingIncome.id)
      : await supabase.from('income_sources').insert(incData)
    if (!error) {
      setIsIncomeModalOpen(false)
      loadDashboardData()
    } else alert('Error: ' + error.message)
  }

  const handlePasteImport = async () => {
    if (!user) return
    const lines = incomePasteText.split('\n').map(l => l.trim()).filter(Boolean)
    const results: IncomeSource[] = []
    let i = 0
    while (i < lines.length) {
      const dateMatch = lines[i].match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s+(\d{4})$/i)
      if (dateMatch) {
        const dateStr = lines[i]
        let gross = 0, net = 0
        i++
        while (i < lines.length) {
          const nextDateMatch = lines[i].match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s+(\d{4})$/i)
          if (nextDateMatch) break
          if (lines[i].toLowerCase() === 'gross' && i + 1 < lines.length) {
            gross = parseFloat(lines[i + 1].replace(/[$,]/g, '')) || 0
            i += 2; continue
          }
          if ((lines[i].toLowerCase() === 'take home' || lines[i].toLowerCase() === 'net') && i + 1 < lines.length) {
            net = parseFloat(lines[i + 1].replace(/[$,]/g, '')) || 0
            i += 2; continue
          }
          i++
        }
        const d = new Date(dateStr)
        const localDate = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
        results.push({ employer_name: '', pay_frequency: 'bi-weekly', pay_date: localDate, gross_amount: gross, net_amount: net })
      } else { i++ }
    }
    setIncomePastePreview(results)
  }

  const handleConfirmPasteImport = async () => {
    if (!user || incomePastePreview.length === 0) return
    // Deduplicate against existing income entries by pay_date
    const existingDates = new Set(incomeSources.map(i => i.pay_date || ''))
    const toInsert = incomePastePreview.filter(r => !existingDates.has(r.pay_date || ''))
    const dupeCount = incomePastePreview.length - toInsert.length
    if (toInsert.length === 0) {
      alert(`All ${dupeCount} paychecks already exist. Nothing imported.`)
      return
    }
    const { error } = await supabase.from('income_sources').insert(toInsert.map(r => ({ ...r, user_id: user.id })))
    if (!error) {
      if (dupeCount > 0) alert(`Imported ${toInsert.length} paychecks. ${dupeCount} duplicates skipped.`)
      setIsIncomeModalOpen(false)
      setIncomePasteText('')
      setIncomePastePreview([])
      loadDashboardData()
    } else alert('Error: ' + error.message)
  }

  const handleIncomeSort = (key: 'pay_date' | 'gross_amount' | 'net_amount') => {
    if (incomeSortKey === key) setIncomeSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setIncomeSortKey(key); setIncomeSortDir('desc') }
  }

  // --- Accounts ---

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    const accData = { ...accountForm, user_id: user.id }
    const { error } = editingAccount?.id
      ? await supabase.from('accounts').update(accData).eq('id', editingAccount.id)
      : await supabase.from('accounts').insert(accData)
    if (!error) {
      setIsAccountModalOpen(false)
      loadDashboardData()
    } else alert('Error: ' + error.message)
  }

  // --- Categories ---

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    const catData = { ...categoryForm, user_id: user.id }
    const { error } = editingCategory?.id
      ? await supabase.from('categories').update(catData).eq('id', editingCategory.id)
      : await supabase.from('categories').insert(catData)
    if (!error) {
      setIsCategoryModalOpen(false)
      loadDashboardData()
    } else alert('Error: ' + error.message)
  }

  // --- Rules ---

  const handleApplyRulesToAll = async () => {
    if (categoryRules.length === 0) return alert('No rules found.')
    if (!confirm(`Apply ${categoryRules.length} rules to all ${transactions.length} transactions?`)) return
    setIsApplyingRules(true)
    let updateCount = 0
    const updates = transactions.map(t => {
      const rule = categoryRules.find(r => t.description.toLowerCase().includes(r.merchant_pattern.toLowerCase()))
      if (rule && rule.category !== t.category) { updateCount++; return { ...t, category: rule.category } }
      return null
    }).filter(Boolean) as Transaction[]

    if (updates.length > 0) {
      for (const update of updates) await supabase.from('transactions').update({ category: update.category }).eq('id', update.id)
      alert(`Updated ${updateCount} transactions!`)
      loadDashboardData()
    } else alert('No transactions needed updating.')
    setIsApplyingRules(false)
  }

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    const ruleData = { ...ruleForm, user_id: user.id }
    const { error } = editingRule?.id
      ? await supabase.from('category_rules').update(ruleData).eq('id', editingRule.id)
      : await supabase.from('category_rules').insert(ruleData)
    if (!error) {
      setIsRuleModalOpen(false)
      loadDashboardData()
    } else alert('Error: ' + error.message)
  }

  // --- Delete Helpers ---
  const del = async (table: string, id: string) => {
    if (!confirm('Are you sure?')) return
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (!error) loadDashboardData()
    else alert('Error: ' + error.message)
  }

  if (loading) return <div className="p-8 text-zinc-500 animate-pulse">Loading dashboard...</div>

  // --- Math & Derived State ---

  // Filters
  const filteredTransactions = transactions.filter(t => {
    if (startDate && t.transaction_date < startDate) return false
    if (endDate && t.transaction_date > endDate) return false
    if (searchQuery && !t.description.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })
  
  const displayedTxs = txDisplayLimit === 'all' ? filteredTransactions : filteredTransactions.slice(0, txDisplayLimit)

  // Averages for Income (windowed by profile setting)
  const incomeAvgMonths = profile?.income_avg_months || 12
  const incomeWindowCutoff = new Date()
  incomeWindowCutoff.setMonth(incomeWindowCutoff.getMonth() - incomeAvgMonths)
  const windowedIncome = incomeSources.filter(i => {
    if (!i.pay_date) return false
    const [y, m, d] = i.pay_date.split('-')
    return new Date(+y, +m - 1, +d) >= incomeWindowCutoff
  })
  const numIncomeEntries = windowedIncome.length || 1
  const totalGrossIncome = windowedIncome.reduce((sum, i) => sum + Number(i.gross_amount || 0), 0)
  const totalNetIncome = windowedIncome.reduce((sum, i) => sum + Number(i.net_amount || 0), 0)
  const avgGross = totalGrossIncome / numIncomeEntries
  const avgNet = totalNetIncome / numIncomeEntries

  // Expenses
  const roundUpTarget = profile?.round_up_target || 10
  const accountMath = accounts.map(acc => {
    const accExpenses = expenses.filter(e => e.account_code === acc.account_code)
    const required = accExpenses.reduce((sum, exp) => sum + Number(exp.bi_weekly_amount || 0), 0)
    const directDeposit = Math.ceil(required / roundUpTarget) * roundUpTarget
    return { name: acc.name, code: acc.account_code, required, directDeposit }
  })

  const totalMonthly = expenses.reduce((sum, e) => sum + Number(e.monthly_amount || 0), 0)




  const categoryDataMap = expenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + Number(exp.monthly_amount)
    return acc
  }, {} as Record<string, number>)

  // This-month actual spending (negative transactions = spending)
  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const thisMonthSpending = transactions.filter(t => t.transaction_date >= monthStart && t.amount < 0)
  const thisMonthActualByCategory = thisMonthSpending.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + Math.abs(t.amount)
    return acc
  }, {} as Record<string, number>)
  const totalActualThisMonth = Object.values(thisMonthActualByCategory).reduce((a, b) => a + b, 0)

  const budgetVsActualData = Object.keys(categoryDataMap).map(cat => ({
    name: cat, Budgeted: categoryDataMap[cat], Actual: thisMonthActualByCategory[cat] || 0
  }))

  const navTabs = [
    { id: 'transactions', label: 'Transactions', icon: ArrowUpDown },
    { id: 'expenses', label: 'Expenses', icon: Receipt },
    { id: 'income', label: 'Income', icon: Briefcase },
    { id: 'direct-deposit', label: 'Direct Deposit', icon: Wallet },
    { id: 'categories', label: 'Categories', icon: Tags },
    { id: 'rules', label: 'Rules', icon: Settings },
    { id: 'summary', label: 'Summary', icon: BarChart3 },
  ]

  return (
    <div className="min-h-screen bg-zinc-950 p-4 sm:p-8" style={{background: 'linear-gradient(135deg, #0f0f12 0%, #111115 100%)'}}>
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              <span className="text-blue-500">{profile?.friendly_name || user?.email}</span>
            </h1>
          </div>
          <div className="flex gap-3">
            {activeTab === 'transactions' && (
              <>
                <button onClick={handleUndoLastImport} disabled={isUndoing} className="btn-secondary">
                  <RotateCcw className={`w-5 h-5 ${isUndoing ? 'animate-spin' : ''}`} /> Undo Last
                </button>
                <button onClick={() => setIsImportModalOpen(true)} className="btn-primary">
                  <Upload className="w-5 h-5" /> Import CSV
                </button>
              </>
            )}
            {activeTab === 'expenses' && (
              <button onClick={() => { setEditingExpense(null); setExpenseForm({ name: '', amount: 0, frequency: 'monthly', category: categories[0]?.name || 'General', fixed: true, account_code: accounts[0]?.account_code || '', due_date: '', notes: '' }); setExpenseAmountStr(''); setShowNewCategoryInExpense(false); setIsExpenseModalOpen(true) }} className="btn-primary">
                <Plus className="w-5 h-5" /> Add Expense
              </button>
            )}
            {activeTab === 'income' && (
              <button onClick={() => { setEditingIncome(null); setIncomeForm({ employer_name: '', pay_date: '', pay_frequency: 'bi-weekly', gross_amount: 0, net_amount: 0 }); setIncomeGrossStr(''); setIncomeNetStr(''); setIncomeImportMode('form'); setIncomePasteText(''); setIncomePastePreview([]); setIsIncomeModalOpen(true) }} className="btn-primary">
                <Plus className="w-5 h-5" /> Add Paycheck
              </button>
            )}
            {activeTab === 'direct-deposit' && (
              <button onClick={() => { setEditingAccount(null); setAccountForm({ name: '', account_code: '', type: 'checking' }); setIsAccountModalOpen(true) }} className="btn-primary">
                <Plus className="w-5 h-5" /> Add Account
              </button>
            )}
            {activeTab === 'categories' && (
              <button onClick={() => { setEditingCategory(null); setCategoryForm({ name: '', color: PRESET_COLORS[0] }); setIsCategoryModalOpen(true) }} className="btn-primary">
                <Plus className="w-5 h-5" /> Add Category
              </button>
            )}
          </div>
        </header>

        <div className="flex flex-wrap gap-2 mb-8 bg-zinc-800/80 p-1.5 rounded-2xl border border-zinc-700 w-fit">
          {navTabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-zinc-700 text-white shadow-lg border border-zinc-600' : 'text-zinc-400 hover:text-zinc-200'}`}>
              <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-blue-500' : ''}`} /> {tab.label}
            </button>
          ))}
        </div>

        <main className="bg-zinc-900 border border-zinc-700 rounded-3xl p-6 md:p-8 shadow-2xl min-h-[400px]">
          
          {/* TRANSACTIONS */}
          {activeTab === 'transactions' && (
            <div className="animate-in fade-in">
              <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 w-64" />
                  </div>
                  <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1">
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent text-sm text-white focus:outline-none [color-scheme:dark]" />
                    <span className="text-xs text-zinc-500">TO</span>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent text-sm text-white focus:outline-none [color-scheme:dark]" />
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-sm text-zinc-400 font-medium px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg">
                    Showing {displayedTxs.length} / {filteredTransactions.length}
                  </div>
                  <select value={txDisplayLimit} onChange={(e) => setTxDisplayLimit(e.target.value === 'all' ? 'all' : Number(e.target.value))} className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm text-white">
                    <option value={25}>25 per page</option>
                    <option value={50}>50 per page</option>
                    <option value={100}>100 per page</option>
                    <option value={250}>250 per page</option>
                    <option value="all">All</option>
                  </select>
                  {selectedTransactions.length > 0 && (
                    <button onClick={handleDeleteSelectedTx} className="btn-danger-sm"><Trash2 className="w-4 h-4" /> Delete {selectedTransactions.length}</button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-zinc-800/50">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-950/50">
                    <tr className="text-zinc-500 uppercase text-xs tracking-wider">
                      <th className="px-4 py-3 w-10">
                        <button onClick={() => setSelectedTransactions(selectedTransactions.length === displayedTxs.length ? [] : displayedTxs.map(t => t.id!))} className="text-zinc-600 hover:text-blue-500">
                          {selectedTransactions.length === displayedTxs.length && displayedTxs.length > 0 ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                        </button>
                      </th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {displayedTxs.map((t) => (
                      <tr key={t.id} className={`group hover:bg-white/[0.02] ${selectedTransactions.includes(t.id!) ? 'bg-blue-500/5' : ''}`}>
                        <td className="px-4 py-4">
                          <button onClick={() => setSelectedTransactions(prev => prev.includes(t.id!) ? prev.filter(id => id !== t.id) : [...prev, t.id!])} className={selectedTransactions.includes(t.id!) ? 'text-blue-500' : 'text-zinc-700'}>
                            {selectedTransactions.includes(t.id!) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                          </button>
                        </td>
                        <td className="px-4 py-4 text-zinc-400 font-mono text-xs">{new Date(t.transaction_date).toLocaleDateString()}</td>
                        <td className="px-4 py-4 text-zinc-200">
                          {t.description}
                          <button onClick={() => {
                            setRuleForm({ merchant_pattern: t.description.replace(/#\d+/g, '').replace(/\b[A-Z]{2}\b$/, '').trim(), category: t.category });
                            setEditingRule(null); setIsRuleModalOpen(true);
                          }} className="ml-2 opacity-0 group-hover:opacity-100 px-2 py-0.5 bg-zinc-800 rounded text-[10px] text-zinc-500 hover:text-blue-400">Rule</button>
                        </td>
                        <td className="px-4 py-4">
                          <select value={t.category} onChange={(e) => handleInlineCategoryChange(t, e.target.value)} className="bg-transparent text-[10px] text-zinc-400 uppercase font-bold focus:ring-1 focus:ring-blue-500 rounded p-1">
                            {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                          </select>
                        </td>
                        <td className={`px-4 py-4 text-right font-mono ${t.amount < 0 ? 'text-red-400' : 'text-blue-400'}`}>
                          {t.amount < 0 ? '-' : '+'}{fmt(t.amount)}
                        </td>
                      </tr>
                    ))}
                    {displayedTxs.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-zinc-600">No transactions found.</td></tr>}
                  </tbody>
                </table>
              </div>
              {txDisplayLimit !== 'all' && displayedTxs.length < filteredTransactions.length && (
                <div className="mt-6 flex justify-center">
                  <button onClick={() => setTxDisplayLimit(prev => (prev as number) + 50)} className="btn-secondary">Show More Transactions</button>
                </div>
              )}
            </div>
          )}

          {/* EXPENSES */}
          {activeTab === 'expenses' && (
            <div className="animate-in fade-in">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-zinc-800 text-zinc-500 uppercase text-xs tracking-wider">
                    <tr><th className="p-4">Name</th><th className="p-4">Category</th><th className="p-4 text-center">Freq</th><th className="p-4 text-right">Monthly</th><th className="p-4 text-right">Bi-Weekly</th><th className="p-4 text-center">Account</th><th className="p-4 text-right">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {expenses.map((e) => (
                      <tr key={e.id} className="hover:bg-white/[0.02]">
                        <td className="p-4">
                          <p className="font-medium text-zinc-200">{e.name} {e.fixed && <CheckCircle2 className="inline w-3 h-3 text-blue-500 ml-1" />}</p>
                          {e.notes && <p className="text-xs text-zinc-500 mt-0.5 truncate max-w-[200px]">{e.notes}</p>}
                        </td>
                        <td className="p-4"><span className="px-2 py-1 bg-zinc-800 rounded-md text-[10px] uppercase text-zinc-400">{e.category}</span></td>
                        <td className="p-4 text-center text-zinc-500 text-xs capitalize">{e.frequency || 'Monthly'}</td>
                        <td className="p-4 text-right text-zinc-300">{fmt(e.monthly_amount)}</td>
                        <td className="p-4 text-right text-blue-500 font-mono">{fmt(e.bi_weekly_amount)}</td>
                        <td className="p-4 text-center text-zinc-500 font-mono text-xs">{e.account_code}</td>
                        <td className="p-4 text-right">
                          <button onClick={() => { setEditingExpense(e); const baseAmt = getBaseAmount(e.monthly_amount, e.frequency||'monthly'); setExpenseForm({name: e.name, amount: baseAmt, frequency: e.frequency||'monthly', category: e.category, fixed: e.fixed, account_code: e.account_code, due_date: e.due_date||'', notes: e.notes||''}); setExpenseAmountStr(baseAmt.toFixed(2)); setShowNewCategoryInExpense(false); setIsExpenseModalOpen(true) }} className="btn-icon"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => del('expenses', e.id!)} className="btn-icon text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* INCOME */}
          {activeTab === 'income' && (() => {
            const sortedIncome = [...incomeSources].sort((a, b) => {
              let av: number | string = a[incomeSortKey] ?? 0
              let bv: number | string = b[incomeSortKey] ?? 0
              if (incomeSortKey === 'pay_date') { av = String(av); bv = String(bv) }
              else { av = Number(av); bv = Number(bv) }
              if (av < bv) return incomeSortDir === 'asc' ? -1 : 1
              if (av > bv) return incomeSortDir === 'asc' ? 1 : -1
              return 0
            })
            const SortIcon = ({ col }: { col: typeof incomeSortKey }) => (
              <span className={`ml-1 text-[10px] ${incomeSortKey === col ? 'text-blue-400' : 'text-zinc-600'}`}>
                {incomeSortKey === col ? (incomeSortDir === 'asc' ? '▲' : '▼') : '⇅'}
              </span>
            )
            return (
            <div className="animate-in fade-in space-y-8">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-950/50 border border-zinc-800 p-6 rounded-2xl">
                  <p className="text-zinc-500 text-xs uppercase font-bold tracking-widest mb-1">Average Gross</p>
                  <p className="text-3xl font-bold text-white font-mono">{fmt(avgGross)}</p>
                  <p className="text-zinc-600 text-xs mt-2">{windowedIncome.length} paychecks · last {incomeAvgMonths} months</p>
                </div>
                <div className="bg-zinc-950/50 border border-zinc-800 p-6 rounded-2xl">
                  <p className="text-blue-500/70 text-xs uppercase font-bold tracking-widest mb-1">Average Net (Take Home)</p>
                  <p className="text-3xl font-bold text-blue-400 font-mono">{fmt(avgNet)}</p>
                  <p className="text-zinc-600 text-xs mt-2">{windowedIncome.length} paychecks · last {incomeAvgMonths} months</p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-zinc-800/50">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-950/50 border-b border-zinc-800 text-zinc-500 uppercase text-xs tracking-wider">
                    <tr>
                      <th className="p-4 cursor-pointer hover:text-zinc-300 select-none" onClick={() => handleIncomeSort('pay_date')}>Pay Date <SortIcon col="pay_date" /></th>
                      <th className="p-4 text-right cursor-pointer hover:text-zinc-300 select-none" onClick={() => handleIncomeSort('gross_amount')}>Gross <SortIcon col="gross_amount" /></th>
                      <th className="p-4 text-right cursor-pointer hover:text-zinc-300 select-none" onClick={() => handleIncomeSort('net_amount')}>Take Home <SortIcon col="net_amount" /></th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {sortedIncome.map(i => (
                      <tr key={i.id} className="hover:bg-white/[0.02]">
                        <td className="p-4 text-zinc-400 font-mono">{i.pay_date ? (() => { const [y,m,d] = (i.pay_date||'').split('-'); return new Date(+y, +m-1, +d).toLocaleDateString() })() : '-'}</td>
                        <td className="p-4 text-right text-zinc-300 font-mono">{fmt(i.gross_amount||0)}</td>
                        <td className="p-4 text-right text-blue-400 font-mono font-bold">{fmt(i.net_amount||0)}</td>
                        <td className="p-4 text-right">
                          <button onClick={() => { setEditingIncome(i); setIncomeForm(i); setIncomeGrossStr((i.gross_amount||0).toFixed(2)); setIncomeNetStr((i.net_amount||0).toFixed(2)); setIncomeImportMode('form'); setIsIncomeModalOpen(true) }} className="btn-icon"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => del('income_sources', i.id!)} className="btn-icon text-red-400"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))}
                    {incomeSources.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-zinc-600">No paychecks recorded.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
            )
          })()}

          {/* DIRECT DEPOSIT */}
          {activeTab === 'direct-deposit' && (
            <div className="animate-in fade-in">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-zinc-800 text-zinc-500 uppercase text-xs tracking-wider">
                    <tr><th className="p-4">Account Name</th><th className="p-4">Acct Code</th><th className="p-4">Type</th><th className="p-4 text-right">Req. Funding</th><th className="p-4 text-right">Target DD</th><th className="p-4 text-right">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {accountMath.map((acc, i) => {
                      const dbAcc = accounts.find(a => a.account_code === acc.code)
                      return (
                      <tr key={i} className="hover:bg-white/[0.02]">
                        <td className="p-4 text-zinc-200 font-medium">{acc.name}</td>
                        <td className="p-4 text-zinc-500 font-mono text-xs">{acc.code}</td>
                        <td className="p-4 text-zinc-400 capitalize">{dbAcc?.type || 'Checking'}</td>
                        <td className="p-4 text-right text-zinc-400 font-mono">{fmt(acc.required)}</td>
                        <td className="p-4 text-right text-blue-400 font-mono font-bold text-lg">{fmt(acc.directDeposit)}</td>
                        <td className="p-4 text-right">
                          <button onClick={() => { if(dbAcc){ setEditingAccount(dbAcc); setAccountForm(dbAcc); setIsAccountModalOpen(true) } }} className="btn-icon"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => { if(dbAcc) del('accounts', dbAcc.id!) }} className="btn-icon text-red-400"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CATEGORIES */}
          {activeTab === 'categories' && (
            <div className="animate-in fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map(c => (
                  <div key={c.id} className="bg-zinc-950/50 border border-zinc-800 p-4 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: c.color }} />
                      <span className="text-zinc-200 font-bold">{c.name}</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setEditingCategory(c); setCategoryForm(c); setIsCategoryModalOpen(true) }} className="btn-icon"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => del('categories', c.id!)} className="btn-icon text-red-400"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RULES */}
          {activeTab === 'rules' && (
            <div className="animate-in fade-in">
              <button onClick={handleApplyRulesToAll} disabled={isApplyingRules} className="btn-secondary mb-6"><Check className={`w-4 h-4 ${isApplyingRules ? 'animate-pulse' : ''}`} /> Apply Rules to All Transactions</button>
              <div className="overflow-x-auto border border-zinc-800 rounded-xl">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-950/50 border-b border-zinc-800 text-zinc-500 uppercase text-xs">
                    <tr><th className="p-4">Pattern</th><th className="p-4">Category</th><th className="p-4 text-right">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {categoryRules.map(r => (
                      <tr key={r.id}>
                        <td className="p-4 text-zinc-200 font-mono">{r.merchant_pattern}</td>
                        <td className="p-4 text-blue-400">{r.category}</td>
                        <td className="p-4 text-right">
                          <button onClick={() => { setEditingRule(r); setRuleForm(r); setIsRuleModalOpen(true) }} className="btn-icon"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => del('category_rules', r.id!)} className="btn-icon text-red-400"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUMMARY */}
          {activeTab === 'summary' && (
            <div className="animate-in fade-in space-y-8">
              {/* Top-level KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-zinc-800 border border-zinc-700 p-5 rounded-2xl">
                  <p className="text-zinc-400 text-xs uppercase font-bold tracking-widest mb-1">Avg Net Income</p>
                  <p className="text-2xl font-bold text-blue-400 font-mono">{fmt(avgNet)}</p>
                  <p className="text-zinc-500 text-xs mt-1">{incomeSources.length} paychecks</p>
                </div>
                <div className="bg-zinc-800 border border-zinc-700 p-5 rounded-2xl">
                  <p className="text-zinc-400 text-xs uppercase font-bold tracking-widest mb-1">Monthly Budget</p>
                  <p className="text-2xl font-bold text-white font-mono">{fmt(totalMonthly)}</p>
                  <p className="text-zinc-500 text-xs mt-1">{expenses.length} expenses</p>
                </div>
                <div className="bg-zinc-800 border border-zinc-700 p-5 rounded-2xl">
                  <p className="text-zinc-400 text-xs uppercase font-bold tracking-widest mb-1">Spent This Month</p>
                  <p className={`text-2xl font-bold font-mono ${totalActualThisMonth > totalMonthly ? 'text-red-400' : 'text-emerald-400'}`}>{fmt(totalActualThisMonth)}</p>
                  <p className="text-zinc-500 text-xs mt-1">{thisMonthSpending.length} transactions</p>
                </div>
                <div className="bg-zinc-800 border border-zinc-700 p-5 rounded-2xl">
                  <p className="text-zinc-400 text-xs uppercase font-bold tracking-widest mb-1">Remaining Budget</p>
                  {(() => { const rem = totalMonthly - totalActualThisMonth; return (
                    <>
                      <p className={`text-2xl font-bold font-mono ${rem >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{rem >= 0 ? '' : '-'}{fmt(Math.abs(rem))}</p>
                      <p className="text-zinc-500 text-xs mt-1">{totalMonthly > 0 ? Math.round((totalActualThisMonth / totalMonthly) * 100) : 0}% used</p>
                    </>
                  )})()}
                </div>
              </div>

              {/* Per-Category Budget vs Actual */}
              <div className="bg-zinc-800 border border-zinc-700 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-zinc-700">
                  <h3 className="font-bold text-white">Category Breakdown — This Month</h3>
                  <p className="text-zinc-400 text-xs mt-0.5">Budget (from expenses) vs actual spending (from transactions)</p>
                </div>
                <div className="divide-y divide-zinc-700/60">
                  {categories.filter(c => (categoryDataMap[c.name] || 0) > 0 || (thisMonthActualByCategory[c.name] || 0) > 0).map(c => {
                    const budgeted = categoryDataMap[c.name] || 0
                    const actual = thisMonthActualByCategory[c.name] || 0
                    const pct = budgeted > 0 ? Math.min((actual / budgeted) * 100, 100) : 100
                    const over = actual > budgeted && budgeted > 0
                    const barColor = pct < 80 ? '#10b981' : pct < 100 ? '#f59e0b' : '#f43f5e'
                    return (
                      <div key={c.id} className="p-4">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{backgroundColor: c.color}} />
                            <span className="text-zinc-200 font-medium text-sm">{c.name}</span>
                            {over && <span className="text-[10px] font-bold text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded-full">OVER</span>}
                          </div>
                          <div className="flex items-center gap-6 text-sm">
                            <div className="text-right">
                              <p className="text-zinc-500 text-[10px] uppercase">Budget</p>
                              <p className="text-zinc-300 font-mono font-bold">{fmt(budgeted)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-zinc-500 text-[10px] uppercase">Actual</p>
                              <p className={`font-mono font-bold ${over ? 'text-red-400' : 'text-emerald-400'}`}>{fmt(actual)}</p>
                            </div>
                            <div className="text-right w-14">
                              <p className="text-zinc-500 text-[10px] uppercase">% Used</p>
                              <p className="text-zinc-300 font-mono font-bold">{budgeted > 0 ? Math.round((actual/budgeted)*100) : '—'}%</p>
                            </div>
                          </div>
                        </div>
                        {budgeted > 0 && (
                          <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{width: `${pct}%`, backgroundColor: barColor}} />
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {categories.filter(c => (categoryDataMap[c.name] || 0) > 0 || (thisMonthActualByCategory[c.name] || 0) > 0).length === 0 && (
                    <p className="p-8 text-center text-zinc-500">No expenses or transactions yet.</p>
                  )}
                </div>
              </div>

              {/* Budget vs Actual Chart */}
              <div className="bg-zinc-800 border border-zinc-700 p-6 rounded-2xl">
                <h3 className="text-base font-bold text-white mb-5">Budget vs Actual — This Month</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={budgetVsActualData}>
                      <XAxis dataKey="name" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                      <Tooltip cursor={{ fill: '#3f3f46', opacity: 0.5 }} contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '12px' }} itemStyle={{ color: '#fff' }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#a1a1aa', paddingTop: '10px' }} />
                      <Bar dataKey="Budgeted" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Actual" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Income Summary */}
              {incomeSources.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-800 border border-zinc-700 p-5 rounded-2xl">
                    <p className="text-zinc-400 text-xs uppercase font-bold tracking-widest mb-1">Avg Gross / Paycheck</p>
                    <p className="text-2xl font-bold text-white font-mono">{fmt(avgGross)}</p>
                  </div>
                  <div className="bg-zinc-800 border border-zinc-700 p-5 rounded-2xl">
                    <p className="text-zinc-400 text-xs uppercase font-bold tracking-widest mb-1">Avg Net / Paycheck</p>
                    <p className="text-2xl font-bold text-blue-400 font-mono">{fmt(avgNet)}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* MODALS */}

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-800 border border-zinc-600 w-full max-w-4xl rounded-3xl p-8 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Import CSV</h2>
              <button onClick={() => setIsImportModalOpen(false)} className="btn-icon"><X className="w-6 h-6" /></button>
            </div>
            
            <div className="flex gap-4 mb-6">
              <label className="flex-1 flex flex-col items-center justify-center h-32 border-2 border-zinc-800 border-dashed rounded-2xl cursor-pointer hover:bg-zinc-800/50">
                <Upload className="w-8 h-8 text-zinc-500 mb-2" />
                <span className="text-sm text-zinc-500">Click to upload CSV</span>
                <input type="file" className="hidden" accept=".csv" onChange={handleFileUpload} />
              </label>
              <div className="bg-zinc-700 border border-zinc-600 rounded-2xl p-4 flex flex-col justify-center gap-2">
                {autoFlipDetected && <span className="text-xs text-blue-400 font-bold bg-blue-500/10 px-2 py-1 rounded w-fit">Auto-detected!</span>}
                <label className="flex items-center gap-3 text-sm font-medium text-zinc-300 cursor-pointer">
                  <input type="checkbox" checked={flipAmounts} onChange={e => { setFlipAmounts(e.target.checked); if(importPreview.length) setImportPreview(importPreview.map(t=>({...t, amount: t.amount*-1}))) }} className="rounded border-zinc-800 bg-zinc-900 text-blue-500" />
                  Flip Amounts (+/-)
                </label>
                <p className="text-[10px] text-zinc-500">Enable if charges are positive.</p>
              </div>
            </div>

            {importPreview.length > 0 && (
              <div className="flex-1 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-auto border border-zinc-800 rounded-xl mb-6">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-zinc-900 border-b border-zinc-800"><tr className="text-zinc-500 uppercase"><th className="p-3">Date</th><th className="p-3">Desc</th><th className="p-3">Cat</th><th className="p-3 text-right">Amt</th></tr></thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {importPreview.map((t, i) => (
                        <tr key={i} className="text-zinc-400"><td className="p-3">{t.transaction_date}</td><td className="p-3 truncate">{t.description}</td><td className="p-3">{t.category}</td><td className={`p-3 text-right ${t.amount<0?'text-red-400':'text-blue-400'}`}>{fmt(t.amount)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button disabled={importLoading} onClick={handleImportTransactions} className="btn-primary py-4 justify-center w-full">{importLoading ? 'Importing...' : `Confirm ${importPreview.length} Items`}</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-800 border border-zinc-600 w-full max-w-lg rounded-3xl p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold text-white">{editingExpense ? 'Edit' : 'Add'} Expense</h2><button onClick={() => setIsExpenseModalOpen(false)} className="btn-icon"><X/></button></div>
            <form onSubmit={handleSaveExpense} className="space-y-4">
              {/* Name */}
              <div><label className="text-xs font-bold text-zinc-500 uppercase">Name</label><input required value={expenseForm.name} onChange={e=>setExpenseForm({...expenseForm, name: e.target.value})} className="input-field" /></div>

              {/* Amount + Frequency */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-zinc-500 uppercase">Amount</label>
                  <input
                    required
                    type="text"
                    inputMode="decimal"
                    value={expenseAmountStr}
                    placeholder="$0.00"
                    onFocus={e => e.target.select()}
                    onChange={e => setExpenseAmountStr(e.target.value)}
                    onBlur={e => {
                      const n = parseCurrencyInput(e.target.value)
                      if (!isNaN(n)) setExpenseAmountStr(n.toFixed(2))
                    }}
                    className="input-field font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-500 uppercase">Frequency</label>
                  <select value={expenseForm.frequency} onChange={e=>setExpenseForm({...expenseForm, frequency: e.target.value})} className="input-field capitalize">
                    {['daily','weekly','bi-weekly','monthly','yearly'].map(f=><option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>

              {/* Category — with inline add */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Category</label>
                  <button type="button" onClick={() => setShowNewCategoryInExpense(v => !v)} className="text-xs text-blue-400 hover:text-blue-300 font-medium">
                    {showNewCategoryInExpense ? '← Back to list' : '+ New Category'}
                  </button>
                </div>
                {showNewCategoryInExpense ? (
                  <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 space-y-3">
                    <input
                      value={newCatName}
                      onChange={e => setNewCatName(e.target.value)}
                      placeholder="Category name"
                      className="input-field"
                    />
                    <div className="flex flex-wrap gap-2">
                      {PRESET_COLORS.map(color => (
                        <button key={color} type="button" onClick={() => setNewCatColor(color)}
                          className={`w-7 h-7 rounded-full border-2 transition-all ${newCatColor === color ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <button type="button" onClick={handleSaveNewCategoryInline} className="btn-primary w-full justify-center py-2 text-sm">
                      <Save className="w-3.5 h-3.5"/> Create &amp; Select
                    </button>
                  </div>
                ) : (
                  <select value={expenseForm.category} onChange={e=>setExpenseForm({...expenseForm, category: e.target.value})} className="input-field">
                    {categories.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                )}
              </div>

              {/* Account */}
              <div><label className="text-xs font-bold text-zinc-500 uppercase">Account</label><select value={expenseForm.account_code} onChange={e=>setExpenseForm({...expenseForm, account_code: e.target.value})} className="input-field">{accounts.map(a=><option key={a.id} value={a.account_code}>{a.name} ({a.account_code})</option>)}</select></div>

              {/* Notes */}
              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase">Notes</label>
                <textarea
                  value={expenseForm.notes}
                  onChange={e=>setExpenseForm({...expenseForm, notes: e.target.value})}
                  placeholder="Optional notes about this expense..."
                  rows={3}
                  className="input-field resize-none"
                />
              </div>

              {/* Fixed bill */}
              <label className="flex items-center gap-3 p-4 bg-zinc-700 border border-zinc-600 rounded-xl cursor-pointer">
                <input type="checkbox" checked={expenseForm.fixed} onChange={e=>setExpenseForm({...expenseForm, fixed: e.target.checked})} className="rounded bg-zinc-900 border-zinc-700 text-blue-500"/>
                <div><p className="text-sm font-bold text-zinc-200">Fixed Bill</p><p className="text-xs text-zinc-500">Used for emergency fund math</p></div>
              </label>
              <button type="submit" className="btn-primary w-full justify-center py-3"><Save className="w-4 h-4"/> Save</button>
            </form>
          </div>
        </div>
      )}

      {/* Income Modal */}
      {isIncomeModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-800 border border-zinc-600 w-full max-w-lg rounded-3xl p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">{editingIncome ? 'Edit' : 'Add'} Paycheck</h2>
              <button onClick={() => setIsIncomeModalOpen(false)} className="btn-icon"><X/></button>
            </div>
            {/* Mode tabs */}
            {!editingIncome && (
              <div className="flex mb-6 bg-zinc-900 rounded-xl p-1 gap-1">
                <button type="button" onClick={() => setIncomeImportMode('form')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${incomeImportMode === 'form' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}>Manual Entry</button>
                <button type="button" onClick={() => setIncomeImportMode('paste')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${incomeImportMode === 'paste' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}>Paste Import</button>
              </div>
            )}

            {incomeImportMode === 'form' ? (
              <form onSubmit={handleSaveIncome} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-zinc-500 uppercase">Pay Date</label>
                  <input required type="date" value={incomeForm.pay_date} onChange={e=>setIncomeForm({...incomeForm, pay_date: e.target.value})} className="input-field [color-scheme:dark]" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase">Gross</label>
                    <input
                      required
                      type="text"
                      inputMode="decimal"
                      value={incomeGrossStr}
                      placeholder="$0.00"
                      onFocus={e => e.target.select()}
                      onChange={e => setIncomeGrossStr(e.target.value)}
                      onBlur={e => {
                        const n = parseCurrencyInput(e.target.value)
                        if (!isNaN(n)) setIncomeGrossStr(n.toFixed(2))
                      }}
                      className="input-field font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase">Take Home</label>
                    <input
                      required
                      type="text"
                      inputMode="decimal"
                      value={incomeNetStr}
                      placeholder="$0.00"
                      onFocus={e => e.target.select()}
                      onChange={e => setIncomeNetStr(e.target.value)}
                      onBlur={e => {
                        const n = parseCurrencyInput(e.target.value)
                        if (!isNaN(n)) setIncomeNetStr(n.toFixed(2))
                      }}
                      className="input-field font-mono"
                    />
                  </div>
                </div>
                <button type="submit" className="btn-primary w-full justify-center py-3"><Save className="w-4 h-4"/> Save</button>
              </form>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Paste Pay Stub Text</label>
                  <textarea
                    className="input-field font-mono text-xs h-48 resize-none"
                    placeholder={`Apr 24, 2026\nGross\n$4,118.65\nTake Home\n$2,699.37\nApr 10, 2026\n...`}
                    value={incomePasteText}
                    onChange={e => { setIncomePasteText(e.target.value); setIncomePastePreview([]) }}
                  />
                </div>
                {incomePastePreview.length === 0 ? (
                  <button type="button" onClick={handlePasteImport} className="btn-secondary w-full justify-center py-3">Parse Text</button>
                ) : (
                  <div className="space-y-3">
                    <div className="border border-zinc-700 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-zinc-900 text-zinc-500 uppercase"><tr><th className="p-2">Date</th><th className="p-2 text-right">Gross</th><th className="p-2 text-right">Take Home</th></tr></thead>
                        <tbody className="divide-y divide-zinc-800">
                          {incomePastePreview.map((r, idx) => (
                            <tr key={idx} className="text-zinc-300">
                              <td className="p-2 font-mono">{r.pay_date}</td>
                              <td className="p-2 text-right font-mono">{fmt(r.gross_amount||0)}</td>
                              <td className="p-2 text-right font-mono text-blue-400">{fmt(r.net_amount||0)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-zinc-500">{incomePastePreview.length} paychecks detected</p>
                    <div className="flex gap-3">
                      <button type="button" onClick={() => setIncomePastePreview([])} className="btn-secondary flex-1 justify-center py-2.5">Re-parse</button>
                      <button type="button" onClick={handleConfirmPasteImport} className="btn-primary flex-1 justify-center py-2.5"><Save className="w-4 h-4"/> Import {incomePastePreview.length}</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Account Modal */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-800 border border-zinc-600 w-full max-w-sm rounded-3xl p-8">
            <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold text-white">{editingAccount ? 'Edit' : 'Add'} Account</h2><button onClick={() => setIsAccountModalOpen(false)} className="btn-icon"><X/></button></div>
            <form onSubmit={handleSaveAccount} className="space-y-4">
              <div><label className="text-xs font-bold text-zinc-500 uppercase">Account Name</label><input required value={accountForm.name} onChange={e=>setAccountForm({...accountForm, name: e.target.value})} className="input-field" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-bold text-zinc-500 uppercase">Code / Last 4</label><input required value={accountForm.account_code} onChange={e=>setAccountForm({...accountForm, account_code: e.target.value})} className="input-field font-mono" /></div>
                <div><label className="text-xs font-bold text-zinc-500 uppercase">Type</label><select value={accountForm.type} onChange={e=>setAccountForm({...accountForm, type: e.target.value})} className="input-field"><option value="checking">Checking</option><option value="savings">Savings</option><option value="credit-card">Credit Card</option></select></div>
              </div>
              <button type="submit" className="btn-primary w-full justify-center py-3"><Save className="w-4 h-4"/> Save</button>
            </form>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-800 border border-zinc-600 w-full max-w-sm rounded-3xl p-8">
            <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold text-white">{editingCategory ? 'Edit' : 'Add'} Category</h2><button onClick={() => setIsCategoryModalOpen(false)} className="btn-icon"><X/></button></div>
            <form onSubmit={handleSaveCategory} className="space-y-6">
              <div><label className="text-xs font-bold text-zinc-500 uppercase">Name</label><input required value={categoryForm.name} onChange={e=>setCategoryForm({...categoryForm, name: e.target.value})} className="input-field" /></div>
              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Color</label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map(color => (
                    <button key={color} type="button" onClick={() => setCategoryForm({...categoryForm, color})} className={`w-8 h-8 rounded-full border-2 transition-all ${categoryForm.color === color ? 'border-white scale-110' : 'border-transparent hover:scale-110'}`} style={{ backgroundColor: color }} />
                  ))}
                </div>
              </div>
              <button type="submit" className="btn-primary w-full justify-center py-3"><Save className="w-4 h-4"/> Save</button>
            </form>
          </div>
        </div>
      )}

      {/* Rule Modal */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-800 border border-zinc-600 w-full max-w-sm rounded-3xl p-8">
            <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold text-white">Rule</h2><button onClick={() => setIsRuleModalOpen(false)} className="btn-icon"><X/></button></div>
            <form onSubmit={handleSaveRule} className="space-y-4">
              <div><label className="text-xs font-bold text-zinc-500 uppercase">Pattern</label><input required value={ruleForm.merchant_pattern} onChange={e=>setRuleForm({...ruleForm, merchant_pattern: e.target.value})} className="input-field font-mono" /></div>
              <div><label className="text-xs font-bold text-zinc-500 uppercase">Category</label><select value={ruleForm.category} onChange={e=>setRuleForm({...ruleForm, category: e.target.value})} className="input-field">{categories.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}</select></div>
              <button type="submit" className="btn-primary w-full justify-center py-3"><Save className="w-4 h-4"/> Save</button>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

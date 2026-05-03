'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { 
  Receipt, 
  BarChart3, 
  Wallet, 
  Plus, 
  Trash2, 
  Edit2, 
  X, 
  Save, 
  CheckCircle2, 
  Circle, 
  Upload, 
  Search, 
  Filter, 
  ArrowUpDown, 
  Settings, 
  CheckSquare, 
  Square, 
  RotateCcw,
  Check
} from 'lucide-react'
import Papa from 'papaparse'
import { User } from '@supabase/supabase-js'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

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

interface Transaction {
  id?: string
  transaction_date: string
  post_date?: string
  description: string
  category: string
  subcategory?: string
  type?: string
  amount: number
  memo?: string
}

interface IncomeSource {
  employer_name: string
  pay_frequency: string
  net_amount?: number
  gross_amount?: number
  taxes?: number
  deductions?: number
}

interface CategoryRule {
  id?: string
  merchant_pattern: string
  category: string
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('transactions')
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([])
  const [categoryRules, setCategoryRules] = useState<CategoryRule[]>([])
  // We fetch plaidItems to ensure they exist, but don't strictly need to render them yet in this view
  // const [plaidItems, setPlaidItems] = useState<PlaidItem[]>([])
  const [loading, setLoading] = useState(true)
  const [emergencyMonths, setEmergencyMonths] = useState<number>(3)
  const [totalsView, setTotalsView] = useState<'bi-weekly' | 'monthly' | 'yearly'>('monthly')
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([])
  const [isApplyingRules, setIsApplyingRules] = useState(false)
  const [isUndoing, setIsUndoing] = useState(false)
  
  // Date Range Filter State
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  // Rule Modal State
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<CategoryRule | null>(null)
  const [ruleForm, setRuleForm] = useState<CategoryRule>({ merchant_pattern: '', category: 'General' })
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
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

  // Import State
  const [importPreview, setImportPreview] = useState<Transaction[]>([])
  const [importLoading, setImportLoading] = useState(false)
  const [flipAmounts, setFlipAmounts] = useState(false)

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

      const [pRes, aRes, eRes, iRes, tRes, rRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('accounts').select('*').eq('user_id', user.id),
        supabase.from('expenses').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('income_sources').select('*').eq('user_id', user.id),
        supabase.from('transactions').select('*').eq('user_id', user.id).order('transaction_date', { ascending: false }),
        supabase.from('category_rules').select('*').eq('user_id', user.id)
      ])

      setProfile(pRes.data)
      setAccounts(aRes.data || [])
      setExpenses(eRes.data || [])
      setIncomeSources(iRes.data || [])
      setTransactions(tRes.data || [])
      setCategoryRules(rRes.data || [])
      // setPlaidItems(plaidRes.data || [])
      
      if (aRes.data?.[0]) {
        setFormState(prev => ({ ...prev, account_code: aRes.data[0].account_code }))
      }
      
      setLoading(false)
    }

    loadDashboardData()
  }, [supabase, router])

  const handleUndoLastImport = async () => {
    if (!confirm('Are you sure you want to undo the last import? This will delete all transactions added in the last batch.')) return
    
    setIsUndoing(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Find the absolute latest created_at
    const { data: latest } = await supabase
      .from('transactions')
      .select('created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)

    if (latest && latest.length > 0) {
      const latestTime = new Date(latest[0].created_at)
      const windowStart = new Date(latestTime.getTime() - 5000).toISOString() // 5 second window
      const windowEnd = new Date(latestTime.getTime() + 1000).toISOString()

      const { error, count } = await supabase
        .from('transactions')
        .delete()
        .eq('user_id', user.id)
        .gte('created_at', windowStart)
        .lte('created_at', windowEnd)

      if (!error) {
        alert(`Successfully removed ${count || 'recent'} transactions.`)
        // Refresh
        const { data } = await supabase.from('transactions').select('*').eq('user_id', user.id).order('transaction_date', { ascending: false })
        setTransactions(data || [])
      } else {
        alert('Error undoing import: ' + error.message)
      }
    } else {
      alert('No transactions found to undo.')
    }
    setIsUndoing(false)
  }

  const handleDeleteSelected = async () => {
    if (selectedTransactions.length === 0) return
    if (!confirm(`Are you sure you want to delete ${selectedTransactions.length} selected transactions?`)) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('transactions')
      .delete()
      .in('id', selectedTransactions)

    if (!error) {
      const { data } = await supabase.from('transactions').select('*').eq('user_id', user.id).order('transaction_date', { ascending: false })
      setTransactions(data || [])
      setSelectedTransactions([])
    } else {
      alert('Error deleting transactions: ' + error.message)
    }
  }

  const handleApplyRulesToAll = async () => {
    if (categoryRules.length === 0) {
      alert('No rules found. Create some rules first!')
      return
    }

    if (!confirm(`This will go through all ${transactions.length} visible transactions and update their categories based on your ${categoryRules.length} rules. Continue?`)) return

    setIsApplyingRules(true)
    let updateCount = 0

    const updates = transactions.map(t => {
      const rule = categoryRules.find(r => 
        t.description.toLowerCase().includes(r.merchant_pattern.toLowerCase())
      )
      if (rule && rule.category !== t.category) {
        updateCount++
        return { ...t, category: rule.category }
      }
      return null
    }).filter(Boolean) as Transaction[]

    if (updates.length === 0) {
      alert('No transactions needed updating based on current rules.')
      setIsApplyingRules(false)
      return
    }

    // Supabase upsert/update in batch
    for (const update of updates) {
      await supabase.from('transactions').update({ category: update.category }).eq('id', update.id)
    }

    alert(`Successfully updated ${updateCount} transactions!`)
    
    // Refresh
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase.from('transactions').select('*').eq('user_id', user.id).order('transaction_date', { ascending: false })
      setTransactions(data || [])
    }
    
    setIsApplyingRules(false)
  }

  const handleDeleteRule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return
    const { error } = await supabase.from('category_rules').delete().eq('id', id)
    if (!error) {
      setCategoryRules(categoryRules.filter(r => r.id !== id))
    }
  }

  const openCreateRuleModal = (t?: Transaction) => {
    if (t) {
      let pattern = t.description;
      // Heuristic cleaning
      pattern = pattern.replace(/#\d+/g, '') // Remove store numbers like #1234
      pattern = pattern.replace(/\b[A-Z]{2}\b$/, '') // Remove trailing state code like AZ or NV
      pattern = pattern.replace(/\s+/g, ' ').trim()
      
      let suggestedCategory = t.category;
      if (suggestedCategory === 'Charge' || suggestedCategory === 'General' || !suggestedCategory) {
        const lower = pattern.toLowerCase();
        if (lower.includes('wal-mart') || lower.includes('kroger') || lower.includes('safeway') || lower.includes('publix')) suggestedCategory = 'Food';
        else if (lower.includes('caesars') || lower.includes('mgm') || lower.includes('wynn') || lower.includes('venetian')) suggestedCategory = 'Entertainment';
        else if (lower.includes('shell') || lower.includes('chevron') || lower.includes('arco') || lower.includes('exxon')) suggestedCategory = 'Transportation';
        else if (lower.includes('netflix') || lower.includes('spotify') || lower.includes('hulu') || lower.includes('hbo')) suggestedCategory = 'Entertainment';
        else if (lower.includes('amazon')) suggestedCategory = 'General';
        else if (lower.includes('mcdonald') || lower.includes('starbucks') || lower.includes('wendy') || lower.includes('taco bell')) suggestedCategory = 'Food';
        else if (lower.includes('home depot') || lower.includes('lowes')) suggestedCategory = 'Housing';
        else if (lower.includes('nv energy') || lower.includes('swgas') || lower.includes('water')) suggestedCategory = 'Utilities';
      }
      setRuleForm({ merchant_pattern: pattern, category: suggestedCategory || 'General' });
    } else {
      setRuleForm({ merchant_pattern: '', category: 'General' });
    }
    setEditingRule(null);
    setIsRuleModalOpen(true);
  }

  const openEditRuleModal = (rule: CategoryRule) => {
    setRuleForm(rule);
    setEditingRule(rule);
    setIsRuleModalOpen(true);
  }

  const handleSaveRuleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const ruleData = { ...ruleForm, user_id: user.id }
    let error;

    if (editingRule?.id) {
      const { error: err } = await supabase.from('category_rules').update(ruleData).eq('id', editingRule.id)
      error = err;
    } else {
      const { error: err } = await supabase.from('category_rules').insert(ruleData)
      error = err;
    }

    if (!error) {
      setIsRuleModalOpen(false)
      const { data } = await supabase.from('category_rules').select('*').eq('user_id', user.id)
      setCategoryRules(data || [])
    } else {
      alert('Error saving rule: ' + error.message)
    }
  }

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const expenseData = { ...formState, user_id: user.id }
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
      const { data } = await supabase.from('expenses').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      setExpenses(data || [])
    }
  }

  const processCSVFile = (file: File) => {
    setImportLoading(true)
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const mapped = mapCSVToTransactions(results.data as Record<string, string>[])
        setImportPreview(mapped)
        setImportLoading(false)
      }
    })
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processCSVFile(file)
  }

  const handleInlineCategoryChange = async (t: Transaction, newCategory: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 1. Update the transaction itself
    await supabase.from('transactions').update({ category: newCategory }).eq('id', t.id)

    // Update local state for immediate feedback
    setTransactions(transactions.map(tr => tr.id === t.id ? { ...tr, category: newCategory } : tr))

    // 2. Check for matching rules
    const matchingRule = categoryRules.find(r => t.description.toLowerCase().includes(r.merchant_pattern.toLowerCase()))
    
    if (matchingRule) {
      if (matchingRule.category !== newCategory) {
        if (confirm(`A rule exists that categorizes "${matchingRule.merchant_pattern}" as ${matchingRule.category}.\n\nDo you want to update this rule to ${newCategory}?`)) {
          const { error } = await supabase.from('category_rules').update({ category: newCategory }).eq('id', matchingRule.id)
          if (!error) {
            setCategoryRules(categoryRules.map(r => r.id === matchingRule.id ? { ...r, category: newCategory } : r))
            alert('Rule updated successfully!')
          }
        }
      }
    }
  }

  const mapCSVToTransactions = (data: Record<string, string>[]): Transaction[] => {
    return data.map(row => {
      let t: Transaction
      
      // Detection logic
      if (row['Transaction Date'] && row['Post Date'] && row['Amount']) {
        t = {
          transaction_date: row['Transaction Date'],
          post_date: row['Post Date'],
          description: row['Description'],
          category: row['Category'] || 'General',
          type: row['Type'],
          amount: parseFloat(row['Amount']) * (flipAmounts ? -1 : 1),
          memo: row['Memo']
        }
      } else if (row['Date'] && row['Description'] && row['Amount']) {
        t = {
          transaction_date: row['Date'],
          description: row['Description'],
          category: row['Category'] || 'General',
          amount: parseFloat(row['Amount']) * (flipAmounts ? -1 : 1),
          memo: row['Location']
        }
      } else {
        t = {
          transaction_date: row['Date'] || row['Transaction Date'] || '',
          description: row['Description'] || '',
          category: row['Category'] || 'General',
          amount: parseFloat(row['Amount']?.toString().replace(/[$,]/g, '') || '0') * (flipAmounts ? -1 : 1)
        }
      }

      // Apply Smart Categorization
      const rule = categoryRules.find(r => 
        t.description.toLowerCase().includes(r.merchant_pattern.toLowerCase())
      )
      if (rule) {
        t.category = rule.category
      }

      return t
    })
  }

  const handleImportTransactions = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setImportLoading(true)
    
    // Deduplication logic: Check for existing transactions in the last 30 days
    const { data: existing } = await supabase
      .from('transactions')
      .select('transaction_date, amount, description')
      .eq('user_id', user.id)
      .gte('transaction_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

    const toInsert = importPreview.filter(t => {
      const isDuplicate = existing?.some(e => 
        new Date(e.transaction_date).toLocaleDateString() === new Date(t.transaction_date).toLocaleDateString() &&
        Math.abs(e.amount - t.amount) < 0.01 &&
        e.description.toLowerCase() === t.description.toLowerCase()
      )
      return !isDuplicate
    }).map(t => ({ ...t, user_id: user.id }))
    
    if (toInsert.length > 0) {
      const { error } = await supabase.from('transactions').insert(toInsert)
      if (error) {
        alert('Error importing transactions: ' + error.message)
      } else {
        alert(`Successfully imported ${toInsert.length} new transactions. (${importPreview.length - toInsert.length} duplicates skipped)`)
      }
    } else {
      alert('No new transactions to import. All items in the file were identified as duplicates.')
    }
    
    setIsImportModalOpen(false)
    setImportPreview([])
    const { data } = await supabase.from('transactions').select('*').eq('user_id', user.id).order('transaction_date', { ascending: false }).limit(50)
    setTransactions(data || [])
    setImportLoading(false)
  }


  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Are you sure?')) return
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (!error) setExpenses(expenses.filter(e => e.id !== id))
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

  // Analytics Math
  const totalNetPayMonthly = incomeSources.reduce((sum, income) => {
    let multiplier = 1;
    if (income.pay_frequency === 'weekly') multiplier = 4.33;
    if (income.pay_frequency === 'bi-weekly') multiplier = 2.16;
    if (income.pay_frequency === '1st/15th') multiplier = 2;
    if (income.pay_frequency === 'monthly') multiplier = 1;
    return sum + (Number(income.net_amount || 0) * multiplier);
  }, 0);

  const totalGrossMonthly = incomeSources.reduce((sum, income) => {
    let multiplier = 1;
    if (income.pay_frequency === 'weekly') multiplier = 4.33;
    if (income.pay_frequency === 'bi-weekly') multiplier = 2.16;
    if (income.pay_frequency === '1st/15th') multiplier = 2;
    if (income.pay_frequency === 'monthly') multiplier = 1;
    return sum + (Number(income.gross_amount || 0) * multiplier);
  }, 0);

  const totalTaxesMonthly = incomeSources.reduce((sum, income) => {
    let multiplier = 1;
    if (income.pay_frequency === 'weekly') multiplier = 4.33;
    if (income.pay_frequency === 'bi-weekly') multiplier = 2.16;
    if (income.pay_frequency === '1st/15th') multiplier = 2;
    if (income.pay_frequency === 'monthly') multiplier = 1;
    return sum + (Number(income.taxes || 0) * multiplier);
  }, 0);

  const totalDeductionsMonthly = incomeSources.reduce((sum, income) => {
    let multiplier = 1;
    if (income.pay_frequency === 'weekly') multiplier = 4.33;
    if (income.pay_frequency === 'bi-weekly') multiplier = 2.16;
    if (income.pay_frequency === '1st/15th') multiplier = 2;
    if (income.pay_frequency === 'monthly') multiplier = 1;
    return sum + (Number(income.deductions || 0) * multiplier);
  }, 0);

  const totalFixedMonthly = fixedExpenses.reduce((sum, e) => sum + Number(e.monthly_amount), 0);
  const totalVariableMonthly = variableExpenses.reduce((sum, e) => sum + Number(e.monthly_amount), 0);
  const totalExpensesMonthly = totalFixedMonthly + totalVariableMonthly;
  
  // Apply view multiplier
  let viewMultiplier = 1;
  if (totalsView === 'bi-weekly') viewMultiplier = 12 / 26;
  if (totalsView === 'yearly') viewMultiplier = 12;

  const viewNetPay = totalNetPayMonthly * viewMultiplier;
  const viewExpenses = totalExpensesMonthly * viewMultiplier;
  const viewGross = totalGrossMonthly * viewMultiplier;
  const viewTaxes = totalTaxesMonthly * viewMultiplier;
  const viewDeductions = totalDeductionsMonthly * viewMultiplier;
  const netCashFlow = viewNetPay - viewExpenses;

  const emergencyGoal = totalFixedMonthly * emergencyMonths;

  const netPayVsExpensesData = [
    { name: 'Income', value: viewNetPay, fill: '#3b82f6' },
    { name: 'Expenses', value: viewExpenses, fill: '#f43f5e' }
  ];

  const payBreakdownData = [
    { name: 'Net Pay', value: viewNetPay, fill: '#3b82f6' },
    { name: 'Taxes', value: viewTaxes, fill: '#f59e0b' },
    { name: 'Deductions', value: viewDeductions, fill: '#6366f1' }
  ];

  const fixedVsVariableData = [
    { name: 'Fixed', value: totalFixedMonthly, color: '#3b82f6' },
    { name: 'Variable', value: totalVariableMonthly, color: '#f97316' }
  ];

  const categoryDataMap = expenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + Number(exp.monthly_amount);
    return acc;
  }, {} as Record<string, number>);

  const categoryData = Object.keys(categoryDataMap).map(key => ({
    name: key,
    value: categoryDataMap[key]
  }));

  const COLORS = ['#3b82f6', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

  // Actual Spending Math (Last 30 Days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const actualsByCategory = transactions
    .filter(t => new Date(t.transaction_date) >= thirtyDaysAgo)
    .reduce((acc, t) => {
      const amount = Math.abs(t.amount)
      acc[t.category] = (acc[t.category] || 0) + amount
      return acc
    }, {} as Record<string, number>)

  const budgetVsActualData = Object.keys(categoryDataMap).map(cat => ({
    name: cat,
    Budgeted: categoryDataMap[cat],
    Actual: actualsByCategory[cat] || 0
  }))

  const filteredTransactions = transactions.filter(t => {
    if (startDate && t.transaction_date < startDate) return false;
    if (endDate && t.transaction_date > endDate) return false;
    return true;
  });

  const tabs = [
    { id: 'transactions', label: 'Transactions', icon: ArrowUpDown },
    { id: 'expenses', label: 'Expenses', icon: Receipt },
    { id: 'rules', label: 'Rules', icon: Settings },
    { id: 'summary', label: 'Summary Totals', icon: BarChart3 },
    { id: 'direct-deposit', label: 'Direct Deposit', icon: Wallet },
  ]

  return (
    <div className="min-h-screen bg-zinc-950 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              Welcome back, <span className="text-blue-500">{profile?.friendly_name || user?.email}</span>
            </h1>
            <p className="text-zinc-500 mt-2">
              Managing <span className="text-zinc-300">{incomeSources.length}</span> income sources
            </p>
          </div>
          <div className="flex gap-3">
            {activeTab === 'transactions' && (
              <>
                <button 
                  onClick={handleUndoLastImport}
                  disabled={isUndoing}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-bold py-2.5 px-5 rounded-xl transition-all flex items-center gap-2 border border-zinc-700 disabled:opacity-50"
                  title="Undo the last batch of imported transactions"
                >
                  <RotateCcw className={`w-5 h-5 ${isUndoing ? 'animate-spin' : ''}`} />
                  Undo Last Import
                </button>
                <button 
                  onClick={() => setIsImportModalOpen(true)}
                  className="bg-blue-500 hover:bg-blue-600 text-zinc-950 font-bold py-2.5 px-5 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"
                >
                  <Upload className="w-5 h-5" />
                  Import CSV
                </button>
              </>
            )}
            {activeTab === 'expenses' && (
              <button 
                onClick={() => {
                  setEditingExpense(null)
                  setFormState({ name: '', monthly_amount: 0, bi_weekly_amount: 0, category: 'General', fixed: true, account_code: accounts[0]?.account_code || '', due_date: '' })
                  setIsModalOpen(true)
                }}
                className="bg-blue-500 hover:bg-blue-600 text-zinc-950 font-bold py-2.5 px-5 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"
              >
                <Plus className="w-5 h-5" />
                Add Expense
              </button>
            )}
          </div>
        </header>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mb-8 bg-zinc-900/50 p-1.5 rounded-2xl border border-zinc-800 w-fit">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-zinc-800 text-white shadow-lg border border-zinc-700' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-blue-500' : ''}`} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <main className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-3xl p-6 md:p-8 shadow-2xl min-h-[400px]">
          {activeTab === 'transactions' && (
            <div className="animate-in fade-in duration-500">
              <div className="flex justify-between items-center mb-6">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input 
                    placeholder="Search transactions..."
                    className="bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                  />
                </div>
                <div className="flex gap-2 items-center">
                  <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1">
                    <span className="text-xs text-zinc-500 uppercase font-bold">From</span>
                    <input 
                      type="date" 
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-transparent text-sm text-white focus:outline-none [color-scheme:dark]"
                    />
                    <span className="text-xs text-zinc-500 uppercase font-bold ml-2">To</span>
                    <input 
                      type="date" 
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-transparent text-sm text-white focus:outline-none [color-scheme:dark]"
                    />
                  </div>
                  {selectedTransactions.length > 0 && (
                    <button 
                      onClick={handleDeleteSelected}
                      className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-sm font-bold border border-red-500/20 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete {selectedTransactions.length}
                    </button>
                  )}
                  <button className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 transition-colors">
                    <Filter className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-500 uppercase text-xs tracking-wider">
                      <th className="px-4 py-4 w-10">
                        <button 
                          onClick={() => {
                            if (selectedTransactions.length === transactions.length) {
                              setSelectedTransactions([])
                            } else {
                              setSelectedTransactions(transactions.map(t => t.id!))
                            }
                          }}
                          className="text-zinc-600 hover:text-blue-500 transition-colors"
                        >
                          {selectedTransactions.length === transactions.length && transactions.length > 0 ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                        </button>
                      </th>
                      <th className="px-4 py-4">Date</th>
                      <th className="px-4 py-4">Description</th>
                      <th className="px-4 py-4">Category</th>
                      <th className="px-4 py-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {filteredTransactions.map((t) => (
                      <tr key={t.id} className={`group hover:bg-white/[0.02] transition-colors ${selectedTransactions.includes(t.id!) ? 'bg-blue-500/5' : ''}`}>
                        <td className="px-4 py-5">
                          <button 
                            onClick={() => {
                              if (selectedTransactions.includes(t.id!)) {
                                setSelectedTransactions(selectedTransactions.filter(id => id !== t.id))
                              } else {
                                setSelectedTransactions([...selectedTransactions, t.id!])
                              }
                            }}
                            className={`${selectedTransactions.includes(t.id!) ? 'text-blue-500' : 'text-zinc-700 group-hover:text-zinc-500'} transition-colors`}
                          >
                            {selectedTransactions.includes(t.id!) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                          </button>
                        </td>
                        <td className="px-4 py-5 text-zinc-400 font-mono text-xs">{new Date(t.transaction_date).toLocaleDateString()}</td>
                        <td className="px-4 py-5 text-zinc-200">
                          {t.description}
                          <button 
                            onClick={() => openCreateRuleModal(t)}
                            className="ml-2 opacity-0 group-hover:opacity-100 px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 rounded text-[10px] text-zinc-500 hover:text-blue-400 transition-all border border-zinc-700"
                            title="Create Smart Category Rule"
                          >
                            Create Rule
                          </button>
                        </td>
                        <td className="px-4 py-5">
                          <select
                            value={t.category}
                            onChange={(e) => handleInlineCategoryChange(t, e.target.value)}
                            className="bg-transparent text-[10px] text-zinc-400 uppercase font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 rounded p-1 border border-transparent hover:border-zinc-800 cursor-pointer"
                          >
                            <option value="Housing">Housing</option>
                            <option value="Utilities">Utilities</option>
                            <option value="Transportation">Transportation</option>
                            <option value="Food">Food</option>
                            <option value="Entertainment">Entertainment</option>
                            <option value="Travel">Travel</option>
                            <option value="General">General</option>
                          </select>
                        </td>
                        <td className={`px-4 py-5 text-right font-mono ${t.amount < 0 ? 'text-red-400' : 'text-blue-400'}`}>
                          {t.amount < 0 ? '-' : '+'}${Math.abs(t.amount).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    {filteredTransactions.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-20 text-center text-zinc-600">
                          No transactions found. Adjust your date filters or click &quot;Import CSV&quot;.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

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
                            <CheckCircle2 className="w-4 h-4 text-blue-500" />
                          ) : (
                            <Circle className="w-4 h-4 text-zinc-700" />
                          )}
                        </td>
                        <td className="px-4 py-5 text-right text-zinc-300">${Number(expense.monthly_amount).toFixed(2)}</td>
                        <td className="px-4 py-5 text-right text-blue-500 font-mono">${Number(expense.bi_weekly_amount).toFixed(2)}</td>
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
          {activeTab === 'rules' && (
            <div className="animate-in fade-in duration-500">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-xl font-bold text-white">Categorization Rules</h3>
                  <p className="text-sm text-zinc-500">Define how transactions are automatically categorized based on their description.</p>
                </div>
                <button 
                  onClick={handleApplyRulesToAll}
                  disabled={isApplyingRules}
                  className="bg-blue-500 hover:bg-blue-600 text-zinc-950 font-bold py-2.5 px-5 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50"
                >
                  <Check className={`w-5 h-5 ${isApplyingRules ? 'animate-pulse' : ''}`} />
                  Apply All Rules to Transactions
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-500 uppercase text-xs tracking-wider">
                      <th className="px-4 py-4">Merchant Pattern</th>
                      <th className="px-4 py-4">Target Category</th>
                      <th className="px-4 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {categoryRules.map((rule) => (
                      <tr key={rule.id} className="group hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-5 font-mono text-zinc-200">{rule.merchant_pattern}</td>
                        <td className="px-4 py-5">
                          <span className="px-2 py-1 bg-zinc-800 rounded-md text-[10px] uppercase tracking-tighter text-blue-400 border border-blue-500/10">
                            {rule.category}
                          </span>
                        </td>
                        <td className="px-4 py-5 text-right">
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => openEditRuleModal(rule)}
                              className="p-1.5 hover:bg-zinc-800 rounded-md text-zinc-500 hover:text-white transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteRule(rule.id!)}
                              className="p-1.5 hover:bg-red-500/10 rounded-md text-zinc-500 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {categoryRules.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-4 py-20 text-center text-zinc-600">
                          No rules found. Save a rule from the Transactions tab to see it here.
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
                  <p className="text-blue-500/70 text-xs uppercase font-bold tracking-widest mb-1">Fixed Bills</p>
                  <p className="text-3xl font-bold text-white font-mono">
                    ${totalFixedMonthly.toFixed(2)}
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-1">{fixedExpenses.length} items</p>
                </div>
                <div className="bg-zinc-950/50 border border-zinc-800 p-6 rounded-2xl">
                  <p className="text-orange-500/70 text-xs uppercase font-bold tracking-widest mb-1">Variable</p>
                  <p className="text-3xl font-bold text-white font-mono">
                    ${totalVariableMonthly.toFixed(2)}
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-1">{variableExpenses.length} items</p>
                </div>
              </div>

              {/* Analytics Section */}
              <div className="flex justify-between items-center bg-zinc-950/50 p-2 rounded-xl border border-zinc-800 w-fit">
                {(['bi-weekly', 'monthly', 'yearly'] as const).map(view => (
                  <button
                    key={view}
                    onClick={() => setTotalsView(view)}
                    className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-all ${totalsView === view ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    {view}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Net Pay vs Expenses */}
                <div className="bg-zinc-950/50 border border-zinc-800 p-6 rounded-2xl">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-white capitalize">{totalsView} Cash Flow</h3>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold border ${netCashFlow >= 0 ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                      {netCashFlow >= 0 ? '+' : '-'}${Math.abs(netCashFlow).toFixed(2)} Leftover
                    </div>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={netPayVsExpensesData}>
                        <XAxis dataKey="name" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                        <Tooltip cursor={{ fill: '#27272a', opacity: 0.4 }} contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px' }} itemStyle={{ color: '#fff' }} />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Pay Breakdown */}
                <div className="bg-zinc-950/50 border border-zinc-800 p-6 rounded-2xl">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-white capitalize">{totalsView} Pay Breakdown</h3>
                    <div className="text-xs font-mono text-zinc-400">
                      Gross: ${viewGross.toFixed(2)}
                    </div>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={payBreakdownData}>
                        <XAxis dataKey="name" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                        <Tooltip cursor={{ fill: '#27272a', opacity: 0.4 }} contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px' }} itemStyle={{ color: '#fff' }} />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Category Comparison: Budget vs Actual */}
                <div className="bg-zinc-950/50 border border-zinc-800 p-6 rounded-2xl lg:col-span-2">
                  <h3 className="text-lg font-bold text-white mb-6">Budget vs. Actual Spending (Last 30 Days)</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={budgetVsActualData}>
                        <XAxis dataKey="name" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                        <Tooltip cursor={{ fill: '#27272a', opacity: 0.4 }} contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px' }} itemStyle={{ color: '#fff' }} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#a1a1aa', paddingTop: '20px' }} />
                        <Bar dataKey="Budgeted" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Actual" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Emergency Fund Calculator */}
                <div className="bg-zinc-950/50 border border-zinc-800 p-6 rounded-2xl flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2">Emergency Fund Calculator</h3>
                    <p className="text-sm text-zinc-500 mb-6">Based on your fixed bills of <span className="text-zinc-300 font-mono">${totalFixedMonthly.toFixed(2)}</span>/mo.</p>
                    
                    <div className="mb-8">
                      <div className="flex justify-between text-xs text-zinc-400 font-bold mb-4">
                        <span>1 Month</span>
                        <span className="text-blue-500 text-lg">{emergencyMonths} Months</span>
                        <span>12 Months</span>
                      </div>
                      <input 
                        type="range" 
                        min="1" 
                        max="12" 
                        value={emergencyMonths} 
                        onChange={(e) => setEmergencyMonths(Number(e.target.value))}
                        className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
                    <p className="text-zinc-500 text-xs uppercase font-bold tracking-widest mb-2">Savings Goal</p>
                    <p className="text-5xl font-bold text-white font-mono">${emergencyGoal.toFixed(2)}</p>
                  </div>
                </div>

                {/* Category Breakdown */}
                <div className="bg-zinc-950/50 border border-zinc-800 p-6 rounded-2xl">
                  <h3 className="text-lg font-bold text-white mb-6">Expenses by Category</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px' }} itemStyle={{ color: '#fff' }} formatter={(val: unknown) => `$${Number(val).toFixed(2)}`} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#a1a1aa' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Fixed vs Variable */}
                <div className="bg-zinc-950/50 border border-zinc-800 p-6 rounded-2xl">
                  <h3 className="text-lg font-bold text-white mb-6">Fixed vs. Variable</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={fixedVsVariableData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {fixedVsVariableData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px' }} itemStyle={{ color: '#fff' }} formatter={(val: unknown) => `$${Number(val).toFixed(2)}`} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#a1a1aa' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>
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
                  <span className="px-3 py-1 bg-blue-500/10 rounded-full text-[10px] text-blue-500 font-bold border border-blue-500/20 uppercase tracking-wider">
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
                          <td className="px-4 py-5 text-right font-bold text-blue-400 font-mono text-lg">
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
                        <td className="px-4 py-6 text-right text-2xl text-blue-400 font-mono">
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

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" onClick={() => setIsImportModalOpen(false)} />
          <div className="relative bg-zinc-900 border border-zinc-800 w-full max-w-4xl rounded-3xl p-8 shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-bold text-white">Import Transactions</h2>
                <p className="text-zinc-500 text-sm">Upload a Chase, Caesars, or generic CSV statement.</p>
              </div>
              <button onClick={() => setIsImportModalOpen(false)} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex flex-col md:flex-row gap-6 mb-8">
              <label 
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    const file = e.dataTransfer.files[0];
                    if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
                      processCSVFile(file);
                    }
                  }
                }}
                className="flex-1 flex flex-col items-center justify-center h-32 border-2 border-zinc-800 border-dashed rounded-2xl cursor-pointer bg-zinc-950 hover:bg-zinc-900 transition-all"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 text-zinc-500 mb-2" />
                  <p className="text-sm text-zinc-500">Click to upload or drag and drop CSV</p>
                </div>
                <input type="file" className="hidden" accept=".csv" onChange={handleFileUpload} />
              </label>

              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-center gap-2">
                <div className="flex items-center gap-3">
                  <input 
                    type="checkbox"
                    id="flip-amounts"
                    checked={flipAmounts}
                    onChange={e => {
                      setFlipAmounts(e.target.checked)
                      // Re-parse if preview exists
                      if (importPreview.length > 0) {
                        setImportPreview(importPreview.map(t => ({ ...t, amount: t.amount * -1 })))
                      }
                    }}
                    className="w-5 h-5 rounded border-zinc-800 bg-zinc-900 text-blue-500 focus:ring-blue-500"
                  />
                  <label htmlFor="flip-amounts" className="text-sm font-medium text-zinc-300 cursor-pointer">
                    Flip Amounts (+/-)
                  </label>
                </div>
                <p className="text-[10px] text-zinc-500 max-w-[200px]">
                  Enable this if charges are imported as positive numbers.
                </p>
              </div>
            </div>

            {importPreview.length > 0 && (
              <div className="flex-1 overflow-hidden flex flex-col">
                <h3 className="text-lg font-bold text-white mb-4">Preview ({importPreview.length} items)</h3>
                <div className="flex-1 overflow-auto border border-zinc-800 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-zinc-900 border-b border-zinc-800">
                      <tr className="text-zinc-500 uppercase tracking-wider">
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Description</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {importPreview.map((t, idx) => (
                        <tr key={idx} className="text-zinc-400">
                          <td className="px-4 py-3 font-mono">{t.transaction_date}</td>
                          <td className="px-4 py-3 truncate max-w-xs">{t.description}</td>
                          <td className="px-4 py-3">{t.category}</td>
                          <td className={`px-4 py-3 text-right font-mono ${t.amount < 0 ? 'text-red-400' : 'text-blue-400'}`}>
                            ${t.amount.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="pt-8 mt-auto">
                  <button 
                    disabled={importLoading}
                    onClick={handleImportTransactions}
                    className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-zinc-950 font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                  >
                    {importLoading ? 'Importing...' : `Confirm Import (${importPreview.length} Transactions)`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Expense Modal (Unchanged) */}
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
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Bi-Weekly Amount</label>
                  <input 
                    type="number"
                    step="0.01"
                    value={formState.bi_weekly_amount}
                    onChange={e => setFormState({ ...formState, bi_weekly_amount: Number(e.target.value) })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Category</label>
                  <select 
                    value={formState.category}
                    onChange={e => setFormState({ ...formState, category: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
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
                  className="w-5 h-5 rounded border-zinc-800 bg-zinc-900 text-blue-500 focus:ring-blue-500"
                />
                <label htmlFor="fixed" className="text-sm font-medium text-zinc-300 cursor-pointer">
                  Mark as Fixed Bill
                  <span className="block text-xs text-zinc-500 font-normal">Fixed bills are used for Emergency Fund calculations.</span>
                </label>
              </div>

              <button 
                type="submit"
                className="w-full bg-blue-500 hover:bg-blue-600 text-zinc-950 font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                {editingExpense ? 'Update Expense' : 'Save Expense'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Smart Rule Modal */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-bold text-white">{editingRule ? 'Edit Category Rule' : 'Create Smart Rule'}</h2>
                <p className="text-sm text-zinc-500 mt-1">
                  Transactions containing this pattern will automatically be categorized.
                </p>
              </div>
              <button onClick={() => setIsRuleModalOpen(false)} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 self-start">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSaveRuleSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Merchant Pattern</label>
                <input 
                  required
                  value={ruleForm.merchant_pattern}
                  onChange={e => setRuleForm({ ...ruleForm, merchant_pattern: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  placeholder="e.g. WAL-MART, CAESARS, NETFLIX"
                />
                <p className="text-xs text-zinc-600 mt-2">
                  Keep it short and general (e.g. use &quot;WAL-MART&quot; instead of &quot;WAL-MART #1234 VEGAS NV&quot;) to match more transactions.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Assign Category</label>
                <select 
                  value={ruleForm.category}
                  onChange={e => setRuleForm({ ...ruleForm, category: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Housing">Housing</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Transportation">Transportation</option>
                  <option value="Food">Food</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Travel">Travel</option>
                  <option value="General">General</option>
                </select>
              </div>

              <button 
                type="submit"
                className="w-full bg-blue-500 hover:bg-blue-600 text-zinc-950 font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                {editingRule ? 'Update Rule' : 'Save Smart Rule'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

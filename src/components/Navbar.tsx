'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Settings, Menu, X, User, LogOut, LayoutDashboard } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function Navbar() {
  const [isGearOpen, setIsGearOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const gearRef = useRef<HTMLDivElement>(null)
  const mobileRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser()
      setUserEmail(user?.email || null)
    }
    getUser()

    // Outside click listener
    function handleClickOutside(event: MouseEvent) {
      if (gearRef.current && !gearRef.current.contains(event.target as Node)) {
        setIsGearOpen(false)
      }
      if (mobileRef.current && !mobileRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (!userEmail) return null

  return (
    <nav className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-24 items-center">
          {/* Left: Logo */}
          <Link href="/" className="flex items-center">
            <Image 
              src="/logo.png" 
              alt="ShoeBudgeting" 
              width={80}
              height={80}
              className="rounded-2xl h-20 w-auto shadow-lg"
            />
          </Link>

          {/* Right: Desktop Icons */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-zinc-400 hover:text-white transition-colors text-sm font-medium">Dashboard</Link>
            
            <div className="relative" ref={gearRef}>
              <button 
                onClick={() => setIsGearOpen(!isGearOpen)}
                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-all"
              >
                <Settings className="w-5 h-5" />
              </button>

              {isGearOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl py-2 overflow-hidden animate-in fade-in zoom-in duration-200">
                  <Link 
                    href="/account" 
                    onClick={() => setIsGearOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
                  >
                    <User className="w-4 h-4 text-blue-500" />
                    Profile
                  </Link>
                  <Link 
                    href="/account#defaults" 
                    onClick={() => setIsGearOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
                  >
                    <Settings className="w-4 h-4 text-blue-500" />
                    Settings
                  </Link>
                  <hr className="border-zinc-800 my-1" />
                  <button 
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right: Mobile Hamburger */}
          <div className="md:hidden" ref={mobileRef}>
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-zinc-400 hover:text-white"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {isMobileMenuOpen && (
              <div className="absolute top-24 left-0 right-0 bg-zinc-900 border-b border-zinc-800 shadow-2xl py-4 px-4 space-y-2">
                <Link 
                  href="/" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 p-3 text-zinc-300 hover:bg-zinc-800 rounded-xl"
                >
                  <LayoutDashboard className="w-5 h-5 text-blue-500" />
                  Dashboard
                </Link>
                <Link 
                  href="/account" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 p-3 text-zinc-300 hover:bg-zinc-800 rounded-xl"
                >
                  <User className="w-5 h-5 text-blue-500" />
                  Profile & Settings
                </Link>
                <button 
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 p-3 text-red-400 hover:bg-red-500/10 rounded-xl"
                >
                  <LogOut className="w-5 h-5" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

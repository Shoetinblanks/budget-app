'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Settings, Menu, X, User, LogOut, LayoutDashboard, LogIn } from 'lucide-react'
import { useSession, signOut } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'

export default function Navbar() {
  const [isGearOpen, setIsGearOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const gearRef = useRef<HTMLDivElement>(null)
  const mobileRef = useRef<HTMLDivElement>(null)
  const { data: session, isPending } = useSession()
  const router = useRouter()

  const userEmail = session?.user?.email || null

  useEffect(() => {
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
  }, [])

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <nav className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          {/* Left: Logo & Brand Name */}
          <Link href="/" className="flex items-center gap-3">
            <Image 
              src="/logo.png" 
              alt="Shoe Budgeting" 
              width={48}
              height={48}
              className="rounded-xl h-12 w-auto shadow-md"
            />
            <span className="font-bold text-xl tracking-tight text-white hidden sm:inline">
              Shoe Budgeting
            </span>
          </Link>

          {/* Right: Desktop Navigation */}
          {userEmail ? (
            <div className="hidden md:flex items-center gap-6">
              <Link href="/dashboard" className="text-zinc-300 hover:text-white transition-colors text-sm font-medium">
                Dashboard
              </Link>
              
              <div className="relative" ref={gearRef}>
                <button 
                  onClick={() => setIsGearOpen(!isGearOpen)}
                  className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-all"
                  aria-label="Settings"
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
          ) : (
            <div className="hidden md:flex items-center gap-6">
              <Link href="/privacy-policy" className="text-zinc-400 hover:text-zinc-200 text-sm font-medium transition-colors">
                Privacy
              </Link>
              <Link href="/terms-of-service" className="text-zinc-400 hover:text-zinc-200 text-sm font-medium transition-colors">
                Terms
              </Link>
              <Link 
                href="/login" 
                className="text-zinc-200 hover:text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-zinc-900 transition-colors"
              >
                Log In
              </Link>
              <Link 
                href="/login?signup=true" 
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-md shadow-blue-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Get Started
              </Link>
            </div>
          )}

          {/* Right: Mobile Hamburger */}
          <div className="md:hidden" ref={mobileRef}>
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-zinc-400 hover:text-white"
              aria-label="Toggle Menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {isMobileMenuOpen && (
              <div className="absolute top-20 left-0 right-0 bg-zinc-900 border-b border-zinc-800 shadow-2xl py-4 px-4 space-y-2">
                {userEmail ? (
                  <>
                    <Link 
                      href="/dashboard" 
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
                  </>
                ) : (
                  <>
                    <Link 
                      href="/login" 
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 p-3 text-zinc-200 hover:bg-zinc-800 rounded-xl font-medium"
                    >
                      <LogIn className="w-5 h-5 text-blue-500" />
                      Log In
                    </Link>
                    <Link 
                      href="/login?signup=true" 
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center justify-center p-3 bg-blue-600 text-white font-semibold rounded-xl"
                    >
                      Get Started
                    </Link>
                    <div className="pt-2 border-t border-zinc-800 flex justify-around text-xs text-zinc-400">
                      <Link href="/privacy-policy" onClick={() => setIsMobileMenuOpen(false)}>Privacy Policy</Link>
                      <Link href="/terms-of-service" onClick={() => setIsMobileMenuOpen(false)}>Terms of Service</Link>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

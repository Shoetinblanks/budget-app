'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, X, LayoutDashboard } from 'lucide-react'
import { SignedIn, SignedOut, UserButton, SignInButton, SignUpButton } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const mobileRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const userEmail = session?.user?.email || null

  useEffect(() => {
    // Outside click listener
    function handleClickOutside(event: MouseEvent) {
      if (mobileRef.current && !mobileRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
          <SignedIn>
            <div className="hidden md:flex items-center gap-6">
              <Link href="/dashboard" className="text-zinc-300 hover:text-white transition-colors text-sm font-medium">
                Dashboard
              </Link>
              
              <UserButton 
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: "w-10 h-10 border-2 border-zinc-800"
                  }
                }}
              />
            </div>
          </SignedIn>
          
          <SignedOut>
            <div className="hidden md:flex items-center gap-6">
              <Link href="/privacy-policy" className="text-zinc-400 hover:text-zinc-200 text-sm font-medium transition-colors">
                Privacy
              </Link>
              <Link href="/terms-of-service" className="text-zinc-400 hover:text-zinc-200 text-sm font-medium transition-colors">
                Terms
              </Link>
              
              <SignInButton mode="modal">
                <button className="text-zinc-200 hover:text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-zinc-900 transition-colors">
                  Log In
                </button>
              </SignInButton>
              
              <SignUpButton mode="modal">
                <button className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-md shadow-blue-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
                  Get Started
                </button>
              </SignUpButton>
            </div>
          </SignedOut>

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
                <SignedIn>
                  <Link 
                    href="/dashboard" 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 p-3 text-zinc-300 hover:bg-zinc-800 rounded-xl"
                  >
                    <LayoutDashboard className="w-5 h-5 text-blue-500" />
                    Dashboard
                  </Link>
                  <div className="flex justify-center p-3">
                    <UserButton afterSignOutUrl="/" />
                  </div>
                </SignedIn>
                
                <SignedOut>
                  <SignInButton mode="modal">
                    <button 
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="w-full text-left flex items-center gap-3 p-3 text-zinc-200 hover:bg-zinc-800 rounded-xl font-medium"
                    >
                      Log In
                    </button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button 
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="w-full flex items-center justify-center p-3 bg-blue-600 text-white font-semibold rounded-xl"
                    >
                      Get Started
                    </button>
                  </SignUpButton>
                  <div className="pt-2 border-t border-zinc-800 flex justify-around text-xs text-zinc-400">
                    <Link href="/privacy-policy" onClick={() => setIsMobileMenuOpen(false)}>Privacy Policy</Link>
                    <Link href="/terms-of-service" onClick={() => setIsMobileMenuOpen(false)}>Terms of Service</Link>
                  </div>
                </SignedOut>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

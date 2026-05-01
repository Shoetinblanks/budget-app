import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="w-full bg-zinc-950 border-t border-zinc-800 py-8 mt-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="text-zinc-500 text-sm text-center md:text-left">
          &copy; {currentYear} ShoeBudgeting. All rights reserved.<br />
          ShoeBudgeting is a service provided by <span className="text-emerald-500 font-medium">Shoetinblanks LLC</span>.
        </div>
        <div className="flex gap-6 text-sm text-zinc-400">
          <Link href="/privacy-policy" className="hover:text-emerald-400 transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms-of-service" className="hover:text-emerald-400 transition-colors">
            Terms of Service
          </Link>
        </div>
      </div>
    </footer>
  );
}

import React from 'react';
import Link from 'next/link';
import { Layout } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full border-t border-black/[0.06] bg-white py-12 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
        {/* Left Branding */}
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#1D1D1F] text-white">
            <Layout className="h-3.5 w-3.5" />
          </div>
          <span className="text-xs font-bold text-[#1D1D1F]">FormFlow Studio</span>
          <span className="text-xs text-[#86868B] ml-2">© {new Date().getFullYear()}</span>
        </div>

        {/* Links */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-[#86868B]">
          <a href="#demo" className="hover:text-[#1D1D1F] transition-colors">
            Product Demo
          </a>
          <a href="#features" className="hover:text-[#1D1D1F] transition-colors">
            Features
          </a>
          <a href="#ai" className="hover:text-[#1D1D1F] transition-colors">
            AI Generation
          </a>
          <a href="#templates" className="hover:text-[#1D1D1F] transition-colors">
            Templates
          </a>
          <Link href="/dashboard" className="hover:text-[#1D1D1F] transition-colors">
            Dashboard
          </Link>
        </div>
      </div>
    </footer>
  );
}

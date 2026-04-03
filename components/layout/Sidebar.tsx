'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';

const NAVIGATION = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊' },
  { name: 'AI Scans', href: '/scans', icon: '🔍' },
  { name: 'Competitors', href: '/competitors', icon: '🎯' },
  { name: 'GEO Audit', href: '/geo-audit', icon: '🗺️' },
  { name: 'Reports', href: '/reports', icon: '📄' },
  { name: 'AI Concierge', href: '/agent', icon: '🤖', badge: 'Enterprise' },
  { name: 'Billing', href: '/billing', icon: '💳' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <div className="w-64 bg-gray-900 text-white flex flex-col">
      {/* Logo */}
      <Link
        href="/dashboard"
        className="px-6 py-6 border-b border-gray-800 hover:bg-gray-800 transition-colors"
      >
        <h1 className="text-xl font-bold">AgenticRev</h1>
        <p className="text-xs text-gray-400 mt-1">AI Visibility Platform</p>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-6">
        <div className="space-y-2">
          {NAVIGATION.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                isActive(item.href)
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{item.icon}</span>
                <span className="text-sm font-medium">{item.name}</span>
              </div>
              {item.badge && (
                <span className="text-xs bg-orange-500 text-white px-2 py-1 rounded">
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
        </div>
      </nav>

      {/* User Section */}
      <div className="border-t border-gray-800 px-3 py-4">
        {session?.user && (
          <div className="mb-4 px-2">
            <p className="text-xs text-gray-400 uppercase font-semibold">Account</p>
            <p className="text-sm text-white mt-2 truncate">{session.user.email}</p>
            <p className="text-xs text-gray-400 mt-1">{session.user.name || 'User'}</p>
          </div>
        )}
        <button
          onClick={async () => {
            setIsSigningOut(true);
            await signOut({ redirect: true, callbackUrl: '/login' });
          }}
          disabled={isSigningOut}
          className="w-full px-4 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
        >
          {isSigningOut ? 'Signing out...' : 'Sign out'}
        </button>
      </div>
    </div>
  );
}

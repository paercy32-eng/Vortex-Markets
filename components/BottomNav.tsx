'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ModulesIcon,
  ReferralsIcon,
  MyModulesIcon,
  ProfileIcon,
} from './icons';

// ==========================================
// TAB CONFIG
// ==========================================
const TABS = [
  { href: '/modules', label: 'Modules', Icon: ModulesIcon },
  { href: '/referrals', label: 'Referrals', Icon: ReferralsIcon },
  { href: '/my-modules', label: 'My Modules', Icon: MyModulesIcon },
  { href: '/profile', label: 'Profile', Icon: ProfileIcon },
];

// ==========================================
// BOTTOM NAV
// ==========================================
export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-md mx-auto grid grid-cols-4">
        {TABS.map(({ href, label, Icon }) => {
          const isActive =
            pathname === href || pathname.startsWith(href + '/');

          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-1 py-3 transition ${
                isActive ? 'text-primary' : 'text-muted'
              }`}
            >
              <Icon size={22} />
              <span className="text-[11px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

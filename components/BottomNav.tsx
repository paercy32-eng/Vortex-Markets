'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ModulesIcon,
  MyModulesIcon,
  ReferralsIcon,
  ProfileIcon,
} from './icons';

// Tab order: Modules → My Modules → Referrals → Profile
const TABS = [
  { href: '/modules', label: 'Modules', Icon: ModulesIcon },
  { href: '/my-modules', label: 'My Modules', Icon: MyModulesIcon },
  { href: '/referrals', label: 'Referrals', Icon: ReferralsIcon },
  { href: '/profile', label: 'Profile', Icon: ProfileIcon },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-primary border-t border-primaryDark pb-[env(safe-area-inset-bottom)] shadow-lg">
      <div className="max-w-md mx-auto grid grid-cols-4">
        {TABS.map(({ href, label, Icon }) => {
          const isActive =
            pathname === href || pathname.startsWith(href + '/');

          return (
            <Link
              key={href}
              href={href}
              className={`relative flex flex-col items-center justify-center gap-1 py-3 transition ${
                isActive ? 'text-[#FFFFFF]' : 'text-[#FFFFFF]/60'
              }`}
            >
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#FFFFFF] rounded-full" />
              )}
              <Icon size={22} />
              <span className="text-[11px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

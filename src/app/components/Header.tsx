import { Menu, Bell, Settings, Search } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type User = {
  name?: string;
  profile?: {
    photo?: string | null;
    name?: string;
  };
};

const Header = ({
  setSidebarOpen,
}: {
  setSidebarOpen: (open: boolean) => void;
}) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        console.warn('Invalid user in localStorage');
      }
    }
  }, []);

  const getInitials = (name?: string) => {
    if (!name) return 'A';
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (
      parts[0].charAt(0).toUpperCase() +
      parts[parts.length - 1].charAt(0).toUpperCase()
    );
  };

  const photo = user?.profile?.photo ?? null;
  const initials = getInitials(user?.profile?.name);

  return (
    <header className="sticky top-0 bg-white border-b border-gray-300 flex items-center justify-between px-4 py-3 z-50">
      {/* Left: Menu button and logo */}
      <div className="flex items-center gap-3">
        <button className="md:hidden" onClick={() => setSidebarOpen(true)}>
          <Menu className="w-6 h-6 text-gray-700" />
        </button>
        <Link href="/" className="flex items-center gap-1 md:hidden">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-blue-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <circle cx="12" cy="12" r="10" strokeWidth="2" />
            <circle cx="12" cy="12" r="3" strokeWidth="2" />
            <path
              d="M12 2v2m0 16v2m10-10h-2M4 12H2m15.364-7.364l-1.414 1.414M6.05 17.95l-1.414 1.414m12.728 0l1.414-1.414M6.05 6.05L4.636 7.464"
              strokeWidth="2"
            />
          </svg>
          <span className="font-bold text-blue-600 text-lg">iTrack</span>
        </Link>
      </div>

      {/* Right: Search and icons */}
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center bg-gray-100 px-3 py-1 rounded-full">
          <Search className="w-4 h-4 text-gray-500 mr-2" />
          <input
            type="text"
            placeholder="Search for something"
            className="bg-transparent focus:outline-none text-sm w-36"
          />
        </div>

        <div className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 shadow-sm button-click-effect">
          <Settings className="w-5 h-5 text-blue-500" />
        </div>

        <div className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 shadow-sm button-click-effect">
          <Bell className="w-5 h-5 text-orange-500" />
        </div>

        {/* Avatar Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Avatar className="cursor-pointer button-click-effect">
              {photo ? (
                <AvatarImage src={photo} alt={user?.name || 'User'} />
              ) : (
                <AvatarFallback>{initials}</AvatarFallback>
              )}
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Link href="/profile" className="w-full">
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Link href="/settings" className="w-full">
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Link href="/logout" className="w-full text-red-600">
                Logout
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Header;

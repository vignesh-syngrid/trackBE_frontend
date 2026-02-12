'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import {
  Home,
  FileText,
  CalendarDays,
  LogOut,
  Settings,
  ListTree,
  Globe,
  Briefcase,
  Clock9,
  X,
  ChevronsLeft,
  ChevronsRight,
  Hammer,
  CheckCircle,
  CreditCard,
  Building2,
  Wrench,
  Building,
  Truck,
  User,
  Users,
  Flag,
  Map,
  MapPin,
  Hash,
  LucideIcon,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type SidebarLink = {
  name: string;
  href: string;
  icon: LucideIcon;
  permScreen?: string | null;
};

const Sidebar = ({
  sidebarOpen,
  setSidebarOpen,
}: {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}) => {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const primaryColor = useSelector((state: RootState) => state.ui.primaryColor);

  const [companyData, setCompanyData] = useState<{
    name: string;
    logo: string;
  }>({
    name: 'Company',
    logo: '/assets/default-company-logo.svg',
  });

  // Get user info from localStorage
  const user =
    typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem('user') || '{}')
      : null;
  const userRole = user?.role?.slug;

  // Load user info once
  useEffect(() => {
    const storedUser =
      typeof window !== 'undefined'
        ? JSON.parse(localStorage.getItem('user') || '{}')
        : null;

    const roleSlug = storedUser?.role?.slug;

    if (roleSlug === 'super_admin') {
      setCompanyData({ name: 'Syngrid', logo: '/assets/syngrid_logo.png' });
    } else if (roleSlug === 'vendor' || roleSlug === 'supervisor') {
      // Use vendor profile for name/logo
      setCompanyData({
        name: storedUser?.profile?.vendor_name || 'Vendor',
        logo: storedUser?.profile?.photo || '/assets/default-company-logo.svg',
      });
    } else if (storedUser?.profile) {
      setCompanyData({
        name: storedUser.profile.company_name || 'Company',
        logo: storedUser.profile.logo || '/assets/default-company-logo.svg',
      });
    }
  }, []);

  const rawMainLinks: SidebarLink[] = [
    { name: 'Dashboard', href: '/', icon: Home, permScreen: null },
    {
      name: 'Manage Jobs',
      href: '/jobs',
      icon: FileText,
      permScreen: 'Manage Job',
    },
    {
      name: 'Attendance',
      href: '/attendance',
      icon: CalendarDays,
      permScreen: 'Attendance',
    },
  ];

  const rawMasterLinks: SidebarLink[] = [
    { name: 'Nature of Works', href: '/nature-of-work', icon: Hammer },
    { name: 'Job Statuses', href: '/job-statuses', icon: CheckCircle },
    {
      name: 'Subscription Types',
      href: '/subscription-types',
      icon: CreditCard,
    },
    { name: 'Business Types', href: '/business-types', icon: Building2 },
    { name: 'Work Type', href: '/work-type', icon: Wrench },
    {
      name: 'Job Type',
      href: '/job-type',
      icon: ListTree,
      permScreen: 'Job Type',
    },
    { name: 'Region', href: '/region', icon: Globe, permScreen: 'Region' },
    { name: 'Role', href: '/role', icon: Briefcase, permScreen: 'Roles' },
    { name: 'Shift', href: '/shift', icon: Clock9, permScreen: 'Shift' },
    {
      name: 'Settings',
      href: '/settings',
      icon: Settings,
      permScreen: 'Settings',
    },
    {
      name: 'Company',
      href: '/company',
      icon: Building,
      permScreen: 'Company',
    },
    { name: 'Vendor', href: '/vendor', icon: Truck },
    { name: 'User', href: '/user', icon: User },
    { name: 'Client', href: '/client', icon: Users },
  ];

  const rawSettingLinks: SidebarLink[] = [
    { name: 'Country', href: '/countries', icon: Flag, permScreen: 'Company' },
    { name: 'State', href: '/states', icon: Map },
    { name: 'District', href: '/districts', icon: MapPin },
    { name: 'Pincode', href: '/pincodes', icon: Hash },
  ];

  const filterLinksByUser = (links: SidebarLink[]) => {
    if (userRole === 'super_admin') return links; // show all
    if (userRole === 'vendor' || userRole === 'supervisor--dispatcher') {
      // Only show these links for vendor
      const allowedNames = [
        'Dashboard',
        'Manage Jobs',
        'Attendance',
        'Work Type',
        'Job Type',
        'Region',
        'User',
        'Client',
      ];
      return links.filter((l) => allowedNames.includes(l.name));
    }
    // Default for other roles (e.g., supervisor)
    const allowedNames = [
      'Dashboard',
      'Manage Jobs',
      'Attendance',
      'Work Type',
      'Job Type',
      'Region',
       'Shift',
      'Vendor',
      'User',
      'Client',
    ];
    return links.filter((l) => allowedNames.includes(l.name));
  };

  const mainLinks = filterLinksByUser(rawMainLinks);
  const masterLinks = filterLinksByUser(rawMasterLinks);
  const settingLinks = filterLinksByUser(rawSettingLinks);

  const renderLink = (link: SidebarLink) => {
    const isActive = pathname === link.href;
    const iconStyle = isActive ? primaryColor : '#9ca3af';

    return collapsed ? (
      <Tooltip key={link.name}>
        <TooltipTrigger asChild>
          <Link
            href={link.href}
            className="relative flex items-center justify-center py-2 hover:bg-gray-100 transition"
          >
            {isActive && (
              <span
                className="absolute left-0 top-1 bottom-1 w-1 rounded-r-2xl"
                style={{ backgroundColor: primaryColor }}
              />
            )}
            <link.icon className="w-5 h-5" style={{ color: iconStyle }} />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right">{link.name}</TooltipContent>
      </Tooltip>
    ) : (
      <Link
        key={link.name}
        href={link.href}
        className={`group relative flex items-center gap-3 py-2 pl-4 pr-4 transition font-small ${
          isActive
            ? 'bg-white font-semibold'
            : 'text-white hover:bg-[#0f2770]'
        }`}
      >
        {isActive && (
          <span
            className="absolute top-1 bottom-1 left-0 w-1 rounded-r-2xl"
            style={{ backgroundColor: primaryColor }}
          />
        )}
        <link.icon className="w-5 h-5" style={{ color: iconStyle }} />
        <span
          className="truncate"
          style={{
            // color: isActive ? primaryColor : undefined,
              color: isActive ? '#1e3fad' : undefined,
            transition: 'all 0.2s ease',
          }}
        >
          {link.name}
        </span>
      </Link>
    );
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-[rgba(0,0,0,0.4)] z-40 transition-opacity duration-300 ${
          sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        } md:hidden`}
        onClick={() => setSidebarOpen(false)}
      />

      <TooltipProvider>
        <aside
          className={`fixed inset-0 md:inset-y-0 md:left-0 z-100 bg-white shadow-sm text-gray-700 border-r border-gray-200 flex flex-col transform
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          ${collapsed ? 'w-16' : 'w-64'}
          transition-all duration-300 ease-in-out md:relative md:translate-x-0 md:flex-shrink-0`}
        >
          {/* Mobile close button */}
          <div className="flex items-center justify-between px-4 py-4 md:hidden">
            <h2 className="text-lg font-semibold">Menu</h2>
            <button onClick={() => setSidebarOpen(false)}>
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Logo */}
          <div
            className={`px-4 py-5 hidden md:flex items-center gap-3 ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <Image
              src={companyData.logo || '/assets/default-company-logo.svg'}
              alt={companyData.name || 'Company'}
              width={30}
              height={30}
              className="min-w-[30px] object-contain"
              unoptimized
            />
            {!collapsed && (
              <span
                className="font-bold text-600 text-xl"
                style={{ color: '#1e3fad' }}
              >
                {companyData.name}
              </span>
            )}
          </div>

          {/* Links */}
          <nav className="flex-1 overflow-y-auto pb-4 space-y-2" style={{backgroundColor: '#1e3fad'}}>
            {mainLinks.map(renderLink)}

            {masterLinks.length > 0 && !collapsed && (
              <div className="text-xs font-semibold text-white px-4 pt-4">
                MASTER
              </div>
            )}
            {masterLinks.length > 0 && (
              <hr className="border-t border-gray-200 mx-4 my-2" />
            )}
            {masterLinks.map(renderLink)}

            {settingLinks.length > 0 && !collapsed && (
              <div className="text-xs font-semibold text-white px-4 pt-4">
                SETTINGS
              </div>
            )}
            {settingLinks.length > 0 && (
              <hr className="border-t border-gray-200 mx-4 my-2" />
            )}
            {settingLinks.map(renderLink)}
          </nav>

          {/* Logout */}
          <div className="border-t" style={{backgroundColor: '#1e3fad'}}>
            {renderLink({ name: 'Logout', href: '/logout', icon: LogOut })}
          </div>

          {/* Collapse button */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="absolute -right-3 rounded-lg top-3 hidden md:flex items-center justify-center p-1 bg-gray-200 hover:bg-gray-100 transition"
          >
            {collapsed ? (
              <ChevronsRight className="w-5 h-5 text-white-500" />
            ) : (
              <ChevronsLeft className="w-5 h-5 text-white-500" />
            )}
          </button>
        </aside>
      </TooltipProvider>
    </>
  );
};

export default Sidebar;

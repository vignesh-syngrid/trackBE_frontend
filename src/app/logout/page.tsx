'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    // ✅ Clear localStorage
    localStorage.clear();

    // ✅ Redirect to login
    router.push('/login');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-gray-600">Logging out...</p>
    </div>
  );
}

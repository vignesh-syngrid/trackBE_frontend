'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/utils/AuthContext';
import AdminLayout from '../components/AdminLayout';
import { setPrimaryColor } from '@/store/slices/uiSlice';
import { useDispatch } from 'react-redux';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const dispatch = useDispatch();

  useEffect(() => {
    const color = localStorage.getItem('primaryColor');
    if (color) dispatch(setPrimaryColor(color));
  }, []);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, loading]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return <AdminLayout> {children}</AdminLayout>;
}

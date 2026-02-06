'use client';

import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setPermissions } from '@/store/slices/permissionSlice';

export default function AppHydration() {
  const dispatch = useDispatch();

  useEffect(() => {
    const stored =
      typeof window !== 'undefined' && localStorage.getItem('permissions');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          dispatch(setPermissions(parsed));
        }
      } catch (error) {
        console.error('Failed to parse permissions:', error);
      }
    }
  }, []);

  return null;
}

'use client';

import { Provider as ReduxProvider } from 'react-redux';
import { store } from '@/store/store';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/utils/AuthContext';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ReduxProvider store={store}>
      <AuthProvider>
        <Toaster position="top-right" richColors />
        {children}
      </AuthProvider>
    </ReduxProvider>
  );
}

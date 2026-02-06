import { configureStore } from '@reduxjs/toolkit';
import uiReducer from './slices/uiSlice';
import permissionReducer from './slices/permissionSlice';

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    permissions: permissionReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

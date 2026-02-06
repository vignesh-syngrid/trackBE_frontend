import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Permission {
  screen: string;
  view: boolean;
  add: boolean;
  edit: boolean;
  delete: boolean;
}

interface PermissionState {
  list: Permission[];
}

const initialState: PermissionState = { list: [] };

const permissionSlice = createSlice({
  name: 'permissions',
  initialState,
  reducers: {
    setPermissions: (state, action: PayloadAction<Permission[]>) => {
      state.list = action.payload;
    },
    clearPermissions: (state) => {
      state.list = [];
    },
  },
});

export const { setPermissions, clearPermissions } = permissionSlice.actions;
export default permissionSlice.reducer;

export const selectPermissions = (s: { permissions: PermissionState }) =>
  s.permissions.list;

export const selectByScreen =
  (screen: string) => (s: { permissions: PermissionState }) =>
    s.permissions.list.find((p) => p.screen === screen);

export const canView =
  (screen: string) => (s: { permissions: PermissionState }) =>
    !!s.permissions.list.find((p) => p.screen === screen)?.view;

export const canAdd =
  (screen: string) => (s: { permissions: PermissionState }) =>
    !!s.permissions.list.find((p) => p.screen === screen)?.add;

export const canEdit =
  (screen: string) => (s: { permissions: PermissionState }) =>
    !!s.permissions.list.find((p) => p.screen === screen)?.edit;

export const canDelete =
  (screen: string) => (s: { permissions: PermissionState }) =>
    !!s.permissions.list.find((p) => p.screen === screen)?.delete;

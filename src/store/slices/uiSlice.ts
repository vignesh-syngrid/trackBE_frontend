import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  primaryColor: string;
}

const initialState: UIState = {
  primaryColor: '#2563eb', // default primary color
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setPrimaryColor: (state, action: PayloadAction<string>) => {
      state.primaryColor = action.payload;
      if (typeof window !== 'undefined') {
        localStorage.setItem('primaryColor', action.payload);
      }
    },
    loadPrimaryColor: (state) => {
      if (typeof window !== 'undefined') {
        const color = localStorage.getItem('primaryColor');
        if (color) {
          state.primaryColor = color;
        }
      }
    },
  },
});

export const { setPrimaryColor, loadPrimaryColor } = uiSlice.actions;
export default uiSlice.reducer;

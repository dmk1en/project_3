import { configureStore } from '@reduxjs/toolkit';
import authReducer from './features/auth/authSlice';
import pdlReducer from './features/pdl/pdlSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    pdl: pdlReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

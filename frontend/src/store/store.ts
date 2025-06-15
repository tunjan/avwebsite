import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({
    serializableCheck: {
      // Ignore these action types, useful for non-serializable payloads like File objects if needed
      // ignoredActions: ['your/action/type'],
      // Ignore these field paths in all actions
      ignoredActionPaths: ['meta.arg', 'payload.timestamp'],
      // Ignore these paths in the state
      ignoredPaths: ['items.dates'],
    },
  }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
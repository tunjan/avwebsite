import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from '../api/axiosConfig';

// --- THIS IS THE CORRECTED INTERFACE ---
// It now includes all properties of the user object from the backend.
interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    managedRegionId: string | null; // <-- ADDED THIS PROPERTY
    memberships: { teamId: string }[];
}

interface AuthState {
    user: User | null;
    token: string | null;
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
}

const initialState: AuthState = {
    user: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null,
    token: localStorage.getItem('token'),
    status: 'idle',
};

interface LoginPayload {
    user: User;
    token: string;
}

export const login = createAsyncThunk(
    'auth/login',
    async (credentials: any) => {
        const response = await axios.post('/api/auth/login', credentials);
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        return response.data;
    }
);

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        logout: (state) => {
            state.user = null;
            state.token = null;
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(login.pending, (state) => {
                state.status = 'loading';
            })
            .addCase(
                login.fulfilled,
                (state, action: PayloadAction<LoginPayload>) => {
                    state.status = 'succeeded';
                    state.user = action.payload.user;
                    state.token = action.payload.token;
                }
            )
            .addCase(login.rejected, (state) => {
                state.status = 'failed';
            });
    },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;
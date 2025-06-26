import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios, { type AxiosError } from '../api/axiosConfig';

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    managedRegionId: string | null;
    memberships: { chapterId: string, role: string }[];
}

interface AuthState {
    user: User | null;
    token: string | null;
    error: string | null;
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
}

const initialState: AuthState = {
    user: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null,
    token: localStorage.getItem('token'),
    error: null,
    status: 'idle',
};

interface LoginPayload {
    user: User;
    token: string;
}

interface LoginCredentials {
    email: string;
    password: string;
}

export const login = createAsyncThunk<LoginPayload, LoginCredentials, { rejectValue: string }>(
    'auth/login',
    async (credentials, thunkAPI) => {
        try {
            const response = await axios.post('/api/auth/login', credentials);
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            return response.data;
        } catch (error) {
            const err = error as AxiosError<{ message: string }>;
            const message = err.response?.data?.message || err.message || "An unknown error occurred";
            return thunkAPI.rejectWithValue(message);
        }
    }
);

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        logout: (state) => {
            state.user = null;
            state.token = null;
            state.error = null;
            state.status = 'idle';
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(login.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(login.fulfilled, (state, action: PayloadAction<LoginPayload>) => {
                state.status = 'succeeded';
                state.user = action.payload.user;
                state.token = action.payload.token;
                state.error = null;
            })
            .addCase(login.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload ?? 'Failed to login';
            });
    },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { authApi, User } from '../../api';
import { StorageService } from '../../services/storage.service';
import { NotificationService } from '../../services/notification.service';
import { getAuthErrorMessage } from '../../utils/authErrors';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  pendingUserId: string | null;
  devOtp: string | null;
  error: string | null;
}

const initialState: AuthState = {
  isAuthenticated: !!StorageService.getAccessToken(),
  isLoading: true,
  user: null,
  pendingUserId: null,
  devOtp: null,
  error: null,
};

export const bootstrapAuth = createAsyncThunk('auth/bootstrap', async () => {
  if (!StorageService.getAccessToken()) return null;
  const res = await authApi.getMe();
  await NotificationService.syncStoredPushToken();
  return res.data as User;
});

export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ identifier, password }: { identifier: string; password: string }, { rejectWithValue }) => {
    try {
      const res = await NotificationService.registerPushTokenOnLogin(identifier, password);
      const { user, tokens } = res.data;
      StorageService.setTokens(tokens.accessToken, tokens.refreshToken);
      await NotificationService.syncStoredPushToken();
      return user as User;
    } catch (err) {
      return rejectWithValue(err);
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async (data: { username: string; email: string; password: string }, { rejectWithValue }) => {
    try {
      const res = await authApi.register({ ...data, registrationMethod: 'email' });
      return res.data;
    } catch (err) {
      return rejectWithValue(err);
    }
  }
);

export const verifyOtp = createAsyncThunk(
  'auth/verifyOtp',
  async ({ userId, otp }: { userId: string; otp: string }, { rejectWithValue }) => {
    try {
      const res = await authApi.verifyOtp({ userId, otp, purpose: 'registration' });
      const { user, tokens } = res.data;
      StorageService.setTokens(tokens.accessToken, tokens.refreshToken);
      return user as User;
    } catch (err) {
      return rejectWithValue(err);
    }
  }
);

export const logoutUser = createAsyncThunk('auth/logout', async () => {
  try {
    await authApi.logout();
  } catch {
    // Ignore logout errors and clear local auth state anyway.
  } finally {
    StorageService.clearAll();
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(bootstrapAuth.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(bootstrapAuth.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload) {
          state.isAuthenticated = true;
          state.user = action.payload;
        } else {
          state.isAuthenticated = false;
        }
      })
      .addCase(bootstrapAuth.rejected, (state) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        StorageService.clearAll();
      })
      .addCase(loginUser.pending, (state) => {
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isAuthenticated = true;
        state.user = action.payload;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.error = getAuthErrorMessage(action.payload, 'Login failed');
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.pendingUserId = action.payload.userId;
        state.devOtp = action.payload.devOtp || null;
      })
      .addCase(verifyOtp.fulfilled, (state, action) => {
        state.isAuthenticated = true;
        state.user = action.payload;
        state.pendingUserId = null;
        state.devOtp = null;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.user = null;
      })
      .addCase(logoutUser.rejected, (state) => {
        state.isAuthenticated = false;
        state.user = null;
      });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;

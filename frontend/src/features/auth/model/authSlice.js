import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { registerApi, loginApi, meApi } from "@/features/auth/api/authApi";
import { setAccessToken, clearSession, getAccessToken } from "@/utils/helpers/storage";

export const register = createAsyncThunk("auth/register", async (payload, { rejectWithValue }) => {
  try {
    const data = await registerApi(payload);
    if (data?.access_token) {
      setAccessToken(data.access_token);
    }
    return data;
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const login = createAsyncThunk("auth/login", async (payload, { rejectWithValue }) => {
  try {
    const data = await loginApi(payload);
    setAccessToken(data.access_token);
    return data;
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const fetchCurrentUser = createAsyncThunk("auth/fetchCurrentUser", async (_, { rejectWithValue }) => {
  try {
    const data = await meApi();
    return data;
  } catch (error) {
    return rejectWithValue(error);
  }
});

const initialState = {
  user: null,
  roles: [],
  isAuthenticated: Boolean(getAccessToken()),
  status: "idle",
  registerStatus: "idle",
  registrationSuccess: false,
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout(state) {
      clearSession();
      state.user = null;
      state.roles = [];
      state.isAuthenticated = false;
      state.status = "idle";
      state.registerStatus = "idle";
      state.registrationSuccess = false;
      state.error = null;
    },
    clearAuthFeedback(state) {
      state.error = null;
      state.registrationSuccess = false;
      state.registerStatus = "idle";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(register.pending, (state) => {
        state.registerStatus = "loading";
        state.error = null;
        state.registrationSuccess = false;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.registerStatus = "succeeded";
        state.registrationSuccess = true;
        state.error = null;

        // Some backends return an authenticated session right after register.
        if (action.payload?.access_token && action.payload?.user) {
          state.user = action.payload.user;
          state.roles = action.payload.user.roles || [];
          state.isAuthenticated = true;
          state.status = "succeeded";
        }
      })
      .addCase(register.rejected, (state, action) => {
        clearSession();
        state.registerStatus = "failed";
        state.registrationSuccess = false;
        state.error = action.payload?.message || "Inscription impossible";
      })
      .addCase(login.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.user = action.payload.user;
        state.roles = action.payload.user?.roles || [];
        state.isAuthenticated = true;
      })
      .addCase(login.rejected, (state, action) => {
        clearSession();
        state.status = "failed";
        state.error = action.payload?.message || "Erreur de connexion";
        state.user = null;
        state.roles = [];
        state.isAuthenticated = false;
      })
      .addCase(fetchCurrentUser.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.error = null;
        state.user = action.payload;
        state.roles = action.payload?.roles || [];
        state.isAuthenticated = true;
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        clearSession();
        state.status = "failed";
        state.error = action.payload?.statusCode === 401 ? null : action.payload?.message || null;
        state.user = null;
        state.roles = [];
        state.isAuthenticated = false;
      })
      .addMatcher(
        (action) => action.type.endsWith("/rejected") && action.payload?.statusCode === 401,
        (state) => {
          clearSession();
          state.user = null;
          state.roles = [];
          state.isAuthenticated = false;
        }
      );
  },
});

export const { logout, clearAuthFeedback } = authSlice.actions;
export default authSlice.reducer;

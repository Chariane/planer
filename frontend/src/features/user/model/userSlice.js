import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { fetchUsersApi } from "@/features/user/api/userApi";

export const fetchUsers = createAsyncThunk("user/fetchAll", async (_, { rejectWithValue }) => {
  try {
    return await fetchUsersApi();
  } catch (error) {
    return rejectWithValue(error);
  }
});

const userSlice = createSlice({
  name: "user",
  initialState: {
    items: [],
    status: "idle",
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload?.message || "Erreur chargement utilisateurs";
      });
  },
});

export default userSlice.reducer;

import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { fetchWorkspacesApi } from "@/features/workspace/api/workspaceApi";

export const fetchWorkspaces = createAsyncThunk("workspace/fetchAll", async (_, { rejectWithValue }) => {
  try {
    return await fetchWorkspacesApi();
  } catch (error) {
    return rejectWithValue(error);
  }
});

const workspaceSlice = createSlice({
  name: "workspace",
  initialState: {
    items: [],
    activeWorkspaceId: null,
    status: "idle",
    error: null,
  },
  reducers: {
    setActiveWorkspace(state, action) {
      state.activeWorkspaceId = String(action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWorkspaces.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchWorkspaces.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
        if (!state.activeWorkspaceId && action.payload.length > 0) {
          state.activeWorkspaceId = String(action.payload[0].id);
        }
      })
      .addCase(fetchWorkspaces.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload?.message || "Impossible de charger les workspaces";
      });
  },
});

export const { setActiveWorkspace } = workspaceSlice.actions;
export default workspaceSlice.reducer;

import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { fetchTasksByProjectApi } from "@/features/task/api/taskApi";

export const fetchTasksByProject = createAsyncThunk("task/fetchByProject", async (projectId, { rejectWithValue }) => {
  try {
    return await fetchTasksByProjectApi(projectId);
  } catch (error) {
    return rejectWithValue(error);
  }
});

const taskSlice = createSlice({
  name: "task",
  initialState: {
    items: [],
    status: "idle",
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTasksByProject.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchTasksByProject.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchTasksByProject.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload?.message || "Erreur chargement tâches";
      });
  },
});

export default taskSlice.reducer;

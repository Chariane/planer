import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { fetchProjectDetailsApi, fetchProjectsByWorkspaceApi } from "@/features/project/api/projectApi";

export const fetchProjectsByWorkspace = createAsyncThunk(
  "project/fetchByWorkspace",
  async (workspaceId, { rejectWithValue }) => {
    try {
      return await fetchProjectsByWorkspaceApi(workspaceId);
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const fetchProjectDetails = createAsyncThunk("project/fetchDetails", async (projectId, { rejectWithValue }) => {
  try {
    return await fetchProjectDetailsApi(projectId);
  } catch (error) {
    return rejectWithValue(error);
  }
});

const projectSlice = createSlice({
  name: "project",
  initialState: {
    items: [],
    currentProject: null,
    status: "idle",
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProjectsByWorkspace.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchProjectsByWorkspace.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchProjectsByWorkspace.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload?.message || "Erreur chargement projets";
      })
      .addCase(fetchProjectDetails.fulfilled, (state, action) => {
        state.currentProject = action.payload;
      });
  },
});

export default projectSlice.reducer;

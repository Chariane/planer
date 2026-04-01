import { combineReducers } from "@reduxjs/toolkit";
import authReducer from "@/features/auth/model/authSlice";
import workspaceReducer from "@/features/workspace/model/workspaceSlice";
import projectReducer from "@/features/project/model/projectSlice";
import taskReducer from "@/features/task/model/taskSlice";
import userReducer from "@/features/user/model/userSlice";

const rootReducer = combineReducers({
  auth: authReducer,
  workspace: workspaceReducer,
  project: projectReducer,
  task: taskReducer,
  user: userReducer,
});

export default rootReducer;

import { lazy } from "react";

export const LoginPage = lazy(() => import("@/pages/auth/LoginPage"));
export const RegisterPage = lazy(() => import("@/pages/auth/RegisterPage"));
export const DashboardPage = lazy(() => import("@/pages/dashboard/DashboardPage"));
export const WorkspacePage = lazy(() => import("@/pages/workspace/WorkspacePage"));
export const ProjectDetailsPage = lazy(() => import("@/pages/project/ProjectDetailsPage"));
export const TaskBoardPage = lazy(() => import("@/pages/task/TaskBoardPage"));
export const UserManagementPage = lazy(() => import("@/pages/admin/UserManagementPage"));
export const ForbiddenPage = lazy(() => import("@/pages/ForbiddenPage"));
export const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));

export const ENDPOINTS = {
  auth: {
    register: "/auth/register",
    login: "/auth/login",
    me: "/auth/me",
    updateMe: "/auth/me",
    logout: "/auth/logout",
  },
  workspace: {
    list: "/workspaces",
    details: (workspaceId) => `/workspaces/${workspaceId}`,
  },
  project: {
    byWorkspace: (workspaceId) => `/workspaces/${workspaceId}/projects`,
    details: (projectId) => `/projects/${projectId}`,
  },
  task: {
    byProject: (projectId) => `/projects/${projectId}/tasks`,
    update: (taskId) => `/tasks/${taskId}`,
  },
  user: {
    list: "/users",
    details: (userId) => `/users/${userId}`,
  },
};

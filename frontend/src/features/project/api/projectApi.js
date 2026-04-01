import { apiClient } from "@/services/http/apiClient";
import { ENDPOINTS } from "@/services/endpoints";

export async function fetchProjectsByWorkspaceApi(workspaceId) {
  const { data } = await apiClient.get(ENDPOINTS.project.byWorkspace(workspaceId));
  return data;
}

export async function fetchProjectDetailsApi(projectId) {
  const { data } = await apiClient.get(ENDPOINTS.project.details(projectId));
  return data;
}

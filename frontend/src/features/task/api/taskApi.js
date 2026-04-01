import { apiClient } from "@/services/http/apiClient";
import { ENDPOINTS } from "@/services/endpoints";

export async function fetchTasksByProjectApi(projectId) {
  const { data } = await apiClient.get(ENDPOINTS.task.byProject(projectId));
  return data;
}

export async function updateTaskApi(taskId, payload) {
  const { data } = await apiClient.patch(ENDPOINTS.task.update(taskId), payload);
  return data;
}

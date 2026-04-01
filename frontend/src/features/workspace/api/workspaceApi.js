import { apiClient } from "@/services/http/apiClient";
import { ENDPOINTS } from "@/services/endpoints";

export async function fetchWorkspacesApi() {
  const { data } = await apiClient.get(ENDPOINTS.workspace.list);
  return data;
}

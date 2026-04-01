import { AppError } from "@/errors/AppError";

export function mapApiError(error) {
  if (error instanceof AppError) {
    return error;
  }

  const statusCode = error?.response?.status || 500;
  const detail = error?.response?.data?.detail;
  const message =
    typeof detail === "string"
      ? detail
      : error?.response?.data?.message || "Erreur serveur. Merci de réessayer.";

  return new AppError(message, statusCode, error?.response?.data || null);
}

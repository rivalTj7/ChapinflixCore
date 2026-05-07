export const API_BASE = "http://34.135.146.173.nip.io";

interface ApiErrorDetail {
  msg: string;
  type: string;
  loc: (string | number)[];
}

interface ApiErrorResponse {
  detail?: ApiErrorDetail[] | string;
  message?: string;
}

export const handleApiError = (data: ApiErrorResponse): string => {
  if (data.detail && Array.isArray(data.detail)) {
    return data.detail.map((err: ApiErrorDetail) => err.msg).join(", ");
  }
  return data.message || (typeof data.detail === 'string' ? data.detail : "Ocurrió un error inesperado");
};
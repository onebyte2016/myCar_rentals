import apiService from "./apiService";

export async function logoutApi(refreshToken: string) {
  // NEXT_PUBLIC_API_HOST already includes the /core/v1 prefix, and
  // apiService.post JSON.stringifies the body itself — passing an
  // already-stringified body here double-encoded it and the extra
  // "/api/v1" segment 404'd, so the backend never blacklisted the token.
  return apiService.post("/user/logout/", { refresh: refreshToken });
}

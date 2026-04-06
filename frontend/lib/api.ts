const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:8080"

type ApiFetchOptions = RequestInit & {
  redirectOnUnauthorized?: boolean
}

export async function apiFetch(
  path: string,
  options: ApiFetchOptions = {}
) {
  const { headers, redirectOnUnauthorized = true, ...rest } = options

  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    ...rest,
  })

  if (response.status === 401 && redirectOnUnauthorized && typeof window !== "undefined") {
    window.location.href = "/auth/login"
  }

  return response
}

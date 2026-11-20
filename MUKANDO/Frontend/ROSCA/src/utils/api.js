
export const API_URL = "http://localhost:5000";

export function getToken() {
    return (
        sessionStorage.getItem("rosca_token") ||
        localStorage.getItem("rosca_token")
    );
}

export async function apiRequest(path, options = {}) {
    const token = getToken();

    const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            ...(options.body
                ? { "Content-Type": "application/json" }
                : {}),
            ...(token
                ? { Authorization: `Bearer ${token}` }
                : {}),
            ...options.headers
        }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(
            data.message || `Request failed (${response.status})`
        );
    }

    return data;
}

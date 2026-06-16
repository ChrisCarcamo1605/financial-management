// Shared mutable store for the in-memory access token.
// AuthContext writes here; api.js interceptors read from here.
// Never put this value in localStorage or sessionStorage.
const authStore = { accessToken: null };

export default authStore;

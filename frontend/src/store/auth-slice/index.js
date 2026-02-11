import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../../utils/axiosInstance"; // <- relative import to axiosinstance

/* -----------------------------------------------------------
   ✅ Safe localStorage parsing (prevents "null"/invalid JSON)
----------------------------------------------------------- */
let storedUser = null;
try {
  const raw = localStorage.getItem("user");
  storedUser = raw ? JSON.parse(raw) : null;
} catch {
  storedUser = null;
}

const storedToken = localStorage.getItem("token");

/* -----------------------------------------------------------
   ✅ Initial State
   - Authenticated only if both user + token exist
----------------------------------------------------------- */
const initialState = {
  isAuthenticated: !!(storedUser && storedToken),
  isLoading: false,
  user: storedUser,
  token: storedToken,
};

/* -----------------------------------------------------------
   ✅ Thunks
----------------------------------------------------------- */

// Register
export const registerUser = createAsyncThunk("/auth/register", async (formData) => {
  const response = await api.post("/auth/register", formData);
  return response.data;
});

// Login
export const loginUser = createAsyncThunk("/auth/login", async (formData) => {
  const response = await api.post("/auth/login", formData);
  return response.data;
});

// Logout
export const logoutUser = createAsyncThunk("/auth/logout", async (_, { dispatch }) => {
  try {
    // ✅ Clear local + session storage first
    localStorage.clear();
    sessionStorage.clear();

    // ✅ Reset Redux state
    dispatch(clearUser());

    // (Optional) Notify backend
    await api.post("/auth/logout", {});
  } catch (err) {
    console.warn("Logout request failed:", err.message);
  }

  return { success: true };
});

// Check Auth (auto-login persistence)
export const checkAuth = createAsyncThunk("/auth/checkauth", async () => {
  const token = localStorage.getItem("token");

  const response = await api.get("/auth/check-auth", {
    headers: {
      Authorization: token ? `Bearer ${token}` : undefined,
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    },
  });

  return response.data;
});

/* -----------------------------------------------------------
   ✅ Slice Definition
----------------------------------------------------------- */
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    // ✅ Manual setter (used after Google login or external auth)
    setUser: (state, action) => {
      const { user, token } = action.payload;
      state.user = user;
      state.token = token;
      state.isAuthenticated = true;
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("token", token);
    },

    // ✅ Used on logout or session expiration
    clearUser: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    },
  },

  extraReducers: (builder) => {
    builder
      /* -------------------- REGISTER -------------------- */
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(registerUser.fulfilled, (state) => {
        state.isLoading = false;
        state.user = null;
        state.isAuthenticated = false;
      })
      .addCase(registerUser.rejected, (state) => {
        state.isLoading = false;
        state.user = null;
        state.isAuthenticated = false;
      })

      /* -------------------- LOGIN -------------------- */
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.success) {
          const { user, token } = action.payload;
          state.user = user;
          state.token = token;
          state.isAuthenticated = true;
          localStorage.setItem("user", JSON.stringify(user));
          localStorage.setItem("token", token);
        }
      })
      .addCase(loginUser.rejected, (state) => {
        state.isLoading = false;
        state.user = null;
        state.isAuthenticated = false;
      })

      /* -------------------- CHECK AUTH -------------------- */
      .addCase(checkAuth.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(checkAuth.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.success) {
          state.user = action.payload.user;
          state.isAuthenticated = true;
        } else {
          state.user = null;
          state.isAuthenticated = false;
        }
      })
      .addCase(checkAuth.rejected, (state) => {
        state.isLoading = false;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
      })

      /* -------------------- LOGOUT -------------------- */
      .addCase(logoutUser.fulfilled, (state) => {
        state.isLoading = false;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
      });
  },
});

/* -----------------------------------------------------------
   ✅ Exports
----------------------------------------------------------- */
export const { setUser, clearUser } = authSlice.actions;
export default authSlice.reducer;

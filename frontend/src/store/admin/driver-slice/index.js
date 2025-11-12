import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

// ✅ Fetch all drivers for admin dashboard
export const getAllDrivers = createAsyncThunk(
  "adminDrivers/getAllDrivers",
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");

      // ✅ Log the token to verify it's present
      console.log("🔐 Sending token:", token);

      if (!token) {
        return rejectWithValue("No token found");
      }

      const response = await axios.get("http://localhost:5000/api/admin/drivers", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error) {
      console.error("❌ getAllDrivers error:", error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || "Failed to fetch drivers");
    }
  }
);

const driverSlice = createSlice({
  name: "adminDrivers",
  initialState: {
    drivers: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getAllDrivers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAllDrivers.fulfilled, (state, action) => {
        state.loading = false;
        state.drivers = action.payload;
      })
      .addCase(getAllDrivers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default driverSlice.reducer;
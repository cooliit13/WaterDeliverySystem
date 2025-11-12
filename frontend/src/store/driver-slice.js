import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "@/utils/axiosInstance"; // ✅ added

// Async action to create a driver account
export const createDriverAccount = createAsyncThunk(
  "driver/createDriverAccount",
  async (driverData) => {
    const response = await axiosInstance.post("/admin/drivers", driverData); // ✅ updated
    return response.data; // ✅ updated
  }
);

const driverSlice = createSlice({
  name: "driver",
  initialState: {
    drivers: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(createDriverAccount.pending, (state) => {
        state.loading = true;
      })
      .addCase(createDriverAccount.fulfilled, (state, action) => {
        state.loading = false;
        state.drivers.push(action.payload);
      })
      .addCase(createDriverAccount.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export default driverSlice.reducer;
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

// Async action to create a driver account
export const createDriverAccount = createAsyncThunk(
  "driver/createDriverAccount",
  async (driverData) => {
    const response = await fetch("/api/drivers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(driverData),
    });
    return await response.json();
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

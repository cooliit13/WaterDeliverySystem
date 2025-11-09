import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";

const initialState = {
  orderList: [],
  orderDetails: null,
};

// ✅ Get All Orders (ADMIN)
export const getAllOrdersForAdmin = createAsyncThunk(
  "/order/getAllOrdersForAdmin",
  async (_, { getState }) => {
    const token = getState().auth.token;

    const response = await axios.get(
      `http://localhost:5000/api/admin/orders/get`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    return response.data;
  }
);

// ✅ Get Order Details
export const getOrderDetailsForAdmin = createAsyncThunk(
  "/order/getOrderDetailsForAdmin",
  async (id, { getState }) => {
    const token = getState().auth.token;

    const response = await axios.get(
      `http://localhost:5000/api/admin/orders/details/${id}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    return response.data;
  }
);

// ✅ Update Order Status
export const updateOrderStatus = createAsyncThunk(
  "/order/updateOrderStatus",
  async ({ id, orderStatus }, { getState }) => {
    const token = getState().auth.token;

    const response = await axios.put(
      `http://localhost:5000/api/admin/orders/update/${id}`,
      { status: orderStatus },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    return response.data;
  }
);

const adminOrderSlice = createSlice({
  name: "adminOrderSlice",
  initialState,
  reducers: {
    resetOrderDetails: (state) => {
      state.orderDetails = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getAllOrdersForAdmin.fulfilled, (state, action) => {
        state.orderList = action.payload.orders;
      })
      .addCase(getOrderDetailsForAdmin.fulfilled, (state, action) => {
        state.orderDetails = action.payload.order;
      });
  },
});

export const { resetOrderDetails } = adminOrderSlice.actions;

export default adminOrderSlice.reducer;

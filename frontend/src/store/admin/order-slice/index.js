import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";

const initialState = {
  orderList: [],
  orderDetails: null,
};

/* ---------------------------------------------------------
   ✅ ADD THIS — CUSTOMER REQUEST PURCHASE
---------------------------------------------------------- */
export const requestPurchase = createAsyncThunk(
  "order/requestPurchase",
  async (orderData, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        "http://localhost:5000/api/orders/request-purchase",
        orderData,
        { withCredentials: true }
      );

      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Failed to submit purchase request"
      );
    }
  }
);

/* ---------------------------------------------------------
   ✅ ADMIN GET ALL ORDERS
---------------------------------------------------------- */
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
      { orderStatus },
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

        // ✅ Debug: Confirm deliveryDate is present
        console.log("🧾 Admin order details:", action.payload.order.deliveryDate);
      })

      /* ---------------------------------------------------------
         ✅ ADD THIS — HANDLE PURCHASE REQUEST
      ---------------------------------------------------------- */
      .addCase(requestPurchase.fulfilled, (state, action) => {
        console.log("✅ Purchase request submitted:", action.payload);
      });
  },
});

export const { resetOrderDetails } = adminOrderSlice.actions;

export default adminOrderSlice.reducer;
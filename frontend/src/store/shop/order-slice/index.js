import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../../../utils/axiosInstance"; // <- relative import to axiosinstance

const initialState = {
  orderList: [],
  orderDetails: null,
  isLoading: false,
  error: null,
};

/* ---------------------------------------------
   REQUEST PURCHASE
---------------------------------------------- */
export const requestPurchase = createAsyncThunk(
  "orders/requestPurchase",
  async (orderData, { rejectWithValue }) => {
    try {
      const response = await api.post("/orders/request-purchase", orderData);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

/* ---------------------------------------------
   GET ALL ORDERS BY USER ID
---------------------------------------------- */
export const getAllOrdersByUserId = createAsyncThunk(
  "orders/getAllOrdersByUserId",
  async (userId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/orders/user/${userId}`);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

/* ---------------------------------------------
   GET ORDER DETAILS
---------------------------------------------- */
export const getOrderDetails = createAsyncThunk(
  "orders/getOrderDetails",
  async (orderId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/orders/details/${orderId}`);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

/* ---------------------------------------------
   CANCEL ORDER
---------------------------------------------- */
export const cancelOrder = createAsyncThunk(
  "orders/cancelOrder",
  async (orderId, { rejectWithValue }) => {
    try {
      const response = await api.delete(`/orders/${orderId}/cancel`);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

/* ---------------------------------------------
   SLICE
---------------------------------------------- */
const orderSlice = createSlice({
  name: "shopOrder",
  initialState,
  reducers: {
    resetOrderDetails: (state) => {
      state.orderDetails = null;
    },
  },
  extraReducers: (builder) => {
    /* Request Purchase */
    builder
      .addCase(requestPurchase.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(requestPurchase.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(requestPurchase.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });

    /* Get all orders by user id */
    builder
      .addCase(getAllOrdersByUserId.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getAllOrdersByUserId.fulfilled, (state, action) => {
        state.isLoading = false;
        state.orderList = action.payload?.data ?? action.payload ?? [];
      })
      .addCase(getAllOrdersByUserId.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        state.orderList = [];
      });

    /* Get order details */
    builder
      .addCase(getOrderDetails.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getOrderDetails.fulfilled, (state, action) => {
        state.isLoading = false;
        state.orderDetails = action.payload?.data ?? action.payload ?? null;
      })
      .addCase(getOrderDetails.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        state.orderDetails = null;
      });

    /* Cancel order */
    builder
      .addCase(cancelOrder.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(cancelOrder.fulfilled, (state, action) => {
        state.isLoading = false;
        const payload = action.payload;
        const updatedOrder = payload?.order ?? payload;
        if (updatedOrder && updatedOrder._id) {
          state.orderList = state.orderList.map((o) =>
            String(o._id ?? o.id) === String(updatedOrder._id ?? updatedOrder.id)
              ? updatedOrder
              : o
          );
        }
      })
      .addCase(cancelOrder.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const { resetOrderDetails } = orderSlice.actions;

export default orderSlice.reducer;

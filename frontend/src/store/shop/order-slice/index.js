import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";

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
      const response = await axios.post(
        "http://localhost:5000/api/orders/request-purchase",
        orderData
      );
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
      const response = await axios.get(
        `http://localhost:5000/api/orders/user/${userId}`
      );
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
      const response = await axios.get(
        `http://localhost:5000/api/orders/details/${orderId}`
      );
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
      .addCase(requestPurchase.fulfilled, (state, action) => {
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
        state.orderList = action.payload.data;
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
        state.orderDetails = action.payload.data;
      })
      .addCase(getOrderDetails.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        state.orderDetails = null;
      });
  },
});

export const { resetOrderDetails } = orderSlice.actions;

export default orderSlice.reducer;

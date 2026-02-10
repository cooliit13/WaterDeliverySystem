import api from "../../../utils/axiosInstance"; // <- relative import to axiosinstance
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

const API = "/shop/cart"; // axiosinstance already has baseURL = /api

const initialState = {
  cartItems: { items: [] },
  isLoading: false,
};

// ✅ ADD ITEM (correct endpoint)
export const addToCart = createAsyncThunk(
  "cart/addToCart",
  async ({ productId, quantity }, { rejectWithValue }) => {
    try {
      const response = await api.post(`${API}/add`, { productId, quantity });
      return response.data.cart;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: "Add failed" });
    }
  }
);

// ✅ GET CART
export const fetchCartItems = createAsyncThunk(
  "cart/fetchCartItems",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get(`${API}/get`);
      return response.data.cart;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: "Fetch failed" });
    }
  }
);

// ✅ DELETE ITEM
export const deleteCartItem = createAsyncThunk(
  "cart/deleteCartItem",
  async (productId, { rejectWithValue }) => {
    try {
      const response = await api.delete(`${API}/remove/${productId}`);
      return response.data.cart;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: "Delete failed" });
    }
  }
);

// ✅ UPDATE QUANTITY
export const updateCartQuantity = createAsyncThunk(
  "cart/updateCartQuantity",
  async ({ productId, quantity }, { rejectWithValue }) => {
    try {
      const response = await api.put(`${API}/update`, { productId, quantity });
      return response.data.cart;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: "Update failed" });
    }
  }
);

const shoppingCartSlice = createSlice({
  name: "shoppingCart",
  initialState,
  reducers: {
    clearCart: (state) => {
      state.cartItems = { items: [] };
    },
  },
  extraReducers: (builder) => {
    builder
      // ADD TO CART
      .addCase(addToCart.fulfilled, (state, action) => {
        state.cartItems = action.payload;
      })

      // FETCH
      .addCase(fetchCartItems.fulfilled, (state, action) => {
        state.cartItems = action.payload;
      })

      // DELETE
      .addCase(deleteCartItem.fulfilled, (state, action) => {
        state.cartItems = action.payload;
      })

      // UPDATE
      .addCase(updateCartQuantity.fulfilled, (state, action) => {
        state.cartItems = action.payload;
      });
  },
});

export const { clearCart } = shoppingCartSlice.actions;
export default shoppingCartSlice.reducer;

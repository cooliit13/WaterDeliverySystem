import axios from "axios";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

const initialState = {
  cartItems: { items: [] }, // ✅ always has items array to prevent undefined errors
  isLoading: false,
};

// ✅ Helper to attach token to requests
const getAuthHeader = () => {
  const token = localStorage.getItem("token");
  return {
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
    },
  };
};

// 🛒 ADD TO CART
export const addToCart = createAsyncThunk(
  "cart/addToCart",
  async ({ userId, productId, quantity }, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        "http://localhost:5000/api/shop/cart/add",
        { userId, productId, quantity },
        getAuthHeader()
      );
      return response.data;
    } catch (error) {
      console.error("❌ Add to cart error:", error.response?.data || error.message);
      return rejectWithValue(error.response?.data || { message: "Add to cart failed" });
    }
  }
);

// 🛍 FETCH CART ITEMS
export const fetchCartItems = createAsyncThunk(
  "cart/fetchCartItems",
  async (userId, { rejectWithValue }) => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/shop/cart/get/${userId}`,
        getAuthHeader()
      );
      return response.data;
    } catch (error) {
      console.error("❌ Fetch cart items error:", error.response?.data || error.message);
      return rejectWithValue(error.response?.data || { message: "Fetch failed" });
    }
  }
);

// ❌ DELETE CART ITEM
export const deleteCartItem = createAsyncThunk(
  "cart/deleteCartItem",
  async ({ userId, productId }, { rejectWithValue }) => {
    try {
      const response = await axios.delete(
        `http://localhost:5000/api/shop/cart/${userId}/${productId}`,
        getAuthHeader()
      );
      return response.data;
    } catch (error) {
      console.error("❌ Delete cart error:", error.response?.data || error.message);
      return rejectWithValue(error.response?.data || { message: "Delete failed" });
    }
  }
);

// 🔁 UPDATE QUANTITY
export const updateCartQuantity = createAsyncThunk(
  "cart/updateCartQuantity",
  async ({ userId, productId, quantity }, { rejectWithValue }) => {
    try {
      const response = await axios.put(
        "http://localhost:5000/api/shop/cart/update-cart",
        { userId, productId, quantity },
        getAuthHeader()
      );
      return response.data;
    } catch (error) {
      console.error("❌ Update quantity error:", error.response?.data || error.message);
      return rejectWithValue(error.response?.data || { message: "Update failed" });
    }
  }
);

const shoppingCartSlice = createSlice({
  name: "shoppingCart",
  initialState,
  reducers: {
    clearCart: (state) => {
      state.cartItems = { items: [] }; // ✅ safely clear cart
    },
  },
  extraReducers: (builder) => {
    builder
      // 🛒 Add to Cart
      .addCase(addToCart.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(addToCart.fulfilled, (state, action) => {
        state.isLoading = false;
        // ✅ Normalize backend data shape
        const data = action.payload?.data || action.payload?.cart || { items: [] };
        state.cartItems = Array.isArray(data)
          ? { items: data }
          : data;
      })
      .addCase(addToCart.rejected, (state) => {
        state.isLoading = false;
      })

      // 🛍 Fetch Cart Items
      .addCase(fetchCartItems.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchCartItems.fulfilled, (state, action) => {
        state.isLoading = false;
        const data = action.payload?.data || action.payload?.cart || { items: [] };
        state.cartItems = Array.isArray(data)
          ? { items: data }
          : data;
      })
      .addCase(fetchCartItems.rejected, (state) => {
        state.isLoading = false;
        state.cartItems = { items: [] };
      })

      // 🗑 Delete Cart Item
      .addCase(deleteCartItem.fulfilled, (state, action) => {
        state.isLoading = false;
        const data = action.payload?.data || { items: [] };
        state.cartItems = Array.isArray(data)
          ? { items: data }
          : data;
      })

      // 🔁 Update Cart Quantity
      .addCase(updateCartQuantity.fulfilled, (state, action) => {
        state.isLoading = false;
        const data = action.payload?.data || { items: [] };
        state.cartItems = Array.isArray(data)
          ? { items: data }
          : data;
      });
  },
});

export const { clearCart } = shoppingCartSlice.actions;
export default shoppingCartSlice.reducer;

import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";

const initialState = { isLoading: false, productList: [] };

const getAuthHeader = () => {
  const token = localStorage.getItem("token");
  return { Authorization: `Bearer ${token}` };
};

// Fetch all products
export const fetchAllProducts = createAsyncThunk("/products/fetchAll", async () => {
  const res = await axios.get("http://localhost:5000/api/admin/products/get", {
    headers: getAuthHeader(),
  });
  return res.data;
});

// Add new product
export const addNewProduct = createAsyncThunk("/products/add", async (formData) => {
  // don't set Content-Type manually; let axios set the multipart boundary
  const res = await axios.post("http://localhost:5000/api/admin/products/add", formData, {
    headers: { ...getAuthHeader() },
  });
  return res.data;
});

// Edit product
export const editProduct = createAsyncThunk("/products/edit", async ({ id, formData }) => {
  // let axios set Content-Type for FormData
  const res = await axios.put(`http://localhost:5000/api/admin/products/edit/${id}`, formData, {
    headers: { ...getAuthHeader() },
  });
  return res.data;
});

// Delete product
export const deleteProduct = createAsyncThunk("/products/delete", async (id) => {
  const res = await axios.delete(`http://localhost:5000/api/admin/products/delete/${id}`, {
    headers: getAuthHeader(),
  });
  return res.data;
});

const adminProductsSlice = createSlice({
  name: "adminProducts",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllProducts.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchAllProducts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.productList = action.payload?.products || [];
      })
      .addCase(fetchAllProducts.rejected, (state) => {
        state.isLoading = false;
        state.productList = [];
      });
  },
});

export default adminProductsSlice.reducer;

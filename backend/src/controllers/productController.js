// backend/src/controllers/ProductController.js
import Product from "../models/Product.js";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Helper: Upload buffer to Cloudinary
const uploadBufferToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    stream.end(buffer);
  });
};

// -------------------- CONTROLLERS --------------------

// Admin: Get all products (for customer view)
export const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, products });
  } catch (err) {
    console.error("getAllProducts error:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch products" });
  }
};

// Admin: Get products (protected)
export const getProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, products });
  } catch (err) {
    console.error("getProducts error:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch products" });
  }
};

// Upload image controller
export const uploadImage = async (req, res) => {
  try {
    console.log("uploadImage called. req.file:", !!req.file);

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const result = await uploadBufferToCloudinary(req.file.buffer, { folder: "products" });
    return res.status(200).json({ success: true, result });
  } catch (err) {
    console.error("uploadImage error:", err);
    return res.status(500).json({
      success: false,
      message: "Image upload failed",
      error: err.message || err,
    });
  }
};

// Admin: Create product
export const createProduct = async (req, res) => {
  try {
    console.log("createProduct called. req.file:", !!req.file, "req.body:", req.body);

    if (req.file && req.file.buffer) {
      try {
        const uploadRes = await uploadBufferToCloudinary(req.file.buffer, { folder: "products" });
        req.body.image = uploadRes.secure_url || uploadRes.url;
      } catch (uploadErr) {
        // Minimal: don't let Cloudinary failure abort the entire request
        console.error("Cloudinary upload failed in createProduct (continuing without image):", uploadErr);
        req.body.image = req.body.image || null;
      }
    }

    // Minimal mapping so Mongoose schema (which expects `name`) passes
    if (req.body.title && !req.body.name) {
      req.body.name = req.body.title;
    }

    const { name, title, description, price, averageReview, image } = req.body;

    // require name (mapped from title) and price
    if (!name || !price) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: name (or title) and price are required",
      });
    }

    const newProduct = new Product({
      name,
      title: title || name,
      description: description || "",
      price: Number(price),
      averageReview: averageReview ? Number(averageReview) : 0,
      image: image || null,
      createdBy: req.user?.userId || null,
    });

    await newProduct.save();

    return res.status(201).json({ success: true, product: newProduct });
  } catch (err) {
    console.error("createProduct error (full):", err);
    return res.status(500).json({
      success: false,
      message: "Failed to create product",
      error: err.message || err,
    });
  }
};

// Admin: Edit product
export const editProduct = async (req, res) => {
  try {
    const id = req.params.id;
    console.log("editProduct called. id:", id, "hasFile:", !!req.file, "body:", req.body);

    if (req.file && req.file.buffer) {
      try {
        const uploadRes = await uploadBufferToCloudinary(req.file.buffer, { folder: "products" });
        req.body.image = uploadRes.secure_url || uploadRes.url;
      } catch (uploadErr) {
        console.error("Cloudinary upload failed in editProduct (continuing without new image):", uploadErr);
        // continue — update other fields even if image upload fails
      }
    }

    // Minimal mapping: if frontend sent title, copy to name so validation passes
    if (req.body.title && !req.body.name) {
      req.body.name = req.body.title;
    }

    const update = req.body;
    const updated = await Product.findByIdAndUpdate(id, update, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: "Product not found" });

    return res.status(200).json({ success: true, product: updated });
  } catch (err) {
    console.error("editProduct error (full):", err);
    return res.status(500).json({ success: false, message: "Failed to edit product", error: err.message || err });
  }
};

// Admin: Delete product
export const deleteProduct = async (req, res) => {
  try {
    const id = req.params.id;
    const deleted = await Product.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ success: false, message: "Product not found" });

    return res.status(200).json({ success: true, message: "Product deleted" });
  } catch (err) {
    console.error("deleteProduct error:", err);
    return res.status(500).json({ success: false, message: "Failed to delete product", error: err.message || err });
  }
};

// -------------------- EXPORT --------------------
export default {
  getAllProducts,
  getProducts,
  uploadImage,
  createProduct,
  editProduct,
  deleteProduct,
};

import Product from "../models/Product.js";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import streamifier from "streamifier";

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
    const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};



// Admin: Get all products (for admin)
export const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, products });
  } catch (err) {
    console.error("getAllProducts error:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch products" });
  }
};

// Admin: Get products (protected / maybe used elsewhere)
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

// Admin: Create product (basic duplicate-check handling)
export const createProduct = async (req, res) => {
  try {
    if (req.file && req.file.buffer) {
      try {
        const uploadRes = await uploadBufferToCloudinary(req.file.buffer, { folder: "products" });
        req.body.image = uploadRes.secure_url || uploadRes.url;
      } catch (uploadErr) {
        console.error("Cloudinary upload failed in createProduct (continuing without image):", uploadErr);
        req.body.image = req.body.image || null;
      }
    }

    if (req.body.title && !req.body.name) {
      req.body.name = req.body.title;
    }

    const { name, title, description, price, averageReview, image } = req.body;

    if (!name || !price) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: name (or title) and price are required",
      });
    }

    // optional: check duplicate by name (helps avoid accidental duplicates)
    const existing = await Product.findOne({ name });
    if (existing) {
      return res.status(409).json({ success: false, message: "Product already exists", product: existing });
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
    console.error("createProduct error:", err);
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: "Product already exists (duplicate key)" });
    }
    return res.status(500).json({
      success: false,
      message: "Failed to create product",
      error: err.message || err,
    });
  }
};


export const editProduct = async (req, res) => {
  try {
    const id = req.params.id;
    const clientUpdatedAt = req.body?.clientUpdatedAt; // expected ISO string
    console.log(">>> editProduct invoked for id:", id);
    console.log(">>> raw req.body:", JSON.stringify(req.body));

    if (!clientUpdatedAt) {
      console.warn(">>> editProduct: clientUpdatedAt MISSING in request body");
      return res.status(400).json({ success: false, message: "clientUpdatedAt is required (strict debug mode)" });
    }

    // parse guard date
    const guardDate = new Date(clientUpdatedAt);
    console.log(">>> clientUpdatedAt (raw):", clientUpdatedAt);
    console.log(">>> guardDate (parsed):", guardDate, "isValid:", !Number.isNaN(guardDate.getTime()));

    if (Number.isNaN(guardDate.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid clientUpdatedAt format" });
    }

    // Build updates and remove guard field
    const updates = { ...req.body };
    delete updates.clientUpdatedAt;

    // Show the DB value BEFORE update
    const current = await Product.findById(id).lean();
    if (!current) {
      console.warn(">>> editProduct: product not found id=", id);
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    console.log(">>> DB current.updatedAt (raw):", current.updatedAt);
    console.log(">>> DB current.updatedAt (ms):", new Date(current.updatedAt).getTime());

    // Log numeric comparison
    console.log(">>> guardDate ms:", guardDate.getTime(), "dbUpdatedAt ms:", new Date(current.updatedAt).getTime());
    console.log(">>> equal times?:", guardDate.getTime() === new Date(current.updatedAt).getTime());

    // Try the guarded update
    const updated = await Product.findOneAndUpdate(
      { _id: id, updatedAt: guardDate },
      { $set: updates, $currentDate: { updatedAt: true } },
      { new: true }
    );

    if (!updated) {
      console.warn(">>> Timestamp guard failed -> returning 409 with current product");
      const fresh = await Product.findById(id);
      return res.status(409).json({
        success: false,
        message: "Conflict: product changed since you opened it.",
        product: fresh,
      });
    }

    console.log(">>> Guard matched — update applied. New updatedAt:", updated.updatedAt);
    return res.status(200).json({ success: true, product: updated });
  } catch (err) {
    console.error(">>> editProduct error:", err);
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

import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import Product from "../models/Product.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import * as ProductController from "../controllers/ProductController.js"; // <-- import controller

dotenv.config();
const router = express.Router();

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer setup (store files in memory)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Helper to upload buffer to Cloudinary (kept for compatibility if needed)
const uploadBufferToCloudinary = (buffer) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder: "products" }, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    stream.end(buffer);
  });


router.post("/add", authMiddleware, upload.single("image"), ProductController.createProduct);

// Get all products (for Admin)
router.get("/get-all", async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json({ success: true, products }); // Admin expects `products`
  } catch (err) {
    console.error("Error fetching all products:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


router.get("/get", async (req, res) => {
  try {
    const { sortBy } = req.query;

    let sortOption = {};
    if (sortBy === "price-lowtohigh") sortOption = { price: 1 };
    else if (sortBy === "price-hightolow") sortOption = { price: -1 };
    else sortOption = { createdAt: -1 };

    const products = await Product.find().sort(sortOption);

    res.status(200).json({
      success: true,
      data: products,      // keeps customer listing working
      products: products,  // keeps admin dashboard working
    });
  } catch (err) {
    console.error("Error fetching shop products:", err);
    res.status(500).json({
      success: false,
      message: "Server error while fetching products",
    });
  }
});


router.get("/get/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id).lean();
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    return res.json({ success: true, product });
  } catch (err) {
    console.error("Error fetching product by id (get/:id):", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});


router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id).lean();
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    return res.json({ success: true, product });
  } catch (err) {
    console.error("Error fetching product by id (:id):", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// ------------------ EDIT / DELETE ------------------

// Edit product (Admin) — matches frontend PUT /api/admin/products/edit/:id
router.put("/edit/:id", authMiddleware, upload.single("image"), ProductController.editProduct);
console.log("productRoutes: registered PUT /api/admin/products/edit/:id");

router.delete("/delete/:id", authMiddleware, ProductController.deleteProduct);

// --------------------------------------------------------------

export default router;

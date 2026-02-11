import express from "express";
const router = express.Router();

router.get("/feature/get", async (req, res) => {
  try {
    const features = [
      { id: 1, title: "Fast Delivery", description: "Get water delivered quickly to your doorstep." },
      { id: 2, title: "Trusted Quality", description: "We ensure clean and safe drinking water every time." },
      { id: 3, title: "Easy Ordering", description: "Order online with just a few clicks." },
    ];
    res.status(200).json(features);
  } catch (error) {
    console.error("Error fetching features:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

export default router;

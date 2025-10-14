import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import userRoutes from './routes/userRoutes.js';
import cors from 'cors';
import customerRoutes from './routes/customerRoutes.js';
import adminRoutes from "./routes/adminRoutes.js";

dotenv.config();
connectDB();
const app = express();

app.use("/api/admin", adminRoutes);
app.use('/api/customers', customerRoutes);
app.use(express.json());
app.use(cors());
app.use('/api/users', userRoutes);
app.use(express.json());
//db connection

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
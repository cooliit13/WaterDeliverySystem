import express from 'express';
import { register, login, googleSignIn, forgotPassword, resetPassword, verifyEmail } from '../controllers/userController.js';
import {authMiddleware} from '../middleware/authMiddleware.js';


const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google-signin', googleSignIn);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/verify/:token', verifyEmail);

router.get('/profile', authMiddleware, (req, res) => {
    res.json({ message: 'You have accessed a protected route', user: req.user });
});

export default router;

import express from 'express';
import { register, login, googleSignIn, forgotPassword, resetPassword, verifyEmail } from '../controllers/userController.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google-signin', googleSignIn);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/verify/:token', verifyEmail);

export default router;

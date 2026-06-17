import express from 'express';
import authRoutes from './auth.js';
import billsRoutes from './bills.js';
import uploadRoutes from './upload.js';
import usersRoutes from './users.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/bills', billsRoutes);
router.use('/upload', uploadRoutes);
router.use('/users', usersRoutes);

export default router;

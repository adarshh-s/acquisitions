import express from 'express';
import { signup, signin, signout } from '#controller/auth.controller.js';

const router = express.Router();

router.post('/sign-up', signup);
router.post('/sign-in', signin);
router.post('/sign-out', signout);

export default router;

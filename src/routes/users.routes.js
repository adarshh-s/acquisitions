import express from 'express';
import {
  fetchAllUsers,
  getUserById,
  updateUser,
  deleteUser
} from '#controller/users.controller.js';
import {authenticate} from '#middleware/auth.middleware.js';

const router = express.Router();

router.get('/', fetchAllUsers);
router.get('/:id', getUserById);
router.put('/:id', authenticate, updateUser);
router.delete('/:id', authenticate, deleteUser);

export default router;

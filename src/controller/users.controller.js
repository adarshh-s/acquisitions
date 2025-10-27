import logger from '#config/logger.js';
import {
  getAllUsers,
  getUserById as getUserByIdService,
  updateUser as updateUserService,
  deleteUser as deleteUserService
} from '#services/users.services.js';
import {userIdSchema, updateUserSchema} from '#validation/users.validation.js';
import {formatValidationError} from '#utils/format.js';

export const fetchAllUsers = async (req, res, next) => {
  try {
    logger.info('Getting all users ...');

    const allUsers = await getAllUsers();

    res.json({
      message: 'All users fetched successfully',
      users: allUsers,
      count: allUsers.length,
    });

  } catch (e) {
    logger.error(e);
    next(e);
  }
};

export const getUserById = async (req, res, next) => {
  try {
    const validationResult = userIdSchema.safeParse(req.params);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(validationResult.error)
      });
    }

    const {id} = validationResult.data;
    logger.info(`Fetching user with id: ${id}`);

    const user = await getUserByIdService(id);

    res.json({
      message: 'User fetched successfully',
      user
    });

  } catch (e) {
    logger.error('Error fetching user:', e);

    if (e.message === 'User not found') {
      return res.status(404).json({error: 'User not found'});
    }
    next(e);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const idValidationResult = userIdSchema.safeParse(req.params);
    if (!idValidationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(idValidationResult.error)
      });
    }

    const updateValidationResult = updateUserSchema.safeParse(req.body);
    if (!updateValidationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(updateValidationResult.error)
      });
    }

    const {id} = idValidationResult.data;
    const updates = updateValidationResult.data;

    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to update user information'
      });
    }

    const isOwnProfile = req.user.id === id;
    const isAdmin = req.user.role === 'admin';

    if (!isOwnProfile && !isAdmin) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only update your own profile'
      });
    }

    if (updates.role && !isAdmin) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only admins can change user roles'
      });
    }

    logger.info(`Updating user ${id}`);

    const updatedUser = await updateUserService(id, updates);

    res.json({
      message: 'User updated successfully',
      user: updatedUser
    });

  } catch (e) {
    logger.error('Error updating user:', e);

    if (e.message === 'User not found') {
      return res.status(404).json({error: 'User not found'});
    }

    if (e.message === 'Email already in use') {
      return res.status(409).json({error: 'Email already in use'});
    }

    next(e);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const validationResult = userIdSchema.safeParse(req.params);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: formatValidationError(validationResult.error)
      });
    }

    const {id} = validationResult.data;

    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to delete users'
      });
    }

    const isOwnProfile = req.user.id === id;
    const isAdmin = req.user.role === 'admin';

    if (!isOwnProfile && !isAdmin) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only delete your own profile or be an admin'
      });
    }

    logger.info(`Deleting user ${id}`);

    const result = await deleteUserService(id);

    res.json({
      message: 'User deleted successfully',
      result
    });

  } catch (e) {
    logger.error('Error deleting user:', e);

    if (e.message === 'User not found') {
      return res.status(404).json({error: 'User not found'});
    }

    next(e);
  }
};

import logger from '#config/logger.js';
import {db} from '#config/database.js';
import {users} from '#models/user.model.js';
import {eq} from 'drizzle-orm';
import {hashPassword} from '#services/auth.service.js';

export const getAllUsers =  async () => {
  try {
    return await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    }).from(users);

  }catch (e) {
    logger.error('Error fetching users:', e);
    throw e;
  }
};

export const getUserById = async (id) => {
  try {
    const [user] = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    }).from(users).where(eq(users.id, id)).limit(1);

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  } catch (e) {
    logger.error('Error fetching user by id:', e);
    throw e;
  }
};

export const updateUser = async (id, updates) => {
  try {
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!existingUser) {
      throw new Error('User not found');
    }

    const updateData = {...updates};

    if (updates.password) {
      updateData.password = await hashPassword(updates.password);
    }

    if (updates.email && updates.email !== existingUser.email) {
      const [emailExists] = await db
        .select()
        .from(users)
        .where(eq(users.email, updates.email))
        .limit(1);

      if (emailExists) {
        throw new Error('Email already in use');
      }
    }

    updateData.updatedAt = new Date();

    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      });

    logger.info(`User ${id} updated successfully`);
    return updatedUser;
  } catch (e) {
    logger.error('Error updating user:', e);
    throw e;
  }
};

export const deleteUser = async (id) => {
  try {
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!existingUser) {
      throw new Error('User not found');
    }

    await db.delete(users).where(eq(users.id, id));

    logger.info(`User ${id} deleted successfully`);
    return {id, message: 'User deleted successfully'};
  } catch (e) {
    logger.error('Error deleting user:', e);
    throw e;
  }
};

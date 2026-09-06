import { prisma } from '../../config/database.js';
import { AppError } from '../../middleware/error.middleware.js';
import { toPublicUser, type PublicUser } from '../auth/auth.service.js';

export async function getCurrentUser(userId: string): Promise<PublicUser> {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user || !user.isActive) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
  }

  return toPublicUser(user);
}

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Prisma, UserRole } from '@prisma/client';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { AppError } from '../../middleware/error.middleware.js';
import type { LoginInput, RegisterInput } from './auth.validation.js';

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  interviewerType: string | null;
  timezone: string;
  isActive: boolean;
  createdAt: Date;
};

type AuthResult = {
  token: string;
  user: PublicUser;
};

export async function registerUser(input: RegisterInput): Promise<PublicUser> {
  const passwordHash = await bcrypt.hash(input.password, 12);

  try {
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        role: input.role,
        timezone: 'UTC',
        skillTags: [],
      },
    });

    return toPublicUser(user);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new AppError(409, 'EMAIL_ALREADY_REGISTERED', 'An account with this email already exists');
    }

    throw error;
  }
}

export async function loginUser(input: LoginInput): Promise<AuthResult> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  const passwordMatches = user ? await bcrypt.compare(input.password, user.passwordHash) : false;

  if (!user || !passwordMatches || !user.isActive) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is invalid');
  }

  const token = jwt.sign({ id: user.id, role: user.role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });

  return { token, user: toPublicUser(user) };
}

export function toPublicUser(user: {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  interviewerType: string | null;
  timezone: string;
  isActive: boolean;
  createdAt: Date;
}): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    interviewerType: user.interviewerType,
    timezone: user.timezone,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };
}

function isUniqueConstraintError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

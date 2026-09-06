import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { Prisma, UserRole } from '@prisma/client';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { AppError } from '../../middleware/error.middleware.js';
import type { LoginInput, RegisterInput } from './auth.validation.js';
import type { GoogleIdentity } from './google.provider.js';

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

export type AuthResult = {
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

  const token = createApplicationToken(user.id, user.role);

  return { token, user: toPublicUser(user) };
}

export async function authenticateGoogleUser(identity: GoogleIdentity): Promise<AuthResult> {
  const generatedPasswordHash = await bcrypt.hash(randomBytes(32).toString('hex'), 12);

  try {
    const user = await prisma.$transaction(async (transaction) => {
      const existingAccount = await transaction.oAuthAccount.findUnique({
        where: {
          provider_providerAccountId: {
            provider: 'google',
            providerAccountId: identity.providerAccountId,
          },
        },
        include: { user: true },
      });

      if (existingAccount) {
        if (!existingAccount.user.isActive) {
          throw new AppError(401, 'ACCOUNT_INACTIVE', 'This account is inactive');
        }

        return existingAccount.user;
      }

      const existingUser = await transaction.user.findUnique({ where: { email: identity.email } });

      if (existingUser) {
        if (!existingUser.isActive) {
          throw new AppError(401, 'ACCOUNT_INACTIVE', 'This account is inactive');
        }

        await transaction.oAuthAccount.create({
          data: {
            provider: 'google',
            providerAccountId: identity.providerAccountId,
            userId: existingUser.id,
          },
        });

        return existingUser;
      }

      const newUser = await transaction.user.create({
        data: {
          name: identity.name,
          email: identity.email,
          passwordHash: generatedPasswordHash,
          role: 'recruiter',
          timezone: 'UTC',
          skillTags: [],
          oauthAccounts: {
            create: {
              provider: 'google',
              providerAccountId: identity.providerAccountId,
            },
          },
        },
      });

      return newUser;
    });

    return { token: createApplicationToken(user.id, user.role), user: toPublicUser(user) };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new AppError(409, 'OAUTH_ACCOUNT_CONFLICT', 'This Google account is already linked');
    }

    throw error;
  }
}

export function createApplicationToken(userId: string, role: UserRole): string {
  return jwt.sign({ id: userId, role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
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

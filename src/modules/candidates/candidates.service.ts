import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database.js';
import { AppError } from '../../middleware/error.middleware.js';
import type { AvailabilityInput, UpdateCandidateInput } from './candidates.validation.js';

const candidateSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  resumeUrl: true,
  timezone: true,
  currentStage: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CandidateSelect;

const availabilitySelect = {
  id: true,
  startUtc: true,
  endUtc: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AvailabilitySlotSelect;

type CandidateView = Prisma.CandidateGetPayload<{ select: typeof candidateSelect }>;
type AvailabilityView = Prisma.AvailabilitySlotGetPayload<{ select: typeof availabilitySelect }>;

export async function getCandidateProfile(userId: string): Promise<CandidateView> {
  const candidate = await prisma.candidate.findUnique({ where: { userId }, select: candidateSelect });
  if (!candidate) {
    throw new AppError(404, 'CANDIDATE_NOT_FOUND', 'Candidate profile not found');
  }

  return candidate;
}

export async function updateCandidateProfile(userId: string, input: UpdateCandidateInput): Promise<CandidateView> {
  try {
    return await prisma.$transaction(async (transaction) => {
      const candidate = await transaction.candidate.update({ where: { userId }, data: input, select: candidateSelect });

      await transaction.auditLog.create({
        data: {
          actorUserId: userId,
          action: 'CANDIDATE_PROFILE_UPDATED',
          entityType: 'Candidate',
          entityId: candidate.id,
          metadata: { fields: Object.keys(input) },
        },
      });

      return candidate;
    });
  } catch (error) {
    throwCandidateError(error);
  }
}

export async function listCandidateAvailability(userId: string): Promise<AvailabilityView[]> {
  const candidate = await getCandidateIdentity(userId);
  return prisma.availabilitySlot.findMany({
    where: { candidateId: candidate.id, ownerType: 'candidate' },
    orderBy: { startUtc: 'asc' },
    select: availabilitySelect,
  });
}

export async function createCandidateAvailability(userId: string, input: AvailabilityInput): Promise<AvailabilityView> {
  const candidate = await getCandidateIdentity(userId);
  await ensureNoOverlap(candidate.id, input);

  return prisma.$transaction(async (transaction) => {
    const slot = await transaction.availabilitySlot.create({
      data: {
        ownerType: 'candidate',
        candidateId: candidate.id,
        startUtc: input.startUtc,
        endUtc: input.endUtc,
      },
      select: availabilitySelect,
    });

    await transaction.auditLog.create({
      data: {
        actorUserId: userId,
        action: 'CANDIDATE_AVAILABILITY_CREATED',
        entityType: 'AvailabilitySlot',
        entityId: slot.id,
        metadata: { candidateId: candidate.id, startUtc: input.startUtc.toISOString(), endUtc: input.endUtc.toISOString() },
      },
    });

    return slot;
  });
}

export async function updateCandidateAvailability(
  userId: string,
  slotId: string,
  input: AvailabilityInput,
): Promise<AvailabilityView> {
  const candidate = await getCandidateIdentity(userId);
  const ownedSlot = await findOwnedSlot(candidate.id, slotId);
  if (!ownedSlot) {
    throw new AppError(404, 'AVAILABILITY_NOT_FOUND', 'Availability slot not found');
  }

  await ensureNoOverlap(candidate.id, input, slotId);

  return prisma.$transaction(async (transaction) => {
    const slot = await transaction.availabilitySlot.update({
      where: { id: slotId },
      data: { startUtc: input.startUtc, endUtc: input.endUtc },
      select: availabilitySelect,
    });

    await transaction.auditLog.create({
      data: {
        actorUserId: userId,
        action: 'CANDIDATE_AVAILABILITY_UPDATED',
        entityType: 'AvailabilitySlot',
        entityId: slot.id,
        metadata: { candidateId: candidate.id, startUtc: input.startUtc.toISOString(), endUtc: input.endUtc.toISOString() },
      },
    });

    return slot;
  });
}

export async function deleteCandidateAvailability(userId: string, slotId: string): Promise<void> {
  const candidate = await getCandidateIdentity(userId);
  const ownedSlot = await findOwnedSlot(candidate.id, slotId);
  if (!ownedSlot) {
    throw new AppError(404, 'AVAILABILITY_NOT_FOUND', 'Availability slot not found');
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.availabilitySlot.delete({ where: { id: slotId } });
    await transaction.auditLog.create({
      data: {
        actorUserId: userId,
        action: 'CANDIDATE_AVAILABILITY_DELETED',
        entityType: 'AvailabilitySlot',
        entityId: slotId,
        metadata: { candidateId: candidate.id },
      },
    });
  });
}

async function getCandidateIdentity(userId: string): Promise<{ id: string }> {
  const candidate = await prisma.candidate.findUnique({ where: { userId }, select: { id: true } });
  if (!candidate) {
    throw new AppError(404, 'CANDIDATE_NOT_FOUND', 'Candidate profile not found');
  }

  return candidate;
}

async function findOwnedSlot(candidateId: string, slotId: string): Promise<{ id: string } | null> {
  return prisma.availabilitySlot.findFirst({
    where: { id: slotId, candidateId, ownerType: 'candidate' },
    select: { id: true },
  });
}

async function ensureNoOverlap(candidateId: string, input: AvailabilityInput, excludedSlotId?: string): Promise<void> {
  const overlap = await prisma.availabilitySlot.findFirst({
    where: {
      candidateId,
      ownerType: 'candidate',
      id: excludedSlotId ? { not: excludedSlotId } : undefined,
      startUtc: { lt: input.endUtc },
      endUtc: { gt: input.startUtc },
    },
    select: { id: true },
  });

  if (overlap) {
    throw new AppError(409, 'AVAILABILITY_CONFLICT', 'Availability slot overlaps an existing slot');
  }
}

function throwCandidateError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2025') {
      throw new AppError(404, 'CANDIDATE_NOT_FOUND', 'Candidate profile not found');
    }

    if (error.code === 'P2002') {
      throw new AppError(409, 'EMAIL_ALREADY_IN_USE', 'Email is already in use');
    }
  }

  throw error;
}

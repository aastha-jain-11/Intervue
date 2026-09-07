import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database.js';
import { AppError } from '../../middleware/error.middleware.js';
import type { AvailabilityInput } from '../candidates/candidates.validation.js';

const availabilitySelect = {
  id: true,
  startUtc: true,
  endUtc: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AvailabilitySlotSelect;

type AvailabilityView = Prisma.AvailabilitySlotGetPayload<{ select: typeof availabilitySelect }>;

export async function listInterviewerAvailability(userId: string): Promise<AvailabilityView[]> {
  const interviewer = await getInterviewerIdentity(userId);
  return prisma.availabilitySlot.findMany({
    where: { interviewerId: interviewer.id, ownerType: 'interviewer' },
    orderBy: { startUtc: 'asc' },
    select: availabilitySelect,
  });
}

export async function createInterviewerAvailability(userId: string, input: AvailabilityInput): Promise<AvailabilityView> {
  const interviewer = await getInterviewerIdentity(userId);
  await ensureNoOverlap(interviewer.id, input);

  return prisma.$transaction(async (transaction) => {
    const slot = await transaction.availabilitySlot.create({
      data: { ownerType: 'interviewer', interviewerId: interviewer.id, startUtc: input.startUtc, endUtc: input.endUtc },
      select: availabilitySelect,
    });
    await transaction.auditLog.create({
      data: {
        actorUserId: userId,
        action: 'INTERVIEWER_AVAILABILITY_CREATED',
        entityType: 'AvailabilitySlot',
        entityId: slot.id,
        metadata: { interviewerId: interviewer.id, startUtc: input.startUtc.toISOString(), endUtc: input.endUtc.toISOString() },
      },
    });
    return slot;
  });
}

export async function updateInterviewerAvailability(userId: string, slotId: string, input: AvailabilityInput): Promise<AvailabilityView> {
  const interviewer = await getInterviewerIdentity(userId);
  const ownedSlot = await findOwnedSlot(interviewer.id, slotId);
  if (!ownedSlot) throw new AppError(404, 'AVAILABILITY_NOT_FOUND', 'Availability slot not found');
  await ensureNoOverlap(interviewer.id, input, slotId);

  return prisma.$transaction(async (transaction) => {
    const slot = await transaction.availabilitySlot.update({
      where: { id: slotId },
      data: { startUtc: input.startUtc, endUtc: input.endUtc },
      select: availabilitySelect,
    });
    await transaction.auditLog.create({
      data: {
        actorUserId: userId,
        action: 'INTERVIEWER_AVAILABILITY_UPDATED',
        entityType: 'AvailabilitySlot',
        entityId: slot.id,
        metadata: { interviewerId: interviewer.id, startUtc: input.startUtc.toISOString(), endUtc: input.endUtc.toISOString() },
      },
    });
    return slot;
  });
}

export async function deleteInterviewerAvailability(userId: string, slotId: string): Promise<void> {
  const interviewer = await getInterviewerIdentity(userId);
  const ownedSlot = await findOwnedSlot(interviewer.id, slotId);
  if (!ownedSlot) throw new AppError(404, 'AVAILABILITY_NOT_FOUND', 'Availability slot not found');

  await prisma.$transaction(async (transaction) => {
    await transaction.availabilitySlot.delete({ where: { id: slotId } });
    await transaction.auditLog.create({
      data: {
        actorUserId: userId,
        action: 'INTERVIEWER_AVAILABILITY_DELETED',
        entityType: 'AvailabilitySlot',
        entityId: slotId,
        metadata: { interviewerId: interviewer.id },
      },
    });
  });
}

async function getInterviewerIdentity(userId: string): Promise<{ id: string }> {
  const interviewer = await prisma.interviewer.findUnique({ where: { userId }, select: { id: true } });
  if (!interviewer) throw new AppError(404, 'INTERVIEWER_NOT_FOUND', 'Interviewer profile not found');
  return interviewer;
}

async function findOwnedSlot(interviewerId: string, slotId: string): Promise<{ id: string } | null> {
  return prisma.availabilitySlot.findFirst({ where: { id: slotId, interviewerId, ownerType: 'interviewer' }, select: { id: true } });
}

async function ensureNoOverlap(interviewerId: string, input: AvailabilityInput, excludedSlotId?: string): Promise<void> {
  const overlap = await prisma.availabilitySlot.findFirst({
    where: {
      interviewerId,
      ownerType: 'interviewer',
      id: excludedSlotId ? { not: excludedSlotId } : undefined,
      startUtc: { lt: input.endUtc },
      endUtc: { gt: input.startUtc },
    },
    select: { id: true },
  });
  if (overlap) throw new AppError(409, 'AVAILABILITY_CONFLICT', 'Availability slot overlaps an existing slot');
}

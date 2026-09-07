import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/rbac.middleware.js';
import { prisma } from '../../config/database.js';
import { AppError } from '../../middleware/error.middleware.js';
export const notificationsRouter = Router();
notificationsRouter.get('/api/notifications', authenticate, requireRole('candidate'), async (request, response, next) => { try { const candidate = await prisma.candidate.findUnique({ where: { userId: request.auth!.id } }); if (!candidate) throw new AppError(404, 'CANDIDATE_NOT_FOUND', 'Candidate profile not found'); const notifications = await prisma.notificationLog.findMany({ where: { recipientType: 'candidate', recipientId: candidate.id }, orderBy: { timestamp: 'desc' } }); response.json({ success: true, data: { notifications } }); } catch (error) { next(error); } });
notificationsRouter.post('/api/notifications/:notificationId/read', authenticate, requireRole('candidate'), async (request, response, next) => { try { const candidate = await prisma.candidate.findUnique({ where: { userId: request.auth!.id } }); const notification = await prisma.notificationLog.updateMany({ where: { id: String(request.params.notificationId), recipientType: 'candidate', recipientId: candidate?.id }, data: { readAt: new Date() } }); if (!notification.count) throw new AppError(404, 'NOTIFICATION_NOT_FOUND', 'Notification not found'); response.json({ success: true, data: { read: true } }); } catch (error) { next(error); } });

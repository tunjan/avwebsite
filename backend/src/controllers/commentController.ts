import { Request, Response } from 'express';
import prisma from '../db';
import { User } from '@prisma/client';

export const getComments = async (req: Request, res: Response) => {
    const { eventId, announcementId } = req.query;

    if (!eventId && !announcementId) {
        return res.status(400).json({ message: 'A target ID (eventId or announcementId) is required.' });
    }

    const whereClause: any = {};
    if (eventId) whereClause.eventId = eventId as string;
    if (announcementId) whereClause.announcementId = announcementId as string;

    try {
        const comments = await prisma.comment.findMany({
            where: whereClause,
            include: {
                author: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: 'asc' }
        });
        res.json(comments);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch comments.' });
    }
};

export const createComment = async (req: Request, res: Response) => {
    const user = req.user as User;
    const { content, eventId, announcementId } = req.body;

    if (!content || !content.trim()) {
        return res.status(400).json({ message: 'Comment content cannot be empty.' });
    }
    if (!eventId && !announcementId) {
        return res.status(400).json({ message: 'A target ID (eventId or announcementId) is required.' });
    }

    try {
        const comment = await prisma.comment.create({
            data: {
                content,
                authorId: user.id,
                eventId: eventId || undefined,
                announcementId: announcementId || undefined
            },
            include: {
                author: { select: { id: true, name: true } }
            }
        });
        res.status(201).json(comment);
    } catch (error) {
        res.status(500).json({ message: 'Failed to create comment.' });
    }
};
import { Request, Response } from 'express';
import prisma from '../db';
import { User, Role } from '@prisma/client';

export const getAnnouncements = async (req: Request, res: Response) => {
    const user = req.user as User;

    try {
        let chapterIdsToQuery: string[] = [];
        let regionIdsToQuery: string[] = [];

        // --- HIERARCHICAL VISIBILITY LOGIC ---
        // Get chapters the user is an explicit member of
        const userMemberships = await prisma.chapterMembership.findMany({
            where: { userId: user.id },
            include: { chapter: { select: { id: true, regionId: true } } }
        });
        chapterIdsToQuery.push(...userMemberships.map(m => m.chapter.id));
        const explicitRegionIds = userMemberships.map(m => m.chapter.regionId).filter((id): id is string => id !== null);
        regionIdsToQuery.push(...explicitRegionIds);

        // Add implicit visibility based on role
        if (user.role === Role.COFOUNDER) {
            const allRegions = await prisma.region.findMany({ select: { id: true } });
            regionIdsToQuery.push(...allRegions.map(r => r.id));
            // Co-founders see all, so chapter/region filtering becomes moot, but we build for consistency
        } else if (user.role === Role.REGIONAL_ORGANISER && user.managedRegionId) {
            regionIdsToQuery.push(user.managedRegionId);
        }

        const uniqueRegionIds = [...new Set(regionIdsToQuery)];

        const announcements = await prisma.announcement.findMany({
            where: {
                OR: [
                    { scope: 'GLOBAL' },
                    { scope: 'REGIONAL', regionId: { in: uniqueRegionIds } },
                    { scope: 'CITY', chapterId: { in: chapterIdsToQuery } },
                ]
            },
            orderBy: { createdAt: 'desc' },
            include: {
                author: { select: { id: true, name: true } },
                chapter: { select: { name: true, regionId: true } },
                region: { select: { name: true } },
            }
        });
        res.json(announcements);

    } catch (error) {
        console.error("Failed to fetch announcements:", error);
        res.status(500).json({ message: 'Failed to fetch announcements.' });
    }
};

export const createAnnouncement = async (req: Request, res: Response) => {
    const user = req.user as User;
    const { title, content, scope, chapterId, regionId } = req.body;

    try {
        const data: any = {
            title, content, scope,
            authorId: user.id,
            authorRole: user.role
        };
        if (scope === 'CITY' && chapterId) data.chapterId = chapterId;
        if (scope === 'REGIONAL' && regionId) data.regionId = regionId;

        const announcement = await prisma.announcement.create({
            data,
            include: {
                author: { select: { id: true, name: true } },
                chapter: { select: { name: true, regionId: true } },
                region: { select: { name: true } },
            }
        });
        res.status(201).json(announcement);
    } catch (error) {
        console.error("Failed to create announcement:", error);
        res.status(500).json({ message: 'Failed to create announcement.' });
    }
};

export const getAnnouncementById = async (req: Request, res: Response) => {
    const { announcementId } = req.params;
    const canModify = (req as any).canModify;

    try {
        const announcement = await prisma.announcement.findUnique({
            where: { id: announcementId },
            include: {
                author: { select: { id: true, name: true } },
                chapter: { select: { id: true, name: true, regionId: true } },
                region: { select: { id: true, name: true } },
            }
        });

        if (!announcement) {
            return res.status(404).json({ message: 'Announcement not found.' });
        }
        res.json({ ...announcement, canModify });
    } catch (error) {
        console.error("Failed to fetch announcement:", error);
        res.status(500).json({ message: 'Failed to fetch announcement.' });
    }
};

export const updateAnnouncement = async (req: Request, res: Response) => {
    const { announcementId } = req.params;
    const { title, content } = req.body;
    try {
        const updated = await prisma.announcement.update({
            where: { id: announcementId },
            data: { title, content },
            include: {
                author: { select: { id: true, name: true } },
                chapter: { select: { id: true, name: true, regionId: true } },
                region: { select: { id: true, name: true } },
            }
        });
        res.json(updated);
    } catch (error) {
        console.error("Failed to update announcement:", error);
        res.status(500).json({ message: 'Failed to update announcement.' });
    }
};

export const deleteAnnouncement = async (req: Request, res: Response) => {
    const { announcementId } = req.params;
    try {
        await prisma.announcement.delete({ where: { id: announcementId } });
        res.status(204).send();
    } catch (error) {
        console.error("Failed to delete announcement:", error);
        res.status(500).json({ message: 'Failed to delete announcement.' });
    }
};
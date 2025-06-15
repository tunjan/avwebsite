import { Request, Response } from 'express';
import prisma from '../db';
import { User, Role, Chapter } from '@prisma/client';

export const getAllChapters = async (req: Request, res: Response) => {
    try {
        const chapters = await prisma.chapter.findMany({
            orderBy: { name: 'asc' },
            select: {
                id: true,
                name: true,
                description: true,
                regionId: true
            }
        });
        res.json(chapters);
    } catch (error) {
        console.error("Failed to get all chapters:", error);
        res.status(500).json({ message: 'Failed to fetch chapters' });
    }
};

export const getChapterStats = async (req: Request, res: Response) => {
    const { chapterId } = req.params;
    try {
        const chapter = await prisma.chapter.findUnique({ where: { id: chapterId }, select: { name: true } });
        if (!chapter) {
            return res.status(404).json({ message: 'Chapter not found' });
        }

        const attendedRegistrations = await prisma.eventRegistration.findMany({
            where: {
                attended: true,
                event: { chapterId: chapterId },
            },
            include: {
                event: { select: { startTime: true, endTime: true } },
            },
        });

        const totalHours = attendedRegistrations.reduce((sum, reg) => {
            if (!reg.event.startTime || !reg.event.endTime) return sum;
            const durationMs = reg.event.endTime.getTime() - reg.event.startTime.getTime();
            return sum + (durationMs / (1000 * 60 * 60));
        }, 0);

        const totalEvents = await prisma.event.count({ where: { chapterId } });

        res.json({
            name: chapter.name,
            totalEvents,
            totalHours: parseFloat(totalHours.toFixed(2)),
        });
    } catch (error) {
        console.error(`Failed to fetch chapter stats for ${chapterId}:`, error);
        res.status(500).json({ message: 'Failed to fetch chapter stats' });
    }
};

export const getMyChapters = async (req: Request, res: Response) => {
    const user = req.user as User;
    try {
        const memberships = await prisma.chapterMembership.findMany({
            where: { userId: user.id },
            include: { chapter: true }
        });
        res.json(memberships.map(m => m.chapter));
    } catch (error) {
        console.error("Error fetching 'My Chapters':", error);
        res.status(500).json({ message: "Failed to fetch user's chapters" });
    }
};

export const requestToJoinChapter = async (req: Request, res: Response) => {
    const user = req.user as User;
    const { chapterId } = req.params;

    try {
        const existingMembership = await prisma.chapterMembership.findUnique({ where: { userId_chapterId: { userId: user.id, chapterId } } });
        if (existingMembership) return res.status(409).json({ message: "You are already a member of this chapter." });

        const existingRequest = await prisma.joinRequest.findFirst({ where: { userId: user.id, chapterId: chapterId } });
        if (existingRequest) return res.status(409).json({ message: "You already have a pending request to join this chapter." });

        await prisma.joinRequest.create({ data: { userId: user.id, chapterId: chapterId } });
        return res.status(201).json({ message: 'Your request to join has been sent.' });
    } catch (error) {
        console.error(`Error on join request for user ${user.id} to chapter ${chapterId}:`, error);
        res.status(500).json({ message: 'Failed to process request.' });
    }
};

export const getPendingRequests = async (req: Request, res: Response) => {
    const { chapterId } = req.params;
    try {
        const requests = await prisma.joinRequest.findMany({
            where: { chapterId: chapterId, status: 'PENDING' },
            include: { user: { select: { id: true, name: true, email: true } } },
            orderBy: { createdAt: 'asc' }
        });
        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch join requests.' });
    }
};

export const manageJoinRequest = async (req: Request, res: Response) => {
    const { requestId } = req.params;
    const { approve } = req.body;

    if (typeof approve !== 'boolean') {
        return res.status(400).json({ message: 'Approval status is required.' });
    }

    try {
        const request = await prisma.joinRequest.findUnique({ where: { id: requestId } });
        if (!request) {
            return res.status(404).json({ message: "Request not found." });
        }

        await prisma.$transaction(async (tx) => {
            if (approve) {
                await tx.chapterMembership.create({
                    data: {
                        userId: request.userId,
                        chapterId: request.chapterId,
                        role: Role.ACTIVIST
                    }
                });
            }
            await tx.joinRequest.delete({ where: { id: requestId } });
        });

        res.json({ message: `Request ${approve ? 'approved' : 'denied'}.` });
    } catch (error) {
        console.error(`Failed to process request ${requestId}:`, error);
        res.status(500).json({ message: 'Failed to process request.' });
    }
};

export const getChapterMembers = async (req: Request, res: Response) => {
    const manager = req.user as User;
    const { chapterId } = req.params;
    let canManage = false;

    // This logic determines if the 'Manage' UI should be shown on the frontend.
    // The actual management actions are protected by `canManageChapterMembers` middleware.
    if (manager.role === Role.COFOUNDER) {
        canManage = true;
    } else if (manager.role === Role.REGIONAL_ORGANISER) {
        const chapter = await prisma.chapter.findUnique({ where: { id: chapterId } });
        if (chapter && chapter.regionId === manager.managedRegionId) {
            canManage = true;
        }
    } else { // Check for City Organiser role
        const membership = await prisma.chapterMembership.findUnique({
            where: { userId_chapterId: { userId: manager.id, chapterId: chapterId } },
        });
        if (membership && membership.role === Role.CITY_ORGANISER) {
            canManage = true;
        }
    }

    try {
        const memberships = await prisma.chapterMembership.findMany({
            where: { chapterId },
            include: { user: { select: { id: true, name: true, email: true, role: true } } },
            orderBy: { user: { name: 'asc' } },
        });
        const members = memberships.map(m => m.user);
        res.json({ members, canManage });
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch chapter members." });
    }
}

export const addChapterMember = async (req: Request, res: Response) => {
    const { chapterId, userId } = req.params;
    try {
        await prisma.chapterMembership.upsert({
            where: { userId_chapterId: { userId, chapterId } },
            update: {},
            create: { chapterId, userId, role: Role.ACTIVIST },
        });
        res.status(201).json({ message: 'Member added successfully.' });
    } catch (error) {
        res.status(409).json({ message: 'Failed to add member.' });
    }
}

export const removeChapterMember = async (req: Request, res: Response) => {
    const { chapterId, userId } = req.params;
    try {
        await prisma.chapterMembership.delete({
            where: { userId_chapterId: { userId, chapterId } }
        });
        // Also demote user if they have no other memberships and are not a higher role
        const user = await prisma.user.findUnique({ where: { id: userId }, include: { memberships: true } });
        if (user && user.role === 'CITY_ORGANISER' && user.memberships.length === 1) { // They were removed from their only chapter
            await prisma.user.update({ where: { id: userId }, data: { role: 'ACTIVIST' } });
        }
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Failed to remove member.' });
    }
};

export const getChaptersByRegion = async (req: Request, res: Response) => {
    const { regionId } = req.params;
    try {
        const chapters = await prisma.chapter.findMany({
            where: { regionId },
            orderBy: { name: 'asc' },
            select: { id: true, name: true }
        });
        res.json(chapters);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch chapters for the region." });
    }
};

export const createChapter = async (req: Request, res: Response) => {
    const { name, description, regionId } = req.body;
    try {
        const newChapter = await prisma.chapter.create({
            data: { name, description, regionId }
        });
        res.status(201).json(newChapter);
    } catch (error: any) {
        if (error.code === 'P2002') {
            return res.status(409).json({ message: `A chapter with the name "${name}" already exists.` });
        }
        res.status(500).json({ message: 'Failed to create chapter.' });
    }
};

export const getMyManagedChapters = async (req: Request, res: Response) => {
    const user = req.user as User;
    try {
        let managedChapters: Chapter[] = [];
        if (user.role === Role.COFOUNDER) {
            managedChapters = await prisma.chapter.findMany();
        } else if (user.role === Role.REGIONAL_ORGANISER && user.managedRegionId) {
            managedChapters = await prisma.chapter.findMany({
                where: { regionId: user.managedRegionId }
            });
        }
        const cityOrganiserMemberships = await prisma.chapterMembership.findMany({
            where: { userId: user.id, role: Role.CITY_ORGANISER },
            include: { chapter: true }
        });
        managedChapters.push(...cityOrganiserMemberships.map(m => m.chapter));

        const uniqueChapters = Array.from(new Map(managedChapters.map(c => [c.id, c])).values());
        res.json(uniqueChapters.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch managed chapters." });
    }
}

export const becomeOfficialMember = async (req: Request, res: Response) => {
    const user = req.user as User;
    const { chapterId } = req.params;
    try {
        const chapter = await prisma.chapter.findUnique({ where: { id: chapterId } });
        if (!chapter) {
            return res.status(404).json({ message: "Chapter not found." });
        }
        let canDirectlyJoin = user.role === Role.COFOUNDER || (user.role === Role.REGIONAL_ORGANISER && user.managedRegionId === chapter.regionId);
        if (!canDirectlyJoin) {
            return res.status(403).json({ message: "Forbidden." });
        }
        await prisma.chapterMembership.upsert({
            where: { userId_chapterId: { userId: user.id, chapterId: chapterId } },
            update: { role: Role.CITY_ORGANISER },
            create: { userId: user.id, chapterId: chapterId, role: Role.CITY_ORGANISER },
        });
        res.status(201).json({ message: "You are now an official member of the chapter." });
    } catch (error) {
        res.status(500).json({ message: 'An error occurred.' });
    }
};
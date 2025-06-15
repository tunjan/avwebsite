import { Request, Response } from 'express';
import prisma from '../db';
import { User, Role } from '@prisma/client';

export const getUserStats = async (req: Request, res: Response) => {
    const user = req.user as User;

    try {
        const attendedRegistrations = await prisma.eventRegistration.findMany({
            where: {
                userId: user.id,
                attended: true,
            },
            include: {
                event: {
                    select: { startTime: true, endTime: true }
                }
            }
        });

        const totalHours = attendedRegistrations.reduce((sum, reg) => {
            if (!reg.event.startTime || !reg.event.endTime) return sum;
            const durationMs = reg.event.endTime.getTime() - reg.event.startTime.getTime();
            return sum + (durationMs / (1000 * 60 * 60));
        }, 0);

        res.json({
            participatedEvents: attendedRegistrations.length,
            totalHours: parseFloat(totalHours.toFixed(2)),
        });

    } catch (error) {
        console.error("Failed to get user stats:", error);
        res.status(500).json({ message: 'Failed to fetch user statistics.' });
    }
}

export const getOrganizerSummary = async (req: Request, res: Response) => {
    const user = req.user as User;

    if (user.role === Role.ACTIVIST) {
        return res.status(403).json({ message: "This summary is for organizers only." });
    }

    try {
        let managedChapterIds: string[] = [];
        let managedRegionIds: string[] = [];

        if (user.role === Role.COFOUNDER) {
            const allChapters = await prisma.chapter.findMany({ select: { id: true } });
            managedChapterIds = allChapters.map(c => c.id);
        } else {
            if (user.role === Role.REGIONAL_ORGANISER && user.managedRegionId) {
                const chaptersInRegion = await prisma.chapter.findMany({
                    where: { regionId: user.managedRegionId },
                    select: { id: true }
                });
                managedChapterIds.push(...chaptersInRegion.map(c => c.id));
                managedRegionIds.push(user.managedRegionId);
            }
            const cityOrganiserMemberships = await prisma.chapterMembership.findMany({
                where: { userId: user.id, role: Role.CITY_ORGANISER },
                select: { chapterId: true }
            });
            managedChapterIds.push(...cityOrganiserMemberships.map(m => m.chapterId));
        }

        const uniqueManagedChapterIds = [...new Set(managedChapterIds)];

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const [pendingJoinRequests, upcomingManagedEvents, totalMembers, recentGrowth] = await Promise.all([
            prisma.joinRequest.findMany({
                where: { status: 'PENDING', chapterId: { in: uniqueManagedChapterIds } },
                include: { user: { select: { name: true } }, chapter: { select: { name: true } } },
                orderBy: { createdAt: 'desc' },
                take: 5,
            }),
            prisma.event.findMany({
                where: {
                    startTime: { gte: new Date() },
                    OR: [
                        { chapterId: { in: uniqueManagedChapterIds } },
                        { regionId: { in: managedRegionIds } }
                    ]
                },
                orderBy: { startTime: 'asc' },
                take: 5,
            }),
            uniqueManagedChapterIds.length > 0 ? prisma.chapterMembership.count({ where: { chapterId: { in: uniqueManagedChapterIds } } }) : 0,
            uniqueManagedChapterIds.length > 0 ? prisma.chapterMembership.count({
                where: {
                    chapterId: { in: uniqueManagedChapterIds },
                    joinedAt: { gte: thirtyDaysAgo }
                }
            }) : 0
        ]);

        res.json({
            pendingJoinRequests,
            upcomingManagedEvents,
            stats: { totalMembers, recentGrowth }
        });

    } catch (error) {
        console.error("Error fetching organizer summary:", error);
        res.status(500).json({ message: 'Failed to fetch organizer summary.' });
    }
}
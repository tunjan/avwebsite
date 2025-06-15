import { Request, Response } from 'express';
import prisma from '../db';
import { User, Role } from '@prisma/client';

// Fetch announcements relevant to the current user
export const getAnnouncements = async (req: Request, res: Response) => {
    const user = req.user as User;

    try {
        const userMemberships = await prisma.teamMembership.findMany({
            where: { userId: user.id },
            include: { team: { select: { id: true, regionId: true } } }
        });

        const userTeamIds = userMemberships.map(m => m.team.id);
        const userRegionIds = [...new Set(userMemberships.map(m => m.team.regionId))];

        const announcements = await prisma.announcement.findMany({
            where: {
                OR: [
                    { scope: 'GLOBAL' },
                    { scope: 'REGIONAL', regionId: { in: userRegionIds } },
                    { scope: 'CITY', teamId: { in: userTeamIds } },
                ]
            },
            orderBy: { createdAt: 'desc' },
            include: {
                author: { select: { name: true } },
                team: { select: { name: true } },
                region: { select: { name: true } },
            }
        });
        res.json(announcements);

    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch announcements.' });
    }
};

// Create a new announcement
export const createAnnouncement = async (req: Request, res: Response) => {
    const user = req.user as User;
    const { title, content, scope, teamId, regionId } = req.body;

    // --- Authorization Check ---
    if (scope === 'GLOBAL' && user.role !== Role.COFOUNDER) {
        return res.status(403).json({ message: 'Forbidden: Only co-founders can make global announcements.' });
    }
    if (scope === 'REGIONAL' && user.role !== Role.REGIONAL_ORGANISER && user.role !== Role.COFOUNDER) {
        return res.status(403).json({ message: 'Forbidden: You do not have permission for regional announcements.' });
    }
    if (scope === 'CITY' && user.role === Role.ACTIVIST) {
        return res.status(403).json({ message: 'Forbidden: You do not have permission to make announcements.' });
    }
    // A deeper check would ensure a regional organiser is posting to their own region, etc.

    try {
        const data: any = { title, content, scope, authorId: user.id };
        if (scope === 'CITY' && teamId) data.teamId = teamId;
        if (scope === 'REGIONAL' && regionId) data.regionId = regionId;

        const announcement = await prisma.announcement.create({ data });
        res.status(201).json(announcement);
    } catch (error) {
        res.status(500).json({ message: 'Failed to create announcement.' });
    }
};
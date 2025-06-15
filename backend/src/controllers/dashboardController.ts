import { Request, Response } from 'express';
import prisma from '../db';
import { User } from '@prisma/client';

export const getUserStats = async (req: Request, res: Response) => {
    const user = req.user as User;

    try {
        // 1. Count the number of events the user actually attended
        const attendedEventsCount = await prisma.eventRegistration.count({
            where: {
                userId: user.id,
                attended: true,
            }
        });

        // 2. Calculate the total hours from those attended events
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
            const durationMs = reg.event.endTime.getTime() - reg.event.startTime.getTime();
            const durationHours = durationMs / (1000 * 60 * 60);
            return sum + durationHours;
        }, 0);

        res.json({
            participatedEvents: attendedEventsCount,
            totalHours: parseFloat(totalHours.toFixed(2)),
        });

    } catch (error) {
        console.error("Failed to get user stats:", error);
        res.status(500).json({ message: 'Failed to fetch user statistics.' });
    }
}

// ... (imports and existing getUserStats function)

export const getOrganizerSummary = async (req: Request, res: Response) => {
    const user = req.user as User;

    try {
        let managedTeamIds: string[] = [];
        let pendingRequestsQuery: any = { where: { status: 'PENDING' } };
        let upcomingEventsQuery: any = { where: { startTime: { gte: new Date() } } };

        // Tailor queries based on user role
        if (user.role === 'CITY_ORGANISER') {
            const memberships = await prisma.teamMembership.findMany({ where: { userId: user.id }, select: { teamId: true } });
            managedTeamIds = memberships.map(m => m.teamId);
            pendingRequestsQuery.where.teamId = { in: managedTeamIds };
            upcomingEventsQuery.where.teamId = { in: managedTeamIds };
        } else if (user.role === 'REGIONAL_ORGANISER' && user.managedRegionId) {
            const teamsInRegion = await prisma.team.findMany({ where: { regionId: user.managedRegionId }, select: { id: true } });
            managedTeamIds = teamsInRegion.map(t => t.id);
            pendingRequestsQuery.where.teamId = { in: managedTeamIds };
            upcomingEventsQuery.where.OR = [
                { teamId: { in: managedTeamIds } },
                { regionId: user.managedRegionId }
            ];
        } // COFOUNDER will have no restrictions, fetching all

        // --- Execute Queries ---
        const pendingJoinRequests = await prisma.joinRequest.findMany({
            ...pendingRequestsQuery,
            include: { user: { select: { name: true } }, team: { select: { name: true } } },
            orderBy: { createdAt: 'desc' },
            take: 5,
        });

        const upcomingManagedEvents = await prisma.event.findMany({
            ...upcomingEventsQuery,
            orderBy: { startTime: 'asc' },
            take: 5,
        });

        const totalMembers = managedTeamIds.length > 0 ? await prisma.teamMembership.count({ where: { teamId: { in: managedTeamIds } } }) : 0;

        // For recent growth, count members who joined in the last 30 days
        const recentGrowth = managedTeamIds.length > 0 ? await prisma.teamMembership.count({
            where: {
                teamId: { in: managedTeamIds },
                joinedAt: { gte: new Date(new Date().setDate(new Date().getDate() - 30)) }
            }
        }) : 0;

        res.json({
            pendingJoinRequests,
            upcomingManagedEvents,
            stats: {
                totalMembers,
                recentGrowth
            }
        });

    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch organizer summary.' });
    }
}
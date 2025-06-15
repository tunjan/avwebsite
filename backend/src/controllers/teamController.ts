import { Request, Response } from 'express';
import prisma from '../db';
import { User, Role, Team } from '@prisma/client';

export const getAllTeams = async (req: Request, res: Response) => {
    try {
        const teams = await prisma.team.findMany({
            orderBy: { name: 'asc' },
        });
        res.json(teams);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch teams' });
    }
};

export const getTeamStats = async (req: Request, res: Response) => {
    const { teamId } = req.params;
    try {
        const attendedRegistrations = await prisma.eventRegistration.findMany({
            where: {
                attended: true,
                event: {
                    teamId: teamId,
                },
            },
            include: {
                event: {
                    select: { startTime: true, endTime: true },
                },
            },
        });

        const totalHours = attendedRegistrations.reduce((sum, reg) => {
            const durationMs = reg.event.endTime.getTime() - reg.event.startTime.getTime();
            const durationHours = durationMs / (1000 * 60 * 60);
            return sum + durationHours;
        }, 0);

        const totalEvents = await prisma.event.count({ where: { teamId } });

        res.json({
            totalEvents: totalEvents,
            totalHours: parseFloat(totalHours.toFixed(2)),
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch team stats' });
    }
};

export const getMyTeams = async (req: Request, res: Response) => {
    const user = req.user as User;

    try {
        let finalTeams: Team[] = [];

        // 1. Start with teams the user is an explicit member of
        const explicitMemberships = await prisma.teamMembership.findMany({
            where: { userId: user.id },
            include: { team: true },
        });
        finalTeams.push(...explicitMemberships.map(m => m.team));

        // 2. Add implicit memberships based on hierarchical role
        if (user.role === Role.COFOUNDER) {
            const allTeams = await prisma.team.findMany();
            finalTeams.push(...allTeams);
        } else if (user.role === Role.REGIONAL_ORGANISER && user.managedRegionId) {
            const teamsInRegion = await prisma.team.findMany({
                where: { regionId: user.managedRegionId },
            });
            finalTeams.push(...teamsInRegion);
        }

        // 3. De-duplicate the results to ensure each team appears only once
        const uniqueTeams = new Map(finalTeams.map(team => [team.id, team]));

        // 4. Sort the final list alphabetically by name
        const sortedTeams = Array.from(uniqueTeams.values()).sort((a, b) => a.name.localeCompare(b.name));

        res.json(sortedTeams);

    } catch (error) {
        console.error("Error fetching 'My Teams':", error);
        res.status(500).json({ message: "Failed to fetch user's teams" });
    }
};

// --- THIS FUNCTION IS ALSO CORRECTED ---
export const requestToJoinTeam = async (req: Request, res: Response) => {
    const user = req.user as User;
    const { teamId } = req.params;

    try {
        const teamToJoin = await prisma.team.findUnique({ where: { id: teamId } });
        if (!teamToJoin) {
            return res.status(404).json({ message: "Team not found." });
        }

        // --- NEW AUTHORIZATION LOGIC ---
        // Block organizers from requesting to join teams they already manage
        if (user.role === Role.COFOUNDER) {
            return res.status(409).json({ message: "You are already a member of all teams." });
        }
        if (user.role === Role.REGIONAL_ORGANISER && user.managedRegionId === teamToJoin.regionId) {
            return res.status(409).json({ message: "You are already a member of all teams in this region." });
        }
        // --- END NEW LOGIC ---

        const existingMembership = await prisma.teamMembership.findUnique({
            where: { userId_teamId: { userId: user.id, teamId } }
        });
        if (existingMembership) {
            return res.status(409).json({ message: "You are already a member of this team." });
        }

        const existingRequest = await prisma.joinRequest.findUnique({
            where: { userId_teamId: { userId: user.id, teamId } }
        });
        if (existingRequest) {
            return res.status(409).json({ message: "You already have a pending request to join this team." });
        }

        await prisma.joinRequest.create({
            data: { userId: user.id, teamId: teamId }
        });

        res.status(201).json({ message: 'Your request to join has been sent.' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to send join request.' });
    }
}

export const getPendingRequests = async (req: Request, res: Response) => {
    const { teamId } = req.params;
    try {
        const requests = await prisma.joinRequest.findMany({
            where: { teamId: teamId, status: 'PENDING' },
            include: { user: { select: { id: true, name: true, email: true } } },
            orderBy: { createdAt: 'asc' }
        });
        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch join requests.' });
    }
};

export const manageJoinRequest = async (req: Request, res: Response) => {
    const { teamId, requestId } = req.params;
    const { approve } = req.body;

    if (typeof approve !== 'boolean') {
        return res.status(400).json({ message: 'Approval status is required.' });
    }

    try {
        const request = await prisma.joinRequest.findUnique({ where: { id: requestId } });
        if (!request || request.teamId !== teamId) {
            throw new Error("Request not found or does not belong to this team.");
        }

        if (approve) {
            await prisma.$transaction(async (tx) => {
                await tx.teamMembership.create({
                    data: { userId: request.userId, teamId: request.teamId }
                });
                await tx.joinRequest.delete({ where: { id: requestId } });
            });
            res.json({ message: 'Request approved and member added.' });
        } else {
            await prisma.joinRequest.delete({ where: { id: requestId } });
            res.json({ message: 'Request denied.' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Failed to process request.' });
    }
};

export const getTeamMembers = async (req: Request, res: Response) => {
    const manager = req.user as User;
    const { teamId } = req.params;

    let canManage = false;
    if (manager.role === Role.COFOUNDER) {
        canManage = true;
    } else if (manager.role === Role.REGIONAL_ORGANISER) {
        const team = await prisma.team.findUnique({ where: { id: teamId } });
        if (team && team.regionId === manager.managedRegionId) {
            canManage = true;
        }
    } else if (manager.role === Role.CITY_ORGANISER) {
        const membership = await prisma.teamMembership.findUnique({
            where: { userId_teamId: { userId: manager.id, teamId: teamId } },
        });
        if (membership) {
            canManage = true;
        }
    }

    try {
        const memberships = await prisma.teamMembership.findMany({
            where: { teamId },
            include: { user: { select: { id: true, name: true, email: true } } },
            orderBy: { user: { name: 'asc' } },
        });
        const members = memberships.map(m => m.user);
        res.json({ members, canManage });
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch team members." });
    }
}

export const addTeamMember = async (req: Request, res: Response) => {
    const { teamId, userId } = req.params;
    try {
        await prisma.teamMembership.create({
            data: { teamId, userId }
        });
        res.status(201).json({ message: 'Member added successfully.' });
    } catch (error) {
        res.status(409).json({ message: 'Failed to add member. They may already be in the team.' });
    }
}

export const removeTeamMember = async (req: Request, res: Response) => {
    const { teamId, userId } = req.params;
    try {
        await prisma.teamMembership.delete({
            where: { userId_teamId: { userId, teamId } }
        });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Failed to remove member.' });
    }
};

export const getTeamsByRegion = async (req: Request, res: Response) => {
    const { regionId } = req.params;
    try {
        const teams = await prisma.team.findMany({
            where: { regionId },
            orderBy: { name: 'asc' },
            select: { id: true, name: true }
        });
        res.json(teams);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch teams for the region." });
    }
};
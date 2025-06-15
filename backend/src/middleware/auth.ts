import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { User, Role } from '@prisma/client';
import prisma from '../db';

export const isAuthenticated = passport.authenticate('jwt', { session: false });

export const canCreateEvents = async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as User;
    const { teamId } = req.body;

    if (!teamId) {
        return res.status(400).json({ message: 'A teamId is required to create an event.' });
    }

    if (user.role === Role.COFOUNDER || user.role === Role.REGIONAL_ORGANISER) {
        return next();
    }

    if (user.role === Role.CITY_ORGANISER) {
        const membership = await prisma.teamMembership.findUnique({
            where: { userId_teamId: { userId: user.id, teamId: teamId } },
        });
        if (membership) {
            return next();
        }
    }

    return res.status(403).json({ message: 'Forbidden: You do not have permission to create an event for this team.' });
};

export const canManageTeamAssets = async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as User;
    const { teamId } = req.body;

    if (!teamId) {
        return res.status(400).json({ message: 'Team ID is required.' });
    }

    if (user.role === Role.COFOUNDER || user.role === Role.REGIONAL_ORGANISER) {
        return next();
    }

    if (user.role === Role.CITY_ORGANISER) {
        const membership = await prisma.teamMembership.findUnique({
            where: { userId_teamId: { userId: user.id, teamId: teamId } },
        });
        if (membership) {
            return next();
        }
    }

    return res.status(403).json({ message: 'Forbidden: You do not have permission for this team.' });
};

export const canManageTeamMembers = async (req: Request, res: Response, next: NextFunction) => {
    const manager = req.user as User;
    const { teamId } = req.params;

    if (!teamId) {
        return res.status(400).json({ message: 'Team ID parameter is required.' });
    }

    if (manager.role === Role.COFOUNDER) {
        return next();
    }

    if (manager.role === Role.REGIONAL_ORGANISER) {
        if (!manager.managedRegionId) {
            return res.status(403).json({ message: 'Forbidden: You are not assigned to a region.' });
        }
        const team = await prisma.team.findUnique({ where: { id: teamId } });
        if (team && team.regionId === manager.managedRegionId) {
            return next();
        }
    }

    if (manager.role === Role.CITY_ORGANISER) {
        const membership = await prisma.teamMembership.findUnique({
            where: { userId_teamId: { userId: manager.id, teamId: teamId } },
        });
        if (membership) {
            return next();
        }
    }

    return res.status(403).json({ message: 'Forbidden: You do not have permission to manage this team.' });
};

// --- NEW MIDDLEWARE ---
export const canViewTeam = async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as User;
    const { teamId } = req.params;

    // For simplicity, we allow higher roles to view any team.
    // A stricter rule might check if the team is in the Regional Organiser's region.
    if (user.role === Role.COFOUNDER || user.role === Role.REGIONAL_ORGANISER) {
        return next();
    }

    // Check for membership for any user role, including City Organiser and Activist
    const membership = await prisma.teamMembership.findUnique({
        where: { userId_teamId: { userId: user.id, teamId: teamId } },
    });

    if (membership) {
        return next(); // User is a member, allow them to view
    }

    // If no membership is found, deny access
    return res.status(403).json({ message: "You don't have permission to see the members of this team." });
};

export const canManageEvent = async (req: Request, res: Response, next: NextFunction) => {
    const manager = req.user as User;
    const { eventId } = req.params;

    try {
        const event = await prisma.event.findUnique({ where: { id: eventId } });
        if (!event) {
            return res.status(404).json({ message: 'Event not found.' });
        }
        const { teamId } = event;

        if (manager.role === Role.COFOUNDER) return next();

        if (manager.role === Role.REGIONAL_ORGANISER) {
            // --- THIS IS THE FIX ---
            // First, check if the manager is actually assigned to a region.
            if (!manager.managedRegionId) {
                return res.status(403).json({ message: "Forbidden: You are not a regional manager." });
            }
            // Only proceed if the ID exists.
            const team = await prisma.team.findUnique({ where: { id: teamId! } }); // Use non-null assertion `!` or check teamId
            if (team && team.regionId === manager.managedRegionId) return next();
        }

        if (manager.role === Role.CITY_ORGANISER) {
            // This part also needs a check that teamId is not null
            if (teamId) {
                const membership = await prisma.teamMembership.findUnique({
                    where: { userId_teamId: { userId: manager.id, teamId: teamId } },
                });
                if (membership) return next();
            }
        }

        return res.status(403).json({ message: 'Forbidden: You do not have permission to manage this event.' });

    } catch (error) {
        res.status(500).json({ message: 'An error occurred during authorization.' });
    }
};
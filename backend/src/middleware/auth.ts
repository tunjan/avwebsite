import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { User, Role } from '@prisma/client';
import prisma from '../db';

/**
 * Basic authentication middleware to ensure a user is logged in via a valid JWT.
 */
export const isAuthenticated = passport.authenticate('jwt', { session: false });

/**
 * Helper function to get a user's specific role within a given chapter.
 * Returns the role if they are a member, otherwise null.
 */
async function getUserChapterRole(userId: string, chapterId: string): Promise<Role | null> {
    const membership = await prisma.chapterMembership.findUnique({
        where: {
            userId_chapterId: { userId, chapterId }
        },
        select: { role: true }
    });
    return membership?.role || null;
}

/**
 * AUTHORIZATION MIDDLEWARE for creating content (Events, Trainings, Announcements).
 * This is the single source of truth for creation permissions.
 */
export const canCreateContent = async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as User;
    const { chapterId, regionId, scope } = req.body;

    // Rule 1: Co-founders can create any type of content.
    if (user.role === Role.COFOUNDER) {
        return next();
    }

    // Rule 2: Regional Organisers can create content in their region.
    if (user.role === Role.REGIONAL_ORGANISER) {
        if (!user.managedRegionId) {
            return res.status(403).json({ message: "Forbidden: You are not assigned to a region to manage." });
        }
        // Allow creating a REGIONAL item for their own region.
        if (scope === 'REGIONAL' && regionId === user.managedRegionId) {
            return next();
        }
        // Allow creating a CITY item for a chapter within their region.
        if (scope === 'CITY' && chapterId) {
            const chapter = await prisma.chapter.findFirst({ where: { id: chapterId, regionId: user.managedRegionId } });
            if (chapter) return next();
        }
    }

    // Rule 3: City Organisers can create content in their chapter.
    // We check against their explicit memberships for CITY_ORGANISER role.
    const cityOrganiserMemberships = await prisma.chapterMembership.findMany({
        where: { userId: user.id, role: Role.CITY_ORGANISER },
        select: { chapterId: true }
    });
    const managedChapterIds = cityOrganiserMemberships.map(m => m.chapterId);

    if (scope === 'CITY' && chapterId && managedChapterIds.includes(chapterId)) {
        return next();
    }

    // If no rule above passed, deny access.
    return res.status(403).json({ message: "Forbidden: You do not have the required role for this target to perform this action." });
};

/**
 * AUTHORIZATION MIDDLEWARE for modifying/deleting content (Events, Trainings, Announcements).
 * This is used on PUT/PATCH/DELETE routes.
 */
export const canModifyContent = async (req: Request, res: Response, next: NextFunction) => {
    const manager = req.user as User;
    const { announcementId, eventId, trainingId } = req.params;

    try {
        let content: any = null;
        if (announcementId) content = await prisma.announcement.findUnique({ where: { id: announcementId } });
        else if (eventId) content = await prisma.event.findUnique({ where: { id: eventId } });
        else if (trainingId) content = await prisma.training.findUnique({ where: { id: trainingId } });

        if (!content) return res.status(404).json({ message: 'Content not found.' });

        // Rule 1: You can always modify your own content.
        if (content.authorId === manager.id) return next();

        const rolePower = { COFOUNDER: 1, REGIONAL_ORGANISER: 2, CITY_ORGANISER: 3, ACTIVIST: 4 };
        const managerPower = rolePower[manager.role as keyof typeof rolePower];
        const authorPower = content.authorRole ? rolePower[content.authorRole as keyof typeof rolePower] : 4;

        // Rule 2: Cannot modify content from someone with equal or greater power.
        if (managerPower >= authorPower) {
            return res.status(403).json({ message: "Forbidden: You cannot modify content from a user at or above your level." });
        }

        // Rule 3: Hierarchical override (Co-founder can manage anything below them).
        if (manager.role === Role.COFOUNDER) return next();

        // Rule 4: Regional Organiser can manage city content within their region.
        if (manager.role === Role.REGIONAL_ORGANISER && content.scope === 'CITY' && content.chapterId) {
            const chapter = await prisma.chapter.findUnique({ where: { id: content.chapterId } });
            if (chapter && chapter.regionId === manager.managedRegionId) return next();
        }

        return res.status(403).json({ message: "Forbidden: You do not have permission to modify this content." });
    } catch (error) {
        return res.status(500).json({ message: 'Authorization error.' });
    }
}

/**
 * NEW MIDDLEWARE: Attaches a `canModify: boolean` flag to the request object for GET routes.
 * This tells the frontend whether to render 'Edit'/'Delete' buttons without duplicating logic.
 */
export const attachModificationPermission = async (req: Request, res: Response, next: NextFunction) => {
    const manager = req.user as User;
    const { announcementId, eventId, trainingId } = req.params;
    let canModify = false;

    try {
        let content: any = null;
        if (announcementId) content = await prisma.announcement.findUnique({ where: { id: announcementId } });
        else if (eventId) content = await prisma.event.findUnique({ where: { id: eventId } });
        else if (trainingId) content = await prisma.training.findUnique({ where: { id: trainingId } });

        if (content) {
            if (content.authorId === manager.id) {
                canModify = true;
            } else {
                const rolePower = { COFOUNDER: 1, REGIONAL_ORGANISER: 2, CITY_ORGANISER: 3, ACTIVIST: 4 };
                const managerPower = rolePower[manager.role as keyof typeof rolePower];
                const authorPower = content.authorRole ? rolePower[content.authorRole as keyof typeof rolePower] : 4;

                if (managerPower < authorPower) {
                    if (manager.role === Role.COFOUNDER) {
                        canModify = true;
                    } else if (manager.role === Role.REGIONAL_ORGANISER && content.scope === 'CITY' && content.chapterId) {
                        const chapter = await prisma.chapter.findUnique({ where: { id: content.chapterId } });
                        if (chapter && chapter.regionId === manager.managedRegionId) {
                            canModify = true;
                        }
                    }
                }
            }
        }
    } catch (error) {
        // Log the error but don't block the request; default to canModify = false
        console.error("Error in attachModificationPermission:", error);
    } finally {
        (req as any).canModify = canModify;
        next();
    }
};

/**
 * AUTHORIZATION MIDDLEWARE for managing chapter members.
 */
export const canManageChapterMembers = async (req: Request, res: Response, next: NextFunction) => {
    const manager = req.user as User;
    const { chapterId } = req.params;

    if (!chapterId) {
        return res.status(400).json({ message: 'Chapter ID parameter is required.' });
    }

    if (manager.role === Role.COFOUNDER) return next();

    if (manager.role === Role.REGIONAL_ORGANISER) {
        if (!manager.managedRegionId) return res.status(403).json({ message: 'Forbidden: You are not assigned to a region.' });
        const chapter = await prisma.chapter.findFirst({ where: { id: chapterId, regionId: manager.managedRegionId } });
        if (chapter) return next();
    }

    const chapterRole = await getUserChapterRole(manager.id, chapterId);
    if (chapterRole === Role.CITY_ORGANISER) {
        return next();
    }

    return res.status(403).json({ message: 'Forbidden: You do not have permission to manage this chapter.' });
};

/**
 * AUTHORIZATION MIDDLEWARE for creating new chapters.
 */
export const canCreateChapter = async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as User;
    const { regionId } = req.body;

    if (!regionId) {
        return res.status(400).json({ message: "A regionId is required to create a chapter." });
    }

    if (user.role === Role.COFOUNDER) return next();

    if (user.role === Role.REGIONAL_ORGANISER) {
        if (user.managedRegionId && user.managedRegionId === regionId) {
            return next();
        }
    }

    return res.status(403).json({ message: "Forbidden: You do not have permission to create a chapter in this region." });
}
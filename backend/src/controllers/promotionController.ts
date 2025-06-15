import { Request, Response } from 'express';
import prisma from '../db';
import { User, Role } from '@prisma/client';

export const promoteUser = async (req: Request, res: Response) => {
    const manager = req.user as User;
    const { userIdToPromote } = req.params;
    const { newRole, targetId } = req.body; // targetId could be a chapterId or regionId

    try {
        const userToPromote = await prisma.user.findUnique({ where: { id: userIdToPromote } });
        if (!userToPromote) {
            return res.status(404).json({ message: "User to promote not found." });
        }

        // --- AUTHORIZATION LOGIC ---
        const canPromote = await checkPromotionPermissions(manager, userToPromote, newRole, targetId);
        if (!canPromote.allowed) {
            return res.status(403).json({ message: canPromote.message });
        }

        // --- EXECUTE PROMOTION ---
        let updateData: any = { role: newRole };
        if (newRole === Role.REGIONAL_ORGANISER) {
            updateData.managedRegionId = targetId;
        }

        const promotedUser = await prisma.user.update({
            where: { id: userIdToPromote },
            data: updateData,
        });

        // If promoting to City Organiser, ensure they are a member of that chapter
        if (newRole === Role.CITY_ORGANISER && targetId) {
            await prisma.chapterMembership.upsert({
                where: { userId_chapterId: { userId: userIdToPromote, chapterId: targetId } },
                update: {},
                create: { userId: userIdToPromote, chapterId: targetId },
            });
        }

        res.json(promotedUser);

    } catch (error) {
        res.status(500).json({ message: "An error occurred during promotion." });
    }
}

// Helper function for complex permission checking
async function checkPromotionPermissions(manager: User, userToPromote: User, newRole: Role, targetId?: string): Promise<{ allowed: boolean, message: string }> {
    const rolePower = { COFOUNDER: 1, REGIONAL_ORGANISER: 2, CITY_ORGANISER: 3, ACTIVIST: 4 };
    const managerPower = rolePower[manager.role];
    const userToPromotePower = rolePower[userToPromote.role];

    // Rule 1: Cannot promote someone to a role at or above your own level.
    if (managerPower >= rolePower[newRole]) {
        return { allowed: false, message: "You cannot promote a user to a role equal to or greater than your own." };
    }

    // Rule 2: Cannot promote someone who is already at or above your level.
    if (managerPower >= userToPromotePower) {
        return { allowed: false, message: "You cannot promote a user who is at or above your own hierarchical level." };
    }

    // --- Role-Specific Rules ---
    switch (manager.role) {
        case Role.REGIONAL_ORGANISER:
            // Can only promote Activists to City Organisers within their own region.
            if (userToPromote.role !== Role.ACTIVIST || newRole !== Role.CITY_ORGANISER) {
                return { allowed: false, message: "Regional Organisers can only promote Activists to City Organisers." };
            }
            const chapter = await prisma.chapter.findUnique({ where: { id: targetId } });
            if (!chapter || chapter.regionId !== manager.managedRegionId) {
                return { allowed: false, message: "You can only promote users to chapters within your own region." };
            }
            break;

        case Role.CITY_ORGANISER:
            // City Organisers cannot promote anyone.
            return { allowed: false, message: "You do not have permission to promote users." };
    }

    // If we passed all checks (or the user is a Co-founder), allow it.
    return { allowed: true, message: "Permission granted." };
}
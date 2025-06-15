import { Request, Response } from 'express';
import prisma from '../db';
import { User, Role } from '@prisma/client';

export const createTraining = async (req: Request, res: Response) => {
    const user = req.user as User;
    const { title, description, startTime, duration, scope, chapterId, regionId } = req.body;

    try {
        const data: any = {
            title, description, scope,
            startTime: new Date(startTime),
            duration: parseFloat(duration),
            authorId: user.id,
            authorRole: user.role,
        };
        if (scope === 'CITY') data.chapterId = chapterId;
        else if (scope === 'REGIONAL') data.regionId = regionId;

        const training = await prisma.training.create({
            data,
            include: {
                author: { select: { id: true, name: true } },
                chapter: { select: { id: true, name: true, regionId: true } },
                region: { select: { id: true, name: true } },
            }
        });
        res.status(201).json(training);
    } catch (error) {
        console.error("Failed to create training:", error);
        res.status(500).json({ message: 'Failed to create training.' });
    }
};

export const getTrainings = async (req: Request, res: Response) => {
    const user = req.user as User;
    try {
        let chapterIdsToQuery: string[] = [];
        let regionIdsToQuery: string[] = [];

        const userMemberships = await prisma.chapterMembership.findMany({
            where: { userId: user.id },
            include: { chapter: { select: { id: true, regionId: true } } }
        });
        chapterIdsToQuery.push(...userMemberships.map(m => m.chapter.id));
        const explicitRegionIds = userMemberships.map(m => m.chapter.regionId).filter((id): id is string => id !== null);
        regionIdsToQuery.push(...explicitRegionIds);

        if (user.role === Role.COFOUNDER) {
            const allRegions = await prisma.region.findMany({ select: { id: true } });
            regionIdsToQuery.push(...allRegions.map(r => r.id));
        } else if (user.role === Role.REGIONAL_ORGANISER && user.managedRegionId) {
            regionIdsToQuery.push(user.managedRegionId);
        }

        const uniqueRegionIds = [...new Set(regionIdsToQuery)];
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const trainings = await prisma.training.findMany({
            where: {
                startTime: { gte: startOfToday },
                OR: [
                    { scope: 'GLOBAL' },
                    { scope: 'REGIONAL', regionId: { in: uniqueRegionIds } },
                    { scope: 'CITY', chapterId: { in: chapterIdsToQuery } },
                ]
            },
            orderBy: { startTime: 'asc' },
            include: {
                author: { select: { name: true } },
                chapter: { select: { name: true } },
                region: { select: { name: true } },
            }
        });

        const trainingIds = trainings.map(t => t.id);
        const userRegistrations = await prisma.trainingRegistration.findMany({
            where: { userId: user.id, trainingId: { in: trainingIds } },
            select: { trainingId: true }
        });
        const registeredTrainingIds = new Set(userRegistrations.map(reg => reg.trainingId));

        const trainingsWithStatus = trainings.map(training => ({
            ...training,
            isRegistered: registeredTrainingIds.has(training.id),
        }));
        res.json(trainingsWithStatus);
    } catch (error) {
        console.error("Failed to fetch trainings:", error);
        res.status(500).json({ message: 'Failed to fetch trainings.' });
    }
};

export const getTrainingById = async (req: Request, res: Response) => {
    const { trainingId } = req.params;
    const canModify = (req as any).canModify;
    try {
        const training = await prisma.training.findUnique({
            where: { id: trainingId },
            include: {
                author: { select: { id: true, name: true } },
                chapter: { select: { id: true, name: true, regionId: true } },
                region: { select: { id: true, name: true } },
            }
        });
        if (!training) return res.status(404).json({ message: 'Training not found.' });
        res.json({ ...training, canModify });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch training.' });
    }
};

export const updateTraining = async (req: Request, res: Response) => {
    const { trainingId } = req.params;
    const { title, description, startTime, duration } = req.body;
    try {
        const updated = await prisma.training.update({
            where: { id: trainingId },
            data: {
                title, description,
                startTime: startTime ? new Date(startTime) : undefined,
                duration: duration ? parseFloat(duration) : undefined,
            },
            include: {
                author: { select: { id: true, name: true } },
                chapter: { select: { id: true, name: true, regionId: true } },
                region: { select: { id: true, name: true } },
            }
        });
        res.json(updated);
    } catch (error) {
        console.error("Failed to update training:", error);
        res.status(500).json({ message: 'Failed to update training.' });
    }
};

export const deleteTraining = async (req: Request, res: Response) => {
    const { trainingId } = req.params;
    try {
        await prisma.$transaction([
            prisma.trainingRegistration.deleteMany({ where: { trainingId } }),
            prisma.training.delete({ where: { id: trainingId } })
        ]);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete training.' });
    }
};

export const rsvpToTraining = async (req: Request, res: Response) => {
    const user = req.user as User;
    const { trainingId } = req.params;
    try {
        await prisma.trainingRegistration.create({
            data: { userId: user.id, trainingId }
        });
        res.status(201).json({ message: "RSVP successful." });
    } catch (error: any) {
        if (error.code === 'P2002') {
            return res.status(409).json({ message: 'Already registered for this training.' });
        }
        res.status(500).json({ message: 'Failed to RSVP to training.' });
    }
};

export const cancelRsvp = async (req: Request, res: Response) => {
    const user = req.user as User;
    const { trainingId } = req.params;
    try {
        await prisma.trainingRegistration.delete({
            where: { userId_trainingId: { userId: user.id, trainingId } }
        });
        res.status(204).send();
    } catch (error: any) {
        if (error.code === 'P2025') {
            return res.status(404).json({ message: "Registration not found." });
        }
        res.status(500).json({ message: 'Failed to cancel RSVP.' });
    }
};
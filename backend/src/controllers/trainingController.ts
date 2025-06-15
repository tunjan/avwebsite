import { Request, Response } from 'express';
import prisma from '../db';
import { User } from '@prisma/client';

export const getTrainings = async (req: Request, res: Response) => {
    const user = req.user as User & { teamIds?: string[] };

    try {
        const trainings = await prisma.training.findMany({
            where: {
                startTime: { gte: new Date(), },
                OR: [
                    { scope: 'GLOBAL' },
                    { scope: 'REGIONAL', regionId: user.managedRegionId },
                    { scope: 'CITY', teamId: { in: user.teamIds || [] } }, // Check against the list of teams
                ],
            },
            // ... rest of the function remains the same
            orderBy: { startTime: 'asc' },
            include: { team: { select: { name: true } }, region: { select: { name: true } }, },
        });
        res.json(trainings);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to fetch trainings' });
    }
};

export const rsvpToTraining = async (req: Request, res: Response) => {
    const user = req.user as User;
    const { trainingId } = req.params;

    try {
        const existingRegistration = await prisma.trainingRegistration.findUnique({
            where: { userId_trainingId: { userId: user.id, trainingId } }
        });

        if (existingRegistration) {
            return res.status(409).json({ message: 'Already registered for this training.' });
        }

        const registration = await prisma.trainingRegistration.create({
            data: {
                userId: user.id,
                trainingId: trainingId,
            }
        });

        res.status(201).json(registration);
    } catch (error) {
        res.status(500).json({ message: 'Failed to RSVP to training.' });
    }
}
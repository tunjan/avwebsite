import { Request, Response } from 'express';
import prisma from '../db';

// Publicly get a list of all teams
export const getPublicTeams = async (req: Request, res: Response) => {
    try {
        const teams = await prisma.team.findMany({
            orderBy: { name: 'asc' },
            select: { id: true, name: true } // Only return public-safe data
        });
        res.json(teams);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch teams' });
    }
};
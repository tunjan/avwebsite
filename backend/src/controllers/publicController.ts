import { Request, Response } from 'express';
import prisma from '../db';

export const getPublicChapters = async (req: Request, res: Response) => {
    try {
        const chapters = await prisma.chapter.findMany({
            orderBy: { name: 'asc' },
            select: { id: true, name: true } // Only return public-safe data
        });
        res.json(chapters);
    } catch (error) {
        console.error("Failed to fetch public chapters:", error);
        res.status(500).json({ message: 'Failed to fetch chapters' });
    }
};
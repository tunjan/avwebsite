import { Request, Response } from 'express';
import prisma from '../db';

export const searchUsers = async (req: Request, res: Response) => {
    const { q } = req.query;

    if (typeof q !== 'string' || q.trim().length < 2) {
        return res.status(400).json({ message: 'Search query must be at least 2 characters long.' });
    }

    try {
        const users = await prisma.user.findMany({
            where: {
                OR: [
                    { name: { contains: q, mode: 'insensitive' } },
                    { email: { contains: q, mode: 'insensitive' } }
                ]
            },
            select: { id: true, name: true, email: true, role: true },
            take: 10
        });
        res.json(users);
    } catch (error) {
        console.error("User search failed:", error);
        res.status(500).json({ message: 'User search failed.' });
    }
}
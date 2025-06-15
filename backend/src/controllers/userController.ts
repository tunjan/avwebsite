import { Request, Response } from 'express';
import prisma from '../db';

// Search for users by name or email
export const searchUsers = async (req: Request, res: Response) => {
    const { q } = req.query; // q is the search query

    if (typeof q !== 'string' || q.length < 2) {
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
            select: { id: true, name: true, email: true },
            take: 10 // Limit results to 10 to avoid overwhelming the frontend
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'User search failed.' });
    }
}
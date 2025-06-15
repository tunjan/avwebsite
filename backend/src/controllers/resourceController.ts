import { Request, Response } from 'express';
import prisma from '../db';

export const getAllResources = async (req: Request, res: Response) => {
    try {
        const resources = await prisma.resource.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                // Include the category name in the response
                category: {
                    select: {
                        name: true,
                    },
                },
            },
        });
        res.json(resources);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch resources' });
    }
};
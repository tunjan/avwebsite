import { Request, Response } from 'express';
import prisma from '../db';

export const getAllResources = async (req: Request, res: Response) => {
    try {
        const resources = await prisma.resource.findMany({
            orderBy: {
                category: {
                    name: 'asc'
                }
            },
            include: {
                category: {
                    select: {
                        name: true,
                    },
                },
            },
        });
        res.json(resources);
    } catch (error) {
        console.error("Failed to fetch resources:", error);
        res.status(500).json({ message: 'Failed to fetch resources' });
    }
};
import { Request, Response } from 'express';
import prisma from '../db';

export const getAllRegions = async (req: Request, res: Response) => {
    try {
        const regions = await prisma.region.findMany({
            orderBy: { name: 'asc' },
            select: { id: true, name: true }
        });
        res.json(regions);
    } catch (error) {
        console.error("Failed to fetch regions:", error);
        res.status(500).json({ message: 'Failed to fetch regions.' });
    }
};

export const getRegionById = async (req: Request, res: Response) => {
    const { regionId } = req.params;
    try {
        const region = await prisma.region.findUnique({
            where: { id: regionId },
            select: { id: true, name: true }
        });
        if (!region) {
            return res.status(404).json({ message: 'Region not found.' });
        }
        res.json(region);
    } catch (error) {
        console.error(`Failed to fetch region ${regionId}:`, error);
        res.status(500).json({ message: 'Failed to fetch region.' });
    }
}
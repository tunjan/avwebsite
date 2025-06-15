import { Request, Response } from 'express';
import prisma from '../db';
import { User } from '@prisma/client';

// FIX: Renamed function for consistency to resolve potential import error.
export const getMyProfile = async (req: Request, res: Response) => {
    const user = req.user as User;

    try {
        const attendedRegistrations = await prisma.eventRegistration.findMany({
            where: {
                userId: user.id,
                attended: true,
            },
            include: {
                event: {
                    select: {
                        id: true,
                        title: true,
                        startTime: true,
                        endTime: true,
                        chapter: {
                            select: { name: true }
                        }
                    }
                }
            },
            orderBy: {
                event: {
                    startTime: 'desc'
                }
            }
        });

        const totalHours = attendedRegistrations.reduce((sum, reg) => {
            if (!reg.event.startTime || !reg.event.endTime) return sum;
            const durationMs = reg.event.endTime.getTime() - reg.event.startTime.getTime();
            return sum + (durationMs / (1000 * 60 * 60));
        }, 0);

        const attendanceHistory = attendedRegistrations.map(reg => reg.event);

        res.json({
            attendedEventsCount: attendanceHistory.length,
            totalHours: parseFloat(totalHours.toFixed(2)),
            attendanceHistory: attendanceHistory
        });

    } catch (error) {
        console.error("Failed to fetch profile data:", error);
        res.status(500).json({ message: 'Failed to fetch profile data.' });
    }
}
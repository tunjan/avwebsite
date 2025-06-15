import { Request, Response } from 'express';
import prisma from '../db';
import { User } from '@prisma/client';

export const getMyProfileData = async (req: Request, res: Response) => {
    const user = req.user as User;

    try {
        // Fetch all event registrations where the user has been marked as "attended"
        const attendedRegistrations = await prisma.eventRegistration.findMany({
            where: {
                userId: user.id,
                attended: true,
            },
            include: {
                event: { // Include the details of each attended event
                    select: {
                        id: true,
                        title: true,
                        startTime: true,
                        endTime: true,
                        team: {
                            select: { name: true }
                        }
                    }
                }
            },
            orderBy: {
                event: {
                    startTime: 'desc' // Show most recent events first
                }
            }
        });

        // Calculate total hours from the fetched registrations
        const totalHours = attendedRegistrations.reduce((sum, reg) => {
            const durationMs = reg.event.endTime.getTime() - reg.event.startTime.getTime();
            const durationHours = durationMs / (1000 * 60 * 60);
            return sum + durationHours;
        }, 0);

        // Prepare the data for the frontend
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
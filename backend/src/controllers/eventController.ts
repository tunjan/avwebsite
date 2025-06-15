import { Request, Response } from 'express';
import prisma from '../db';
import { User, Role } from '@prisma/client';

export const createEvent = async (req: Request, res: Response) => {
    const user = req.user as User;
    const { title, description, startTime, endTime, location, scope, chapterId, regionId } = req.body;

    try {
        const data: any = {
            title, description, location, scope,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            authorId: user.id,
            authorRole: user.role,
        };

        if (scope === 'CITY') data.chapterId = chapterId;
        else if (scope === 'REGIONAL') data.regionId = regionId;

        const event = await prisma.event.create({
            data,
            include: {
                chapter: { select: { id: true, name: true, regionId: true } },
                region: { select: { id: true, name: true } },
            }
        });
        res.status(201).json({ ...event, attendeeCount: 0, isRegistered: false });
    } catch (error) {
        console.error("Event creation error:", error);
        res.status(500).json({ message: 'Failed to create event.' });
    }
};

export const getEvents = async (req: Request, res: Response) => {
    // FIX: Correctly type the user object to include the 'memberships' relation from Passport.
    const user = req.user as User & { memberships: { chapterId: string; role: Role }[] };
    try {
        let chapterIdsToQuery: string[] = [];
        let regionIdsToQuery: string[] = [];

        const userMemberships = await prisma.chapterMembership.findMany({
            where: { userId: user.id },
            include: { chapter: { select: { id: true, regionId: true } } }
        });
        chapterIdsToQuery.push(...userMemberships.map(m => m.chapter.id));
        const explicitRegionIds = userMemberships.map(m => m.chapter.regionId).filter((id): id is string => id !== null);
        regionIdsToQuery.push(...explicitRegionIds);

        if (user.role === Role.COFOUNDER) {
            const allRegions = await prisma.region.findMany({ select: { id: true } });
            regionIdsToQuery.push(...allRegions.map(r => r.id));
        } else if (user.role === Role.REGIONAL_ORGANISER && user.managedRegionId) {
            regionIdsToQuery.push(user.managedRegionId);
        }

        const uniqueRegionIds = [...new Set(regionIdsToQuery)];

        const events = await prisma.event.findMany({
            where: {
                startTime: { gte: new Date() },
                OR: [
                    { scope: 'GLOBAL' },
                    { scope: 'REGIONAL', regionId: { in: uniqueRegionIds } },
                    { scope: 'CITY', chapterId: { in: chapterIdsToQuery } },
                ],
            },
            orderBy: { startTime: 'asc' },
            include: {
                chapter: { select: { id: true, name: true, regionId: true } },
                region: { select: { id: true, name: true } },
                _count: { select: { registrations: true } },
            },
        });

        const eventIds = events.map(event => event.id);
        const userRegistrations = await prisma.eventRegistration.findMany({
            where: { userId: user.id, eventId: { in: eventIds } },
            select: { eventId: true }
        });
        const registeredEventIds = new Set(userRegistrations.map(reg => reg.eventId));

        const eventsWithStatus = events.map(event => {
            const { _count, ...rest } = event;
            return {
                ...rest,
                attendeeCount: _count.registrations,
                isRegistered: registeredEventIds.has(event.id),
                // FIX: Explicitly type the parameter 'm' in the callback function.
                canManage: user.role === 'COFOUNDER' || event.authorId === user.id ||
                    (user.role === 'REGIONAL_ORGANISER' && user.managedRegionId && (event.regionId === user.managedRegionId || event.chapter?.regionId === user.managedRegionId)) ||
                    (user.role === 'CITY_ORGANISER' && user.memberships.some((m: { chapterId: string, role: Role }) => m.chapterId === event.chapterId && m.role === 'CITY_ORGANISER'))
            };
        });
        res.json(eventsWithStatus);
    } catch (error) {
        console.error("Failed to fetch events:", error);
        res.status(500).json({ message: 'Failed to fetch events' });
    }
};

export const getEventById = async (req: Request, res: Response) => {
    const { eventId } = req.params;
    const user = req.user as User;
    const canModify = (req as any).canModify;
    try {
        const event = await prisma.event.findUnique({
            where: { id: eventId },
            include: {
                chapter: { select: { id: true, name: true, regionId: true } },
                region: { select: { name: true } }
            }
        });
        if (!event) return res.status(404).json({ message: "Event not found." });
        const registration = await prisma.eventRegistration.findUnique({
            where: { userId_eventId: { userId: user.id, eventId: eventId } }
        });
        res.json({ ...event, isRegistered: !!registration, canModify });
    } catch (error) {
        res.status(500).json({ message: "Failed to retrieve event details." });
    }
};

export const updateEvent = async (req: Request, res: Response) => {
    const { eventId } = req.params;
    const { title, description, location, startTime, endTime } = req.body;
    try {
        const updatedEvent = await prisma.event.update({
            where: { id: eventId },
            data: {
                title, description, location,
                startTime: startTime ? new Date(startTime) : undefined,
                endTime: endTime ? new Date(endTime) : undefined,
            },
            include: {
                chapter: { select: { id: true, name: true, regionId: true } },
                region: { select: { id: true, name: true } },
            }
        });
        res.json(updatedEvent);
    } catch (error) {
        console.error("Event update error:", error);
        res.status(500).json({ message: 'Failed to update event.' });
    }
};

export const deleteEvent = async (req: Request, res: Response) => {
    const { eventId } = req.params;
    try {
        await prisma.$transaction([
            prisma.comment.deleteMany({ where: { eventId } }),
            prisma.eventRegistration.deleteMany({ where: { eventId } }),
            prisma.event.delete({ where: { id: eventId } })
        ]);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete event.' });
    }
};

// --- RSVP and Attendance ---

export const rsvpToEvent = async (req: Request, res: Response) => {
    const user = req.user as User;
    const { eventId } = req.params;
    try {
        await prisma.eventRegistration.create({
            data: { userId: user.id, eventId: eventId }
        });
        res.status(201).json({ message: 'RSVP successful.' });
    } catch (error: any) {
        if (error.code === 'P2002') {
            return res.status(409).json({ message: 'You are already registered for this event.' });
        }
        res.status(500).json({ message: 'Failed to RSVP to event.' });
    }
};

export const cancelRsvp = async (req: Request, res: Response) => {
    const user = req.user as User;
    const { eventId } = req.params;
    try {
        await prisma.eventRegistration.delete({
            where: { userId_eventId: { userId: user.id, eventId: eventId } }
        });
        res.status(204).send();
    } catch (error: any) {
        if (error.code === 'P2025') {
            return res.status(404).json({ message: "Registration not found." });
        }
        res.status(500).json({ message: 'Failed to cancel RSVP.' });
    }
};

export const getEventAttendees = async (req: Request, res: Response) => {
    const { eventId } = req.params;
    try {
        const registrations = await prisma.eventRegistration.findMany({
            where: { eventId: eventId },
            include: { user: { select: { id: true, name: true } } }
        });
        res.json(registrations.map(reg => reg.user));
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch attendees.' });
    }
};

export const getEventRegistrations = async (req: Request, res: Response) => {
    const { eventId } = req.params;
    try {
        const registrations = await prisma.eventRegistration.findMany({
            where: { eventId },
            include: { user: { select: { id: true, name: true, email: true } } },
            orderBy: { user: { name: 'asc' } }
        });
        res.json(registrations);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch event registrations." });
    }
};

export const updateAttendance = async (req: Request, res: Response) => {
    const { eventId, userId } = req.params;
    const { attended } = req.body;
    if (typeof attended !== 'boolean') {
        return res.status(400).json({ message: 'A boolean "attended" status is required.' });
    }
    try {
        await prisma.eventRegistration.update({
            where: { userId_eventId: { userId, eventId } },
            data: { attended }
        });
        res.status(200).json({ message: "Attendance updated." });
    } catch (error) {
        res.status(500).json({ message: "Failed to update attendance." });
    }
};
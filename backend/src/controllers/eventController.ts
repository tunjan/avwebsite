import { Request, Response } from 'express';
import prisma from '../db';
import { User, Role } from '@prisma/client';

export const createEvent = async (req: Request, res: Response) => {
    const { title, description, startTime, endTime, location, scope, teamId, regionId } = req.body;

    if (!title || !startTime || !endTime || !location || !scope) {
        return res.status(400).json({ message: 'Missing required fields for event creation.' });
    }

    const data: any = {
        title,
        description,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        location,
        scope,
    };

    if (scope === 'CITY' && teamId) {
        data.teamId = teamId;
    } else if (scope === 'REGIONAL' && regionId) {
        data.regionId = regionId;
    } else if (scope !== 'GLOBAL') {
        return res.status(400).json({ message: 'Invalid scope or missing ID for scope.' });
    }

    try {
        const event = await prisma.event.create({ data });
        res.status(201).json(event);
    } catch (error) {
        res.status(500).json({ message: 'Failed to create event.' });
    }
};

export const getEvents = async (req: Request, res: Response) => {
    const user = req.user as User;

    try {
        let teamIdsToQuery: string[] = [];
        let regionIdsToQuery: string[] = [];

        const userMemberships = await prisma.teamMembership.findMany({
            where: { userId: user.id },
            include: { team: { select: { id: true, regionId: true } } }
        });
        teamIdsToQuery.push(...userMemberships.map(m => m.team.id));
        regionIdsToQuery.push(...userMemberships.map(m => m.team.regionId));

        if (user.role === Role.COFOUNDER) {
            const allTeams = await prisma.team.findMany({ select: { id: true, regionId: true } });
            teamIdsToQuery.push(...allTeams.map(t => t.id));
            regionIdsToQuery.push(...allTeams.map(t => t.regionId));
        } else if (user.role === Role.REGIONAL_ORGANISER && user.managedRegionId) {
            const teamsInRegion = await prisma.team.findMany({
                where: { regionId: user.managedRegionId },
                select: { id: true, regionId: true }
            });
            teamIdsToQuery.push(...teamsInRegion.map(t => t.id));
            regionIdsToQuery.push(user.managedRegionId);
        }

        const uniqueTeamIds = [...new Set(teamIdsToQuery)];
        const uniqueRegionIds = [...new Set(regionIdsToQuery)];

        const events = await prisma.event.findMany({
            where: {
                startTime: { gte: new Date() },
                OR: [
                    { scope: 'CITY', teamId: { in: uniqueTeamIds } },
                    { scope: 'REGIONAL', regionId: { in: uniqueRegionIds } },
                    { scope: 'GLOBAL' },
                ],
            },
            orderBy: { startTime: 'asc' },
            include: {
                team: { select: { id: true, name: true, regionId: true } },
                region: { select: { id: true, name: true } },
                _count: {
                    select: { registrations: true }
                }
            },
        });

        const eventIds = events.map(event => event.id);
        const userRegistrations = await prisma.eventRegistration.findMany({
            where: {
                userId: user.id,
                eventId: { in: eventIds },
            },
            select: { eventId: true }
        });

        const registeredEventIds = new Set(userRegistrations.map(reg => reg.eventId));

        const eventsWithStatus = events.map(event => {
            const { _count, ...rest } = event;
            return {
                ...rest,
                attendeeCount: _count.registrations,
                isRegistered: registeredEventIds.has(event.id),
            };
        });

        res.json(eventsWithStatus);

    } catch (error) {
        console.error("Failed to fetch events:", error);
        res.status(500).json({ message: 'Failed to fetch events' });
    }
};

export const rsvpToEvent = async (req: Request, res: Response) => {
    const user = req.user as User;
    const { eventId } = req.params;
    try {
        const existingRegistration = await prisma.eventRegistration.findUnique({
            where: { userId_eventId: { userId: user.id, eventId: eventId } }
        });
        if (existingRegistration) {
            return res.status(409).json({ message: 'You are already registered for this event.' });
        }
        const registration = await prisma.eventRegistration.create({
            data: { userId: user.id, eventId: eventId }
        });
        res.status(201).json(registration);
    } catch (error) {
        if (error instanceof Error && 'code' in error && (error as any).code === 'P2003') {
            return res.status(404).json({ message: 'Event not found.' });
        }
        res.status(500).json({ message: 'Failed to RSVP to event.' });
    }
}

export const getEventAttendees = async (req: Request, res: Response) => {
    const { eventId } = req.params;
    try {
        const registrations = await prisma.eventRegistration.findMany({
            where: { eventId: eventId },
            include: { user: { select: { id: true, name: true } } }
        });
        const attendees = registrations.map(reg => reg.user);
        res.json(attendees);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch attendees.' });
    }
}

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
        const updatedRegistration = await prisma.eventRegistration.update({
            where: { userId_eventId: { userId, eventId } },
            data: { attended }
        });
        res.json(updatedRegistration);
    } catch (error) {
        res.status(500).json({ message: "Failed to update attendance." });
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
            return res.status(404).json({ message: "Registration not found. You may have already canceled." });
        }
        res.status(500).json({ message: 'Failed to cancel RSVP.' });
    }
};

export const getEventById = async (req: Request, res: Response) => {
    const { eventId } = req.params;
    const user = req.user as User;
    try {
        const event = await prisma.event.findUnique({
            where: { id: eventId },
            include: {
                team: { select: { name: true } },
                region: { select: { name: true } }
            }
        });

        if (!event) {
            return res.status(404).json({ message: "Event not found." });
        }

        const registration = await prisma.eventRegistration.findUnique({
            where: { userId_eventId: { userId: user.id, eventId: eventId } }
        });

        res.json({ ...event, isRegistered: !!registration });
    } catch (error) {
        res.status(500).json({ message: "Failed to retrieve event details." });
    }
}
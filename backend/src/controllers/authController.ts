import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../db';
import { User, Role } from '@prisma/client';

export const register = async (req: Request, res: Response) => {
    const { email, password, name, teamId } = req.body;

    if (!email || !password || !name || !teamId) {
        return res.status(400).json({ message: "Name, email, password, and a team selection are required." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    try {
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(409).json({ message: "An account with this email already exists." });
        }

        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
            },
        });

        await prisma.joinRequest.create({
            data: {
                userId: user.id,
                teamId: teamId,
            },
        });

        res.status(201).json({ message: 'User created and join request sent.' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'An error occurred during registration.' });
    }
};

export const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({
        where: { email },
        include: {
            memberships: { select: { teamId: true } },
        },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    const teamIds = user.memberships.map(m => m.teamId);

    const token = jwt.sign(
        {
            id: user.id,
            role: user.role,
            managedRegionId: user.managedRegionId,
            teamIds: teamIds,
        },
        process.env.JWT_SECRET!,
        { expiresIn: '1d' }
    );

    res.json({ token, user: user });
};

export const getMe = (req: Request, res: Response) => {
    res.json(req.user);
};
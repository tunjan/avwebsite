import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../db';
import { User, Role } from '@prisma/client';

export const register = async (req: Request, res: Response) => {
    const { email, password, name, chapterId } = req.body;

    if (!email || !password || !name || !chapterId) {
        return res.status(400).json({ message: "Name, email, password, and a chapter selection are required." });
    }

    try {
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(409).json({ message: "An account with this email already exists." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                role: Role.ACTIVIST, // Explicitly set role
            },
        });

        await prisma.joinRequest.create({
            data: {
                userId: user.id,
                chapterId: chapterId,
            },
        });

        res.status(201).json({ message: 'User created and join request sent for approval.' });
    } catch (e) {
        console.error("Registration error:", e);
        res.status(500).json({ message: 'An error occurred during registration.' });
    }
};

export const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;
    try {
        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                memberships: { select: { chapterId: true, role: true } },
            },
        });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        if (user.role === Role.ACTIVIST && user.memberships.length === 0) {
            return res.status(403).json({ message: 'Your join request is still pending approval.' });
        }

        const token = jwt.sign(
            {
                id: user.id,
                role: user.role,
                managedRegionId: user.managedRegionId,
            },
            process.env.JWT_SECRET!,
            { expiresIn: '1d' }
        );

        // Don't send the password hash to the client
        const { password: _, ...userWithoutPassword } = user;

        res.json({ token, user: userWithoutPassword });
    } catch (e) {
        console.error("Login error:", e);
        res.status(500).json({ message: 'An error occurred during login.' });
    }
};

export const getMe = (req: Request, res: Response) => {
    res.json(req.user);
};
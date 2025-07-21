import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import util from 'util';
import asyncHandler from '../utils/asyncHandler';

const router = Router();
const execAsync = util.promisify(exec);

router.post('/seed', asyncHandler(async (req, res) => {
    const { secret } = req.body;

    if (secret !== process.env.SEED_SECRET) {
        return res.status(403).json({ message: 'Forbidden: Invalid secret' });
    }

    console.log("Manual seed process initiated via API...");

    try {
        // Using exec to run the same command the package.json would
        const { stdout, stderr } = await execAsync('npx prisma db seed');

        if (stderr) {
            console.error(`Seed script stderr: ${stderr}`);
            // Note: Prisma logs to stderr on success too, so we don't always want to fail here.
        }

        console.log(`Seed script stdout: ${stdout}`);
        res.status(200).json({ message: 'Database seeding initiated successfully.', output: stdout });

    } catch (error: unknown) {
        console.error('Failed to execute seed script:', error);
        if (error instanceof Error) {
            res.status(500).json({ message: 'Failed to execute seed script.', error: error.message });
        } else {
            res.status(500).json({ message: 'Failed to execute seed script.', error: 'An unknown error occurred.' });
        }
    }
}));

export default router;

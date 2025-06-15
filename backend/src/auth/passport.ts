import { Strategy as JwtStrategy, ExtractJwt, StrategyOptions } from 'passport-jwt';
import { PassportStatic } from 'passport';
import prisma from '../db';

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
    console.error("FATAL ERROR: JWT_SECRET is not defined in the environment variables.");
    process.exit(1);
}

const opts: StrategyOptions = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: jwtSecret,
};

export const configurePassport = (passport: PassportStatic) => {
    passport.use(
        new JwtStrategy(opts, async (jwt_payload, done) => {
            try {
                // Return the full user object, including memberships, for use in `req.user`
                const user = await prisma.user.findUnique({
                    where: { id: jwt_payload.id },
                    include: {
                        memberships: {
                            select: { chapterId: true, role: true }
                        }
                    }
                });

                if (user) {
                    return done(null, user);
                }
                return done(null, false);
            } catch (err) {
                return done(err, false);
            }
        })
    );
};
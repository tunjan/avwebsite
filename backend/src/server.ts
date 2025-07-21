import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import passport from 'passport';
import { configurePassport } from './auth/passport';

// Import all route handlers
import authRoutes from './routes/authRoutes';
import chapterRoutes from './routes/chapterRoutes';
import commentRoutes from './routes/commentRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import eventRoutes from './routes/eventRoutes';
import profileRoutes from './routes/profileRoutes';
import promotionRoutes from './routes/promotionRoutes';
import publicRoutes from './routes/publicRoutes';
import regionRoutes from './routes/regionRoutes';
import resourceRoutes from './routes/resourceRoutes';
import trainingRoutes from './routes/trainingRoutes';
import userRoutes from './routes/userRoutes';
import announcementRoutes from './routes/announcementRoutes';

dotenv.config();

const app = express();
const port = parseInt(process.env.PORT || '9888', 10);

// --- FIX: Hardened CORS Configuration ---
const allowedOrigins = [
    process.env.CORS_ORIGIN || 'http://localhost:5173', // Your local frontend
];

if (process.env.VERCEL_URL) {
    allowedOrigins.push(`https://${process.env.VERCEL_URL}`);
}

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    // Explicitly allow methods your application uses
    methods: "GET,POST,PUT,DELETE,PATCH,OPTIONS",
    // Explicitly allow headers that the frontend will send (especially Authorization)
    allowedHeaders: "Content-Type,Authorization",
    // Some legacy browsers (IE11, various SmartTVs) choke on 204
    optionsSuccessStatus: 200
};

// --- Middleware Setup ---
app.use(express.json());
// Use the new, more robust CORS options
app.use(cors(corsOptions));
// This ensures OPTIONS requests are handled for all routes
app.options('*', cors(corsOptions));

app.use(passport.initialize());
configurePassport(passport);

// --- API Routes ---
app.use('/auth', authRoutes);
app.use('/public', publicRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/profile', profileRoutes);

app.use('/users', userRoutes);
app.use('/promote', promotionRoutes);

app.use('/regions', regionRoutes);
app.use('/chapters', chapterRoutes);

app.use('/events', eventRoutes);
app.use('/trainings', trainingRoutes);
app.use('/announcements', announcementRoutes);

app.use('/resources', resourceRoutes);
app.use('/comments', commentRoutes);

// --- Dev Routes (for manual seeding) ---
if (process.env.NODE_ENV === 'development') {
    app.use('/dev', devRoutes);
}

// --- Server Startup ---
app.listen(port, () => {
    console.log(`✅ Backend server running on port: ${port}`);
    console.log(`📡 Accepting requests from origin: ${corsOptions.origin}`);
});
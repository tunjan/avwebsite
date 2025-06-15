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
const corsOptions = {
    // Use the origin from the .env file, with a fallback for safety
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
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
app.use('/api/auth', authRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/profile', profileRoutes);

app.use('/api/users', userRoutes);
app.use('/api/promote', promotionRoutes);

app.use('/api/regions', regionRoutes);
app.use('/api/chapters', chapterRoutes);

app.use('/api/events', eventRoutes);
app.use('/api/trainings', trainingRoutes);
app.use('/api/announcements', announcementRoutes);

app.use('/api/resources', resourceRoutes);
app.use('/api/comments', commentRoutes);

// --- Server Startup ---
app.listen(port, () => {
    console.log(`✅ Backend server running on port: ${port}`);
    console.log(`📡 Accepting requests from origin: ${corsOptions.origin}`);
});
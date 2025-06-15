import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import passport from 'passport';
import { configurePassport } from './auth/passport';
import authRoutes from './routes/authRoutes';
import eventRoutes from './routes/eventRoutes';
import teamRoutes from './routes/teamRoutes';
import resourceRoutes from './routes/resourceRoutes';
import trainingRoutes from './routes/trainingRoutes';
import userRoutes from './routes/userRoutes'; // <-- ADD THIS IMPORT
import publicRoutes from './routes/publicRoutes'; // <-- ADD THIS
import dashboardRoutes from './routes/dashboardRoutes'; // <-- ADD THIS
import announcementRoutes from './routes/announcementRoutes'; // <-- ADD THIS
import commentRoutes from './routes/commentRoutes'; // <-- ADD THIS
import profileRoutes from './routes/profileRoutes'; // <-- ADD THIS





dotenv.config();

const app = express();
const port = parseInt(process.env.PORT || '9888', 10);

app.use(express.json());

const corsOptions = {
    origin: 'http://localhost:5173'
};
app.use(cors(corsOptions));

app.use(passport.initialize());
configurePassport(passport);

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes); // <-- ADD THIS

app.use('/api/events', eventRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/trainings', trainingRoutes);
app.use('/api/users', userRoutes); // <-- ADD THIS LINE
app.use('/api/public', publicRoutes); // <-- ADD THIS
app.use('/api/announcements', announcementRoutes); // <-- ADD THIS
app.use('/api/comments', commentRoutes); // <-- ADD THIS
app.use('/api/profile', profileRoutes); // <-- ADD THIS



app.listen(port, '0.0.0.0', () => {
    console.log(`Backend server running on http://localhost:${port}`);
});
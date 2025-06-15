import { PrismaClient, Role, TrainingScope } from '@prisma/client';
import { faker } from '@faker-js/faker';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const log = (message: string) => console.log(`   > ${message}`);

async function main() {
    console.log(`🌱 Seeding database... This may take a moment.`);

    // --- 1. Clean the Database ---
    log('Clearing existing data...');
    await prisma.comment.deleteMany();
    await prisma.joinRequest.deleteMany();
    await prisma.trainingRegistration.deleteMany();
    await prisma.eventRegistration.deleteMany();
    await prisma.teamMembership.deleteMany();
    await prisma.resource.deleteMany();
    await prisma.resourceCategory.deleteMany();
    await prisma.training.deleteMany();
    await prisma.announcement.deleteMany();
    await prisma.event.deleteMany();
    await prisma.user.deleteMany();
    await prisma.team.deleteMany();
    await prisma.region.deleteMany();

    // --- 2. Create Regions (Countries) ---
    const regionsData = [{ name: 'Spain' }, { name: 'United Kingdom' }, { name: 'USA' }, { name: 'Germany' }];
    const regions = await Promise.all(regionsData.map(r => prisma.region.create({ data: r })));
    const [regionSpain, regionUK, regionUSA, regionGermany] = regions;
    log(`Created ${regions.length} Regions.`);

    // --- 3. Create Teams (Cities) ---
    const teamsData = [
        { name: 'Madrid', regionId: regionSpain.id }, { name: 'Barcelona', regionId: regionSpain.id },
        { name: 'Valencia', regionId: regionSpain.id }, { name: 'London', regionId: regionUK.id },
        { name: 'Manchester', regionId: regionUK.id }, { name: 'New York', regionId: regionUSA.id },
        { name: 'Los Angeles', regionId: regionUSA.id }, { name: 'Chicago', regionId: regionUSA.id },
        { name: 'Berlin', regionId: regionGermany.id }, { name: 'Hamburg', regionId: regionGermany.id },
    ];
    const teams = await Promise.all(teamsData.map(t => prisma.team.create({ data: t })));
    const [teamMadrid, teamBarcelona, teamValencia, teamLondon, teamManchester, teamNYC, teamLA, teamChicago, teamBerlin, teamHamburg] = teams;
    log(`Created ${teams.length} Teams.`);

    // --- 4. Create Users ---
    const hashedPassword = await bcrypt.hash('password123', 10);

    const usersData = [
        // Hierarchy
        { email: 'cofounder@example.com', name: 'Alex Co-Founder', role: Role.COFOUNDER },
        { email: 'regional.spain@example.com', name: 'Sam Organiser (Spain)', role: Role.REGIONAL_ORGANISER, managedRegionId: regionSpain.id },
        { email: 'regional.uk@example.com', name: 'Riley Organiser (UK)', role: Role.REGIONAL_ORGANISER, managedRegionId: regionUK.id },
        { email: 'city.madrid@example.com', name: 'Casey Organiser (Madrid)', role: Role.CITY_ORGANISER },
        { email: 'city.london@example.com', name: 'Jordan Organiser (London)', role: Role.CITY_ORGANISER },
        // Activists
        { email: 'activist.madrid@example.com', name: 'Alex Activist (Madrid)', role: Role.ACTIVIST },
        { email: 'activist.london@example.com', name: 'Jordan Activist (London)', role: Role.ACTIVIST },
        { email: 'activist.multi@example.com', name: 'Taylor Multi-Team', role: Role.ACTIVIST },
        // Pending users
        { email: 'pending.user1@example.com', name: 'Pat Pending (for Madrid)', role: Role.ACTIVIST },
        { email: 'pending.user2@example.com', name: 'Jess Request (for London)', role: Role.ACTIVIST },
    ];
    const createdUsers = await Promise.all(usersData.map(u => prisma.user.create({ data: { ...u, password: hashedPassword } })));
    const [cofounder, regOrgSpain, regOrgUK, cityOrgMadrid, cityOrgLondon, actMadrid, actLondon, actMulti, pendingUser1, pendingUser2] = createdUsers;

    // Create 50 random activists
    for (let i = 0; i < 50; i++) {
        const user = await prisma.user.create({ data: { email: faker.internet.email(), name: faker.person.fullName(), password: hashedPassword, role: Role.ACTIVIST } });
        // Make them members of random teams
        await prisma.teamMembership.create({ data: { userId: user.id, teamId: teams[i % teams.length].id } });
    }
    log(`Created ${createdUsers.length + 50} Users.`);

    // --- 5. Create Memberships ---
    await prisma.teamMembership.createMany({
        data: [
            // Organisers are members of teams too
            { userId: regOrgSpain.id, teamId: teamMadrid.id },
            { userId: regOrgUK.id, teamId: teamLondon.id },
            { userId: cityOrgMadrid.id, teamId: teamMadrid.id },
            { userId: cityOrgLondon.id, teamId: teamLondon.id },
            // Activist memberships
            { userId: actMadrid.id, teamId: teamMadrid.id },
            { userId: actLondon.id, teamId: teamLondon.id },
            { userId: actMulti.id, teamId: teamMadrid.id },
            { userId: actMulti.id, teamId: teamLondon.id },
        ],
    });
    log('Created Team Memberships.');

    // --- 6. Create Pending Join Requests ---
    await prisma.joinRequest.createMany({
        data: [
            { userId: pendingUser1.id, teamId: teamMadrid.id },
            { userId: pendingUser2.id, teamId: teamLondon.id },
        ],
    });
    log('Created Pending Join Requests.');

    // --- 7. Create Scoped Events ---
    const createEvent = (scope: 'CITY' | 'REGIONAL' | 'GLOBAL', teamId?: string, regionId?: string) => {
        const startTime = faker.date.between({ from: new Date(), to: new Date(new Date().setDate(new Date().getDate() + 60)) });
        return prisma.event.create({
            data: {
                title: `${faker.word.adjective()} Outreach at ${faker.location.street()}`.replace(/\b\w/g, l => l.toUpperCase()),
                description: faker.lorem.sentence(),
                startTime,
                endTime: new Date(startTime.getTime() + faker.number.int({ min: 1, max: 3 }) * 60 * 60 * 1000),
                location: faker.location.city(),
                scope, teamId, regionId,
            },
        });
    };
    const cityEventMadrid = await createEvent('CITY', teamMadrid.id);
    const cityEventLondon = await createEvent('CITY', teamLondon.id);
    const regionalEventSpain = await createEvent('REGIONAL', undefined, regionSpain.id);
    const globalEvent = await createEvent('GLOBAL');
    log('Created Scoped Events.');

    // --- 8. Create Event Registrations & Attendance ---
    await prisma.eventRegistration.createMany({
        data: [
            // Madrid event: 3 RSVPs, 2 attended
            { userId: cityOrgMadrid.id, eventId: cityEventMadrid.id, attended: true },
            { userId: actMadrid.id, eventId: cityEventMadrid.id, attended: true },
            { userId: actMulti.id, eventId: cityEventMadrid.id, attended: false },
            // Spain regional event: 2 RSVPs, 1 attended
            { userId: regOrgSpain.id, eventId: regionalEventSpain.id, attended: true },
            { userId: actMadrid.id, eventId: regionalEventSpain.id, attended: false },
            // London event: 1 RSVP, 1 attended
            { userId: actLondon.id, eventId: cityEventLondon.id, attended: true },
        ]
    });
    log('Created Event Registrations.');

    // --- 9. Create Announcements ---
    await prisma.announcement.create({ data: { title: 'Welcome to the Platform!', content: 'This is a global announcement for all members.', scope: 'GLOBAL', authorId: cofounder.id } });
    await prisma.announcement.create({ data: { title: 'New Resources for Spain', content: 'Please check the resources tab for new materials.', scope: 'REGIONAL', authorId: regOrgSpain.id, regionId: regionSpain.id } });
    await prisma.announcement.create({ data: { title: 'Madrid Team Meeting Next Week', content: 'Our weekly meeting is scheduled for Tuesday.', scope: 'CITY', authorId: cityOrgMadrid.id, teamId: teamMadrid.id } });
    log('Created Announcements.');

    // --- 10. Create Resources ---
    const catGuides = await prisma.resourceCategory.create({ data: { name: 'Guides & Protocols' } });
    const catMedia = await prisma.resourceCategory.create({ data: { name: 'Media Kits' } });
    await prisma.resource.createMany({
        data: [
            { title: 'Standard Outreach Protocol v3', fileUrl: '#', categoryId: catGuides.id },
            { title: 'Social Media Asset Pack', fileUrl: '#', categoryId: catMedia.id },
        ],
    });
    log('Created Resources.');

    // --- 11. Create Comments ---
    await prisma.comment.create({ data: { content: 'Looking forward to this!', authorId: actMadrid.id, eventId: cityEventMadrid.id } });
    await prisma.comment.create({ data: { content: 'Great, I will share with the team.', authorId: cityOrgMadrid.id, announcementId: (await prisma.announcement.findFirst({ where: { scope: 'REGIONAL' } }))!.id } });
    log('Created Comments.');

    console.log('✅ Seeding finished successfully.');
}

main()
    .catch((e) => {
        console.error("❌ An error occurred during seeding:");
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
import { PrismaClient, Role } from '@prisma/client';
import { Faker, en } from '@faker-js/faker';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const faker = new Faker({ locale: [en] });

// Helper to wrap console logs for better readability
const log = (message: string) => console.log(`[🌱 Seed] ${message}`);

async function main() {
    log('--- Seeding Process Started ---');

    // 1. CLEANUP
    log('🧹 Cleaning existing data...');
    await prisma.comment.deleteMany();
    await prisma.eventRegistration.deleteMany();
    await prisma.trainingRegistration.deleteMany();
    await prisma.resource.deleteMany();
    await prisma.resourceCategory.deleteMany();
    await prisma.joinRequest.deleteMany();
    await prisma.chapterMembership.deleteMany();
    await prisma.announcement.deleteMany();
    await prisma.event.deleteMany();
    await prisma.training.deleteMany();
    await prisma.chapter.deleteMany();
    await prisma.user.deleteMany();
    await prisma.region.deleteMany();
    log('✅ Database cleaned.');

    // 2. SEED STATIC DATA
    log('🌍 Seeding Regions...');
    const regions = await prisma.region.createManyAndReturn({
        data: [
            { name: 'North America' }, { name: 'Europe' }, { name: 'Asia' },
            { name: 'South America' }, { name: 'Africa' }, { name: 'Oceania' },
        ],
    });
    log(`   - Seeded ${regions.length} regions.`);

    log('📚 Seeding Resource Categories...');
    const categories = await prisma.resourceCategory.createManyAndReturn({
        data: [
            { name: 'Training Materials' }, { name: 'Marketing & Outreach' },
            { name: 'Legal Documents' }, { name: 'Organizational Guidelines' },
        ],
    });
    log(`   - Seeded ${categories.length} resource categories.`);

    log('🏙️ Seeding Chapters...');
    const chapters = await prisma.chapter.createManyAndReturn({
        data: Array.from({ length: 50 }, () => ({
            name: faker.location.city(),
            description: faker.lorem.sentence(),
            regionId: faker.helpers.arrayElement(regions).id,
        })),
    });
    log(`   - Seeded ${chapters.length} chapters.`);

    // 3. SEED USERS
    log('👤 Seeding Users...');
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create Co-founders
    const cofounders = await prisma.user.createManyAndReturn({
        data: Array.from({ length: 2 }, (_, i) => ({
            name: faker.person.fullName(),
            email: `cofounder${i}@av.org`,
            password: hashedPassword,
            role: Role.COFOUNDER,
        })),
    });
    log(`   - Seeded ${cofounders.length} Co-founders.`);

    // Create Regional Organisers, ensuring each region has one manager
    const availableRegions = [...regions];
    const regionalOrganisers = await prisma.user.createManyAndReturn({
        data: Array.from({ length: availableRegions.length }, (_, i) => ({
            name: faker.person.fullName(),
            email: `regional${i}@av.org`,
            password: hashedPassword,
            role: Role.REGIONAL_ORGANISER,
            managedRegionId: availableRegions[i].id,
        })),
    });
    log(`   - Seeded ${regionalOrganisers.length} Regional Organisers.`);

    // Create City Organisers
    const cityOrganisers = await prisma.user.createManyAndReturn({
        data: Array.from({ length: 25 }, (_, i) => ({
            name: faker.person.fullName(),
            email: `cityorg${i}@av.org`,
            password: hashedPassword,
            role: Role.CITY_ORGANISER,
        })),
    });
    log(`   - Seeded ${cityOrganisers.length} City Organisers.`);

    // Batch create activists for performance
    const NUM_ACTIVISTS = 5000;
    await prisma.user.createMany({
        data: Array.from({ length: NUM_ACTIVISTS }, () => ({
            name: faker.person.fullName(),
            email: faker.internet.email().toLowerCase(),
            password: hashedPassword,
            role: Role.ACTIVIST,
        })),
        skipDuplicates: true,
    });
    log(`   - Seeded (approx) ${NUM_ACTIVISTS} Activists.`);

    // Re-fetch all users now that they exist in the DB
    const allUsers = await prisma.user.findMany();
    const organisers = allUsers.filter(u => u.role !== Role.ACTIVIST);
    const activists = allUsers.filter(u => u.role === Role.ACTIVIST);

    // 4. SEED RELATIONSHIPS
    log('🔗 Seeding Memberships and Join Requests...');
    await prisma.$transaction([
        // Assign City Organisers to chapters
        prisma.chapterMembership.createMany({
            data: cityOrganisers.map(org => ({
                userId: org.id,
                chapterId: faker.helpers.arrayElement(chapters).id,
                role: Role.CITY_ORGANISER,
            })),
        }),
        // Assign Activist memberships
        prisma.chapterMembership.createMany({
            data: faker.helpers.arrayElements(activists, 3500).map(activist => ({
                userId: activist.id,
                chapterId: faker.helpers.arrayElement(chapters).id,
                role: Role.ACTIVIST,
            })),
            skipDuplicates: true
        }),
    ]);

    // FIX: Prevent duplicate join requests by tracking used pairs
    const joinRequestPairs = new Set<string>();
    const joinRequestsData: { userId: string; chapterId: string }[] = [];
    for (const activist of activists) {
        if (Math.random() < 0.15) { // ~15% have a pending request
            const chapterId = faker.helpers.arrayElement(chapters).id;
            const key = `${activist.id}:${chapterId}`;
            if (!joinRequestPairs.has(key)) {
                joinRequestsData.push({ userId: activist.id, chapterId });
                joinRequestPairs.add(key);
            }
        }
    }
    await prisma.joinRequest.createMany({ data: joinRequestsData, skipDuplicates: true });
    log('   - Memberships and Join Requests seeded.');

    // 5. SEED CONTENT & ENGAGEMENT
    log('📰 Seeding Content and Engagement...');
    for (let i = 0; i < 150; i++) {
        const author = faker.helpers.arrayElement(organisers);
        const scope = faker.helpers.arrayElement(['CITY', 'REGIONAL', 'GLOBAL']);
        if ((author.role === 'CITY_ORGANISER' && scope !== 'CITY') || (author.role === 'REGIONAL_ORGANISER' && scope === 'GLOBAL')) continue;

        // Create an Event and its engagement
        if (Math.random() > 0.5) {
            const event = await prisma.event.create({
                data: {
                    title: faker.company.catchPhrase(), description: faker.lorem.paragraphs(2),
                    startTime: faker.date.soon({ days: 30 }), endTime: faker.date.soon({ days: 3, refDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }),
                    location: faker.location.streetAddress(), scope, authorId: author.id, authorRole: author.role,
                    chapterId: scope === 'CITY' ? faker.helpers.arrayElement(chapters).id : undefined,
                    regionId: scope === 'REGIONAL' ? faker.helpers.arrayElement(regions).id : undefined,
                },
            });
            // Create registrations for the event
            const attendees = faker.helpers.arrayElements(allUsers, faker.number.int({ min: 5, max: 40 }));
            await prisma.eventRegistration.createMany({
                data: attendees.map(att => ({ eventId: event.id, userId: att.id, attended: Math.random() > 0.2 })),
                skipDuplicates: true
            });
        } else { // Create a Training and its engagement
            const training = await prisma.training.create({
                data: {
                    title: faker.commerce.productName() + ' Training', description: faker.lorem.paragraphs(2),
                    startTime: faker.date.soon({ days: 60 }), duration: faker.number.float({ min: 1, max: 4, fractionDigits: 1 }),
                    scope, authorId: author.id, authorRole: author.role,
                    chapterId: scope === 'CITY' ? faker.helpers.arrayElement(chapters).id : undefined,
                    regionId: scope === 'REGIONAL' ? faker.helpers.arrayElement(regions).id : undefined,
                },
            });
            // Create registrations for the training
            await prisma.trainingRegistration.createMany({
                data: faker.helpers.arrayElements(allUsers, faker.number.int({ min: 5, max: 25 })).map(att => ({
                    trainingId: training.id, userId: att.id, attended: Math.random() > 0.3
                })),
                skipDuplicates: true
            });
        }
    }
    log('   - Events, Trainings, and Registrations seeded.');

    log('--- ✅ Seeding Process Finished Successfully ---');
}

main()
    .catch((e) => {
        console.error('--- ❌ Seeding Process Failed ---');
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
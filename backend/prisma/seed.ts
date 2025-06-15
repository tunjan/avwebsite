import { PrismaClient, Role, Prisma } from '@prisma/client';
import { Faker, en } from '@faker-js/faker';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const faker = new Faker({ locale: [en] });

async function main() {
    console.log('--- Seeding Process Started ---');

    // 1. CLEANUP: Delete all data in reverse order of dependency
    console.log('🧹 Cleaning existing data...');
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
    await prisma.user.deleteMany({ where: { role: { not: 'COFOUNDER' } } }); // Keep co-founder relation to region clean
    await prisma.region.deleteMany();
    await prisma.user.deleteMany(); // Final user cleanup
    console.log('✅ Database cleaned.');

    // 2. SEED STATIC & INDEPENDENT DATA
    console.log('🌍 Seeding Regions...');
    const regionsData = [
        { name: 'North America' }, { name: 'Europe' }, { name: 'Asia' },
        { name: 'South America' }, { name: 'Africa' }, { name: 'Oceania' },
    ];
    await prisma.region.createMany({ data: regionsData });
    const allRegions = await prisma.region.findMany();
    console.log(`✅ Seeded ${allRegions.length} regions.`);

    console.log('📚 Seeding Resource Categories...');
    const categoriesData = [
        { name: 'Training Materials' }, { name: 'Marketing & Outreach' },
        { name: 'Legal Documents' }, { name: 'Organizational Guidelines' },
    ];
    await prisma.resourceCategory.createMany({ data: categoriesData });
    const allCategories = await prisma.resourceCategory.findMany();
    console.log(`✅ Seeded ${allCategories.length} resource categories.`);

    console.log('🏙️ Seeding Chapters...');
    const chaptersData: { name: string; description: string; regionId: string }[] = [];
    for (let i = 0; i < 50; i++) {
        chaptersData.push({
            name: faker.location.city(),
            description: faker.lorem.sentence(),
            regionId: faker.helpers.arrayElement(allRegions).id,
        });
    }
    await prisma.chapter.createMany({ data: chaptersData });
    const allChapters = await prisma.chapter.findMany();
    console.log(`✅ Seeded ${allChapters.length} chapters.`);

    // 3. SEED USERS (HIERARCHICAL)
    console.log('👤 Seeding Users...');
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);

    const users: Prisma.UserCreateInput[] = [];

    // Co-founders
    for (let i = 0; i < 2; i++) {
        users.push(await prisma.user.create({
            data: {
                name: faker.person.fullName(),
                email: `cofounder${i}@av.org`,
                password: hashedPassword,
                role: Role.COFOUNDER,
            },
        }));
    }

    // Regional Organisers
    const unmanagedRegions = [...allRegions];
    for (let i = 0; i < allRegions.length; i++) {
        const region = unmanagedRegions.pop();
        if (region) {
            users.push(await prisma.user.create({
                data: {
                    name: faker.person.fullName(),
                    email: `regional_organiser_${i}@av.org`,
                    password: hashedPassword,
                    role: Role.REGIONAL_ORGANISER,
                    managedRegionId: region.id,
                },
            }));
        }
    }

    // City Organisers
    for (let i = 0; i < 25; i++) {
        users.push(await prisma.user.create({
            data: {
                name: faker.person.fullName(),
                email: `city_organiser_${i}@av.org`,
                password: hashedPassword,
                role: Role.CITY_ORGANISER,
            },
        }));
    }

    // Activists (The "Big Userbase")
    const NUM_ACTIVISTS = 5000;
    for (let i = 0; i < NUM_ACTIVISTS; i++) {
        users.push({
            name: faker.person.fullName(),
            email: faker.internet.email().toLowerCase(),
            password: hashedPassword,
            role: Role.ACTIVIST,
        });
    }
    // Batch create activists for performance
    const activistsData = users.slice(users.length - NUM_ACTIVISTS);
    await prisma.user.createMany({ data: activistsData, skipDuplicates: true });
    const allUsers = await prisma.user.findMany();
    console.log(`✅ Seeded a total of ${allUsers.length} users.`);


    // 4. SEED RELATIONSHIPS
    console.log('🔗 Seeding Relationships (Memberships & Requests)...');
    const organisers = allUsers.filter(u => u.role !== Role.ACTIVIST);
    const activists = allUsers.filter(u => u.role === Role.ACTIVIST);

    // Assign organisers to chapters
    for (const org of organisers) {
        if (org.role === Role.REGIONAL_ORGANISER && org.managedRegionId) {
            const chaptersInRegion = allChapters.filter(c => c.regionId === org.managedRegionId);
            if (chaptersInRegion.length > 0) {
                await prisma.chapterMembership.create({
                    data: { userId: org.id, chapterId: faker.helpers.arrayElement(chaptersInRegion).id, role: Role.CITY_ORGANISER },
                });
            }
        } else if (org.role === Role.CITY_ORGANISER) {
            await prisma.chapterMembership.create({
                data: { userId: org.id, chapterId: faker.helpers.arrayElement(allChapters).id, role: Role.CITY_ORGANISER },
            });
        }
    }

    // Assign activists to chapters or create join requests
    for (const activist of activists) {
        if (Math.random() > 0.2) { // 80% are members
            const chapter = faker.helpers.arrayElement(allChapters);
            await prisma.chapterMembership.create({
                data: { userId: activist.id, chapterId: chapter.id, role: Role.ACTIVIST },
            });
        } else { // 20% have pending requests
            const chapter = faker.helpers.arrayElement(allChapters);
            await prisma.joinRequest.create({
                data: { userId: activist.id, chapterId: chapter.id },
            }).catch(() => { }); // Ignore if request already exists
        }
    }
    console.log('✅ Memberships and join requests seeded.');

    // 5. SEED CONTENT (Events, Trainings, Announcements)
    console.log('📄 Seeding Content (Events, Trainings, Announcements)...');
    const contentItems = [];
    for (let i = 0; i < 100; i++) {
        const author = faker.helpers.arrayElement(organisers);
        const scope = faker.helpers.arrayElement(['CITY', 'REGIONAL', 'GLOBAL']);
        let chapterId, regionId;

        if (scope === 'CITY') {
            chapterId = faker.helpers.arrayElement(allChapters).id;
        } else if (scope === 'REGIONAL') {
            regionId = faker.helpers.arrayElement(allRegions).id;
        }

        if (author.role === 'CITY_ORGANISER' && scope !== 'CITY') continue;
        if (author.role === 'REGIONAL_ORGANISER' && scope === 'GLOBAL') continue;

        const startTime = faker.date.between({ from: new Date(), to: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) });
        const endTime = new Date(startTime.getTime() + faker.number.int({ min: 1, max: 4 }) * 60 * 60 * 1000);

        const type = faker.helpers.arrayElement(['event', 'training', 'announcement']);
        if (type === 'event') {
            await prisma.event.create({
                data: { title: faker.company.catchPhrase(), description: faker.lorem.paragraphs(2), startTime, endTime, location: faker.location.streetAddress(), scope: scope, authorId: author.id, authorRole: author.role, chapterId, regionId }
            });
        } else if (type === 'training') {
            await prisma.training.create({
                data: { title: faker.commerce.productName() + ' Training', description: faker.lorem.paragraphs(2), startTime, duration: faker.number.float({ min: 1, max: 4, fractionDigits: 1 }), scope: scope, authorId: author.id, authorRole: author.role, chapterId, regionId }
            });
        } else {
            await prisma.announcement.create({
                data: { title: faker.lorem.sentence(5), content: faker.lorem.paragraphs(3), scope: scope, authorId: author.id, authorRole: author.role, chapterId, regionId }
            });
        }
    }
    console.log('✅ Content seeded.');

    // 6. SEED ENGAGEMENT (Registrations & Comments)
    console.log('💬 Seeding Engagement (Registrations & Comments)...');
    const allEvents = await prisma.event.findMany();
    const allTrainings = await prisma.training.findMany();

    for (const event of allEvents) {
        const attendees = faker.helpers.arrayElements(allUsers, faker.number.int({ min: 5, max: 50 }));
        for (const attendee of attendees) {
            await prisma.eventRegistration.create({
                data: { eventId: event.id, userId: attendee.id, attended: Math.random() > 0.25 }
            }).catch(() => { });
        }
        for (let i = 0; i < faker.number.int({ min: 0, max: 10 }); i++) {
            await prisma.comment.create({
                data: { content: faker.lorem.paragraph(), authorId: faker.helpers.arrayElement(attendees).id, eventId: event.id }
            });
        }
    }
    for (const training of allTrainings) {
        const trainees = faker.helpers.arrayElements(allUsers, faker.number.int({ min: 2, max: 20 }));
        for (const trainee of trainees) {
            await prisma.trainingRegistration.create({
                data: { trainingId: training.id, userId: trainee.id }
            }).catch(() => { });
        }
    }
    console.log('✅ Engagement seeded.');

    // 7. SEED RESOURCES
    console.log('📑 Seeding Resources...');
    for (const category of allCategories) {
        for (let i = 0; i < 5; i++) {
            await prisma.resource.create({
                data: {
                    title: faker.system.commonFileName('pdf'),
                    description: faker.lorem.sentence(),
                    fileUrl: faker.internet.url(),
                    categoryId: category.id
                }
            })
        }
    }
    console.log('✅ Resources seeded.');

    console.log('--- Seeding Process Finished Successfully ---');
}

main()
    .catch((e) => {
        console.error('--- Seeding Process Failed ---');
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
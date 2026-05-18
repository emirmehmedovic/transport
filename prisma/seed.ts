import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { BORDER_CROSSINGS } from '../data/border-crossings';

const prisma = new PrismaClient();
const INITIAL_ADMIN_EMAIL = 'emir.m@live.com';

async function main() {
  console.log('🌱 Seeding database...');

  const initialAdminPassword = process.env.INITIAL_ADMIN_PASSWORD;
  if (!initialAdminPassword) {
    throw new Error('INITIAL_ADMIN_PASSWORD must be set before running the seed script');
  }

  const hashedPassword = await bcrypt.hash(initialAdminPassword, 12);

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: INITIAL_ADMIN_EMAIL },
    update: {
      password: hashedPassword,
      role: 'ADMIN',
      firstName: 'Emir',
      lastName: 'Mehmedovic',
    },
    create: {
      email: INITIAL_ADMIN_EMAIL,
      password: hashedPassword,
      role: 'ADMIN',
      firstName: 'Emir',
      lastName: 'Mehmedovic',
    },
  });

  console.log('✅ Admin user seeded:', admin.email);

  // Seed border crossing zones
  for (const crossing of BORDER_CROSSINGS) {
    const existingZone = await prisma.zone.findFirst({
      where: {
        name: crossing.name,
        type: 'BORDER_CROSSING',
      },
      select: { id: true },
    });

    if (existingZone) {
      await prisma.zone.update({
        where: { id: existingZone.id },
        data: {
          description: crossing.description,
          centerLat: crossing.centerLat,
          centerLon: crossing.centerLon,
          radius: crossing.radius,
          isActive: true,
          notifyOnEntry: false,
          notifyOnExit: false,
        },
      });
    } else {
      await prisma.zone.create({
        data: {
          name: crossing.name,
          description: crossing.description,
          centerLat: crossing.centerLat,
          centerLon: crossing.centerLon,
          radius: crossing.radius,
          type: 'BORDER_CROSSING',
          isActive: true,
          notifyOnEntry: false,
          notifyOnExit: false,
        },
      });
    }
  }

  console.log(`✅ Border crossing zones seeded: ${BORDER_CROSSINGS.length}`);

  console.log('');
  console.log('🎉 Seeding completed!');
  console.log('');
  console.log('📝 Initial admin account updated:');
  console.log(`Admin email: ${INITIAL_ADMIN_EMAIL}`);
  console.log('Password: value from INITIAL_ADMIN_PASSWORD environment variable');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

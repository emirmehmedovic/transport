import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { BORDER_CROSSINGS } from '../data/border-crossings';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Hash password
  const hashedPassword = await bcrypt.hash('admin123', 10);

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@transport.com' },
    update: {},
    create: {
      email: 'admin@transport.com',
      password: hashedPassword,
      role: 'ADMIN',
      firstName: 'Admin',
      lastName: 'User',
      phone: '+1234567890',
    },
  });

  console.log('✅ Admin user created:', admin.email);

  // Create test dispatcher
  const dispatcherPassword = await bcrypt.hash('dispatcher123', 10);
  const dispatcher = await prisma.user.upsert({
    where: { email: 'dispatcher@transport.com' },
    update: {},
    create: {
      email: 'dispatcher@transport.com',
      password: dispatcherPassword,
      role: 'DISPATCHER',
      firstName: 'John',
      lastName: 'Dispatcher',
      phone: '+1234567891',
    },
  });

  console.log('✅ Dispatcher user created:', dispatcher.email);

  // Create test driver with full profile
  const driverPassword = await bcrypt.hash('driver123', 10);
  const driverUser = await prisma.user.upsert({
    where: { email: 'driver@transport.com' },
    update: {},
    create: {
      email: 'driver@transport.com',
      password: driverPassword,
      role: 'DRIVER',
      firstName: 'Mike',
      lastName: 'Driver',
      phone: '+1234567892',
    },
  });

  // Create driver profile
  const driver = await prisma.driver.upsert({
    where: { userId: driverUser.id },
    update: {},
    create: {
      userId: driverUser.id,
      hireDate: new Date('2024-01-01'),
      status: 'ACTIVE',
      cdlNumber: 'CDL123456',
      cdlState: 'TX',
      cdlExpiry: new Date('2025-12-31'),
      endorsements: ['H', 'N', 'T'],
      medicalCardExpiry: new Date('2025-06-30'),
      emergencyContactName: 'Jane Driver',
      emergencyContactPhone: '+1234567893',
      ratePerMile: 0.65,
    },
  });

  console.log('✅ Driver user and profile created:', driverUser.email);

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
  console.log('📝 Login credentials:');
  console.log('Admin: admin@transport.com / admin123');
  console.log('Dispatcher: dispatcher@transport.com / dispatcher123');
  console.log('Driver: driver@transport.com / driver123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

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

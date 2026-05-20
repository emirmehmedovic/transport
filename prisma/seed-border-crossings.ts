import { PrismaClient } from '@prisma/client';
import { BORDER_CROSSINGS } from '../data/border-crossings';

export async function seedBorderCrossings(prisma: PrismaClient) {
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

  return BORDER_CROSSINGS.length;
}

async function main() {
  const prisma = new PrismaClient();

  try {
    console.log('🌱 Seeding border crossing zones...');
    const count = await seedBorderCrossings(prisma);
    console.log(`✅ Border crossing zones seeded: ${count}`);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

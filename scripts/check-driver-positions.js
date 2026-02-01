const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDriverPositions() {
  try {
    console.log('📍 Checking Driver Positions in Database\n');

    const drivers = await prisma.driver.findMany({
      where: {
        status: 'ACTIVE',
        lastKnownLatitude: { not: null },
        lastKnownLongitude: { not: null },
      },
      select: {
        id: true,
        traccarDeviceId: true,
        lastKnownLatitude: true,
        lastKnownLongitude: true,
        lastLocationUpdate: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        lastLocationUpdate: 'desc',
      },
    });

    if (drivers.length === 0) {
      console.log('⚠️  No active drivers with GPS positions found\n');
      return;
    }

    console.log(`Found ${drivers.length} active driver(s) with GPS positions:\n`);

    drivers.forEach((driver, index) => {
      const name = `${driver.user.firstName} ${driver.user.lastName}`;
      const lastUpdate = driver.lastLocationUpdate;
      const now = new Date();
      const ageSeconds = Math.floor((now - new Date(lastUpdate)) / 1000);

      let ageStr;
      if (ageSeconds < 60) {
        ageStr = `${ageSeconds}s ago`;
      } else if (ageSeconds < 3600) {
        ageStr = `${Math.floor(ageSeconds / 60)}m ago`;
      } else if (ageSeconds < 86400) {
        ageStr = `${Math.floor(ageSeconds / 3600)}h ago`;
      } else {
        ageStr = `${Math.floor(ageSeconds / 86400)}d ago`;
      }

      const isStale = ageSeconds > 300; // > 5 minutes
      const statusEmoji = isStale ? '⚠️' : '✅';

      console.log(`${statusEmoji} ${index + 1}. ${name}`);
      console.log(`   Device: ${driver.traccarDeviceId || 'N/A'}`);
      console.log(`   Position: (${driver.lastKnownLatitude?.toFixed(6)}, ${driver.lastKnownLongitude?.toFixed(6)})`);
      console.log(`   Last Update: ${lastUpdate?.toISOString()} (${ageStr})`);

      if (isStale) {
        console.log(`   ⚠️  WARNING: Position is stale (> 5 minutes old)`);
      }

      console.log('');
    });

    // Check recent position updates
    console.log('\n📊 Recent Position Updates (last 10):\n');

    const recentPositions = await prisma.position.findMany({
      orderBy: {
        receivedAt: 'desc',
      },
      take: 10,
      select: {
        deviceId: true,
        latitude: true,
        longitude: true,
        speed: true,
        recordedAt: true,
        receivedAt: true,
        driver: {
          select: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (recentPositions.length === 0) {
      console.log('⚠️  No recent position updates found');
    } else {
      recentPositions.forEach((pos, index) => {
        const driverName = pos.driver?.user
          ? `${pos.driver.user.firstName} ${pos.driver.user.lastName}`
          : 'Unknown';

        const receivedAgo = Math.floor((Date.now() - new Date(pos.receivedAt).getTime()) / 1000);
        let ageStr;
        if (receivedAgo < 60) {
          ageStr = `${receivedAgo}s ago`;
        } else if (receivedAgo < 3600) {
          ageStr = `${Math.floor(receivedAgo / 60)}m ago`;
        } else {
          ageStr = `${Math.floor(receivedAgo / 3600)}h ago`;
        }

        console.log(`${index + 1}. ${driverName} (${pos.deviceId})`);
        console.log(`   Position: (${pos.latitude.toFixed(6)}, ${pos.longitude.toFixed(6)})`);
        console.log(`   Speed: ${pos.speed || 0} km/h`);
        console.log(`   Received: ${pos.receivedAt.toISOString()} (${ageStr})`);
        console.log('');
      });
    }

    console.log('✅ Check complete!\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDriverPositions();

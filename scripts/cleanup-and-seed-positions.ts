/**
 * Cleanup bad position data and seed realistic dummy data for testing
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Generate realistic GPS route from Sarajevo to Banja Luka
 * Returns array of positions with timestamps, coordinates, speeds
 */
function generateRealisticRoute(driverId: string, deviceId: string) {
  const positions = [];

  // Route: Sarajevo → Zenica → Doboj → Banja Luka
  // Approximate route waypoints
  const waypoints = [
    // Sarajevo start
    { lat: 43.8563, lon: 18.4131, city: 'Sarajevo' },
    { lat: 43.8650, lon: 18.3950, city: 'Sarajevo outskirts' },
    { lat: 43.9200, lon: 18.3100, city: 'Heading to Visoko' },
    { lat: 44.0000, lon: 18.2500, city: 'Visoko area' },
    { lat: 44.1500, lon: 18.1800, city: 'Approaching Zenica' },

    // Zenica
    { lat: 44.2050, lon: 17.9075, city: 'Zenica center' },
    { lat: 44.2200, lon: 17.8500, city: 'Zenica north' },

    // To Doboj
    { lat: 44.3500, lon: 17.7500, city: 'Between Zenica-Doboj' },
    { lat: 44.5000, lon: 17.8500, city: 'Approaching Doboj' },

    // Doboj
    { lat: 44.7331, lon: 18.0870, city: 'Doboj' },
    { lat: 44.7500, lon: 18.0500, city: 'Doboj north' },

    // To Banja Luka
    { lat: 44.7700, lon: 17.8500, city: 'Heading west' },
    { lat: 44.7850, lon: 17.6500, city: 'Approaching Banja Luka' },

    // Banja Luka
    { lat: 44.7722, lon: 17.1910, city: 'Banja Luka center' },
  ];

  // Start time: 3 days ago at 8:00 AM
  const startTime = new Date();
  startTime.setDate(startTime.getDate() - 3);
  startTime.setHours(8, 0, 0, 0);

  let currentTime = new Date(startTime);

  // Generate positions between waypoints
  for (let i = 0; i < waypoints.length - 1; i++) {
    const start = waypoints[i];
    const end = waypoints[i + 1];

    // Calculate distance between waypoints (simplified)
    const distance = Math.sqrt(
      Math.pow((end.lat - start.lat) * 111, 2) +
      Math.pow((end.lon - start.lon) * 111 * Math.cos(start.lat * Math.PI / 180), 2)
    );

    // Average speed 70-90 km/h on highway
    const avgSpeed = 70 + Math.random() * 20;
    const travelTimeHours = distance / avgSpeed;
    const segments = Math.max(5, Math.floor(distance / 5)); // Point every ~5km

    for (let j = 0; j <= segments; j++) {
      const ratio = j / segments;
      const lat = start.lat + (end.lat - start.lat) * ratio;
      const lon = start.lon + (end.lon - start.lon) * ratio;

      // Add some random variance to make it realistic
      const latVariance = (Math.random() - 0.5) * 0.001;
      const lonVariance = (Math.random() - 0.5) * 0.001;

      // Speed varies around average (60-100 km/h)
      const speed = Math.max(0, avgSpeed + (Math.random() - 0.5) * 30);

      // Bearing (direction)
      const bearing = Math.atan2(
        end.lon - start.lon,
        end.lat - start.lat
      ) * 180 / Math.PI;

      positions.push({
        driverId,
        deviceId,
        latitude: lat + latVariance,
        longitude: lon + lonVariance,
        speed,
        bearing: (bearing + 360) % 360,
        altitude: 200 + Math.random() * 500, // 200-700m elevation
        battery: 85 + Math.random() * 10, // 85-95%
        accuracy: 5 + Math.random() * 10, // 5-15m
        recordedAt: new Date(currentTime),
        receivedAt: new Date(currentTime),
      });

      // Increment time (proportional to segment)
      currentTime = new Date(currentTime.getTime() + (travelTimeHours * 60 * 60 * 1000) / segments);

      // Random stops (10% chance)
      if (Math.random() < 0.1) {
        // Add a stop (same position, speed 0)
        const stopDuration = 5 + Math.random() * 15; // 5-20 min stop
        currentTime = new Date(currentTime.getTime() + stopDuration * 60 * 1000);

        positions.push({
          driverId,
          deviceId,
          latitude: lat + latVariance,
          longitude: lon + lonVariance,
          speed: 0,
          bearing: (bearing + 360) % 360,
          altitude: 200 + Math.random() * 500,
          battery: 85 + Math.random() * 10,
          accuracy: 5 + Math.random() * 10,
          recordedAt: new Date(currentTime),
          receivedAt: new Date(currentTime),
        });
      }
    }
  }

  return positions;
}

async function main() {
  console.log('🧹 Cleaning up bad position data...');

  // Delete positions with invalid dates (before 2020)
  const deletedCount = await prisma.position.deleteMany({
    where: {
      recordedAt: {
        lt: new Date('2020-01-01'),
      },
    },
  });

  console.log(`✅ Deleted ${deletedCount.count} positions with invalid dates`);

  // Find Mike Driver
  console.log('\n🔍 Finding Mike Driver...');
  const driver = await prisma.driver.findFirst({
    where: {
      user: {
        firstName: 'Mike',
        lastName: 'Driver',
      },
    },
    include: {
      user: true,
    },
  });

  if (!driver) {
    console.log('❌ Mike Driver not found!');
    return;
  }

  console.log(`✅ Found driver: ${driver.user.firstName} ${driver.user.lastName}`);
  console.log(`   Device ID: ${driver.traccarDeviceId}`);

  // Generate realistic positions
  console.log('\n📍 Generating realistic GPS route...');
  const positions = generateRealisticRoute(
    driver.id,
    driver.traccarDeviceId || 'kamion0001'
  );

  console.log(`   Generated ${positions.length} position points`);
  console.log(`   Route: Sarajevo → Zenica → Doboj → Banja Luka`);
  console.log(`   Time span: ${positions[0].recordedAt.toISOString()} to ${positions[positions.length - 1].recordedAt.toISOString()}`);

  // Save to database
  console.log('\n💾 Saving positions to database...');

  let saved = 0;
  for (const pos of positions) {
    await prisma.position.create({
      data: pos,
    });
    saved++;

    if (saved % 50 === 0) {
      console.log(`   Saved ${saved}/${positions.length}...`);
    }
  }

  console.log(`✅ Saved ${saved} positions`);

  // Update driver's last known location (last position)
  const lastPos = positions[positions.length - 1];
  await prisma.driver.update({
    where: { id: driver.id },
    data: {
      lastKnownLatitude: lastPos.latitude,
      lastKnownLongitude: lastPos.longitude,
      lastLocationUpdate: lastPos.recordedAt,
    },
  });

  console.log('\n✅ Driver location updated');

  // Summary
  console.log('\n📊 Summary:');
  console.log(`   Total positions in DB for Mike Driver: ${saved}`);
  console.log(`   Route distance: ~${Math.round(positions.length * 5)} km`);
  console.log(`   Average speed: ~${Math.round(positions.reduce((sum, p) => sum + p.speed, 0) / positions.length)} km/h`);
  console.log(`\n🎉 Done! You can now test the replay at:`);
  console.log(`   http://localhost:3000/drivers/${driver.id}/replay`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

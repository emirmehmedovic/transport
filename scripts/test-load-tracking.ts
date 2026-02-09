/**
 * Test script for automatic and manual load tracking
 */

import { PrismaClient } from '@prisma/client';
import { checkLoadProximity } from '../lib/geofence';

const prisma = new PrismaClient();

async function main() {
  console.log('🧪 Testing Load Tracking System\n');

  // Find Mike Driver
  const driver = await prisma.driver.findFirst({
    where: {
      user: {
        firstName: 'Mike',
        lastName: 'Driver',
      },
    },
    include: {
      user: true,
      primaryTruck: true,
    },
  });

  if (!driver) {
    console.log('❌ Mike Driver not found');
    return;
  }

  console.log(`✅ Driver found: ${driver.user.firstName} ${driver.user.lastName}`);
  console.log(`   Truck: ${driver.primaryTruck?.truckNumber || 'N/A'}\n`);

  // Create a test load near Sarajevo
  console.log('📦 Creating test load...');

  const testLoad = await prisma.load.create({
    data: {
      loadNumber: `TEST-${Date.now()}`,
      status: 'ASSIGNED',
      driverId: driver.id,
      truckId: driver.primaryTruck?.id || null,

      // Pickup: Sarajevo City Center
      pickupAddress: 'Ferhadija 15',
      pickupCity: 'Sarajevo',
      pickupState: 'BiH',
      pickupZip: '71000',
      pickupLatitude: 43.8563,
      pickupLongitude: 18.4131,
      pickupContactName: 'Test Contact',
      pickupContactPhone: '+387 33 123 456',

      // Delivery: Banja Luka City Center
      deliveryAddress: 'Kralja Petra I Karađorđevića 1',
      deliveryCity: 'Banja Luka',
      deliveryState: 'BiH',
      deliveryZip: '78000',
      deliveryLatitude: 44.7722,
      deliveryLongitude: 17.1910,
      deliveryContactName: 'Test Delivery',
      deliveryContactPhone: '+387 51 234 567',

      // Load details
      scheduledPickupDate: new Date(),
      scheduledDeliveryDate: new Date(Date.now() + 5 * 60 * 60 * 1000), // +5 hours
      distance: 195, // ~195 km
      loadRate: 500,
    },
  });

  console.log(`✅ Test load created: ${testLoad.loadNumber}`);
  console.log(`   Status: ${testLoad.status}`);
  console.log(`   Pickup: ${testLoad.pickupCity} (${testLoad.pickupLatitude}, ${testLoad.pickupLongitude})`);
  console.log(`   Delivery: ${testLoad.deliveryCity} (${testLoad.deliveryLatitude}, ${testLoad.deliveryLongitude})\n`);

  // Test 1: Driver far from pickup (no update expected)
  console.log('📍 Test 1: Driver far from pickup location');
  console.log('   Simulating GPS at: Zenica (44.2050, 17.9075)');
  await checkLoadProximity(driver.id, 44.2050, 17.9075);

  let load = await prisma.load.findUnique({ where: { id: testLoad.id } });
  console.log(`   Result: Status = ${load?.status}`);
  console.log(`   Expected: ASSIGNED (no change)\n`);

  // Test 2: Driver near pickup (update expected)
  console.log('📍 Test 2: Driver near pickup location (within 500m)');
  console.log('   Simulating GPS at: Near Ferhadija (43.8565, 18.4135)');
  await checkLoadProximity(driver.id, 43.8565, 18.4135);

  load = await prisma.load.findUnique({ where: { id: testLoad.id } });
  console.log(`   Result: Status = ${load?.status}`);
  console.log(`   Expected: PICKED_UP ✅\n`);

  if (load?.status === 'PICKED_UP') {
    console.log('🎉 Auto-update PASSED: ASSIGNED → PICKED_UP\n');
  } else {
    console.log('❌ Auto-update FAILED\n');
  }

  // Manually change to IN_TRANSIT for delivery test
  await prisma.load.update({
    where: { id: testLoad.id },
    data: { status: 'IN_TRANSIT' },
  });

  console.log('🔄 Manually set status to IN_TRANSIT for delivery test\n');

  // Test 3: Driver near delivery (update expected)
  console.log('📍 Test 3: Driver near delivery location (within 500m)');
  console.log('   Simulating GPS at: Near Banja Luka center (44.7720, 17.1915)');
  await checkLoadProximity(driver.id, 44.7720, 17.1915);

  load = await prisma.load.findUnique({ where: { id: testLoad.id } });
  console.log(`   Result: Status = ${load?.status}`);
  console.log(`   Expected: DELIVERED ✅\n`);

  if (load?.status === 'DELIVERED') {
    console.log('🎉 Auto-update PASSED: IN_TRANSIT → DELIVERED\n');
  } else {
    console.log('❌ Auto-update FAILED\n');
  }

  // Summary
  console.log('📊 Test Summary:');
  console.log(`   Test load: ${testLoad.loadNumber}`);
  console.log(`   Final status: ${load?.status}`);
  console.log(`   Pickup timestamp: ${load?.actualPickupDate?.toISOString() || 'N/A'}`);
  console.log(`   Delivery timestamp: ${load?.actualDeliveryDate?.toISOString() || 'N/A'}\n`);

  // Cleanup option
  console.log('🧹 To cleanup test load, run:');
  console.log(`   npx prisma studio`);
  console.log(`   Or: DELETE FROM Load WHERE id = '${testLoad.id}'\n`);

  console.log('✅ Tests completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

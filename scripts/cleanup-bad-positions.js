const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupBadPositions() {
  try {
    console.log('🧹 Cleaning up positions with bad timestamps (before 2020)...\n');

    // Find all bad positions
    const badPositions = await prisma.position.findMany({
      where: {
        recordedAt: {
          lt: new Date('2020-01-01'),
        },
      },
      include: {
        driver: {
          include: {
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

    if (badPositions.length === 0) {
      console.log('✅ No bad positions found! Database is clean.');
      await prisma.$disconnect();
      return;
    }

    console.log(`Found ${badPositions.length} bad positions:\n`);

    // Group by driver
    const byDriver = badPositions.reduce((acc, pos) => {
      const driverName = `${pos.driver.user.firstName} ${pos.driver.user.lastName}`;
      if (!acc[driverName]) {
        acc[driverName] = [];
      }
      acc[driverName].push(pos);
      return acc;
    }, {});

    // Show summary
    Object.entries(byDriver).forEach(([driverName, positions]) => {
      console.log(`  ${driverName}: ${positions.length} bad positions`);
      const oldest = positions.sort((a, b) => a.recordedAt - b.recordedAt)[0];
      const newest = positions.sort((a, b) => b.recordedAt - a.recordedAt)[0];
      console.log(`    Oldest: ${oldest.recordedAt.toISOString()}`);
      console.log(`    Newest: ${newest.recordedAt.toISOString()}`);
    });

    console.log('\n❓ Do you want to delete these positions? (y/N)');

    // Simple confirmation (requires manual execution)
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    readline.question('', async (answer) => {
      if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        console.log('\n🗑️  Deleting bad positions...');

        const result = await prisma.position.deleteMany({
          where: {
            recordedAt: {
              lt: new Date('2020-01-01'),
            },
          },
        });

        console.log(`\n✅ Deleted ${result.count} positions with bad timestamps`);
        console.log('');
        console.log('Next GPS updates will create new positions with correct timestamps.');
        console.log('');
      } else {
        console.log('\n❌ Cleanup cancelled');
      }

      readline.close();
      await prisma.$disconnect();
    });

  } catch (error) {
    console.error('❌ Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

cleanupBadPositions();

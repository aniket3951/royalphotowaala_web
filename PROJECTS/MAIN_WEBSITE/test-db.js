const { PrismaClient } = require('@prisma/client');

// Set DATABASE_URL directly
process.env.DATABASE_URL = "file:./dev.db";

const prisma = new PrismaClient();

async function testDatabase() {
  console.log('🔍 Testing database connection...');
  
  try {
    // Test database connection
    const count = await prisma.booking.count();
    console.log(`✅ Database connected! Found ${count} bookings`);
    
    // Test creating a record
    const testBooking = await prisma.booking.create({
      data: {
        name: 'Test User',
        phone: '+1234567890',
        package: 'Test Package',
        date: '2024-12-25',
        details: 'Test booking for database verification',
        status: 'pending'
      }
    });
    
    console.log(`✅ Test booking created: ${testBooking.id}`);
    
    // Test reading records
    const bookings = await prisma.booking.findMany({
      take: 3,
      orderBy: { created_at: 'desc' }
    });
    
    console.log('📋 Recent bookings:');
    bookings.forEach(booking => {
      console.log(`  - ${booking.name} (${booking.phone}) - ${booking.status}`);
    });
    
    console.log('✅ Database test completed successfully!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();

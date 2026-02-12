const { PrismaClient } = require('@prisma/client');

// Set DATABASE_URL directly
process.env.DATABASE_URL = "file:./dev.db";

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create a sample booking
  const sampleBooking = await prisma.booking.create({
    data: {
      name: 'John Doe',
      phone: '+1234567890',
      package: 'Premium Wedding Package',
      date: '2024-12-25',
      details: 'Looking for wedding photography services',
      status: 'pending'
    }
  });

  console.log('✅ Created sample booking:', sampleBooking);

  // Create a sample gallery image
  const sampleGallery = await prisma.gallery.create({
    data: {
      image_url: '/static/images/sample-wedding.jpg',
      public_id: 'sample_wedding_' + Date.now(),
      caption: 'Beautiful wedding ceremony'
    }
  });

  console.log('✅ Created sample gallery image:', sampleGallery);

  // Create a site asset (logo)
  const sampleLogo = await prisma.siteAsset.create({
    data: {
      asset_type: 'logo',
      image_url: '/static/images/logo.png',
      public_id: 'logo_456',
      alt_text: 'Royal Photowaala Logo'
    }
  });

  console.log('✅ Created sample logo:', sampleLogo);

  // Create sample home images
  const sampleHomeImage1 = await prisma.homeImage.create({
    data: {
      image_url: '/static/images/home1.jpg',
      public_id: 'home1_789',
      caption: 'Wedding photography at its finest',
      display_order: 1
    }
  });

  const sampleHomeImage2 = await prisma.homeImage.create({
    data: {
      image_url: '/static/images/home2.jpg',
      public_id: 'home2_012',
      caption: 'Professional event coverage',
      display_order: 2
    }
  });

  console.log('✅ Created sample home images:', [sampleHomeImage1, sampleHomeImage2]);

  console.log('🎉 Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

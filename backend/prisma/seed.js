const { prisma } = require('../src/shared/prisma');
const bcrypt = require('bcrypt');

async function main() {
  console.log(' start seeding...');

  await prisma.suspensionAppeal.deleteMany();
  await prisma.playerReport.deleteMany();

  await prisma.walletTransaction.deleteMany();
  await prisma.wallet.deleteMany();

  await prisma.notification.deleteMany();
  await prisma.penalty.deleteMany();

  await prisma.waitlistEntry.deleteMany();
  await prisma.matchJoinRequest.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.matchGuest.deleteMany();

  await prisma.passwordResetToken.deleteMany();

  await prisma.match.deleteMany();
  await prisma.field.deleteMany();
  await prisma.sportsCenter.deleteMany();
  await prisma.user.deleteMany();

  console.log(' Old data deleted');

  const passwordHash = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.create({
    data: {
      name: 'Admin Manca il Decimo',
      email: 'admin@example.com',
      phone: '3330000000',
      passwordHash,
      role: 'ADMIN',
      reliabilityScore: 100,
      preferredRole: null,
      isPremium: false,
    },
  });

  const mario = await prisma.user.create({
    data: {
      name: 'Mario Rossi',
      email: 'mario@example.com',
      phone: '3331111111',
      passwordHash,
      role: 'USER',
      reliabilityScore: 100,
      preferredRole: 'PORTIERE',
      isPremium: true,
    },
  });

  const luca = await prisma.user.create({
    data: {
      name: 'Luca Bianchi',
      email: 'luca@example.com',
      phone: '3332222222',
      passwordHash,
      role: 'USER',
      reliabilityScore: 100,
      preferredRole: 'DIFENSORE',
      isPremium: false,
    },
  });

  const giulia = await prisma.user.create({
    data: {
      name: 'Giulia Verdi',
      email: 'giulia@example.com',
      phone: '3333333333',
      passwordHash,
      role: 'USER',
      reliabilityScore: 100,
      preferredRole: 'ATTACCANTE',
      isPremium: false,
    },
  });

  console.log(' Users created');

  await prisma.wallet.createMany({
    data: [
      {
        userId: admin.id,
        balance: 0,
      },
      {
        userId: mario.id,
        balance: 50,
      },
      {
        userId: luca.id,
        balance: 50,
      },
      {
        userId: giulia.id,
        balance: 50,
      },
    ],
  });

  console.log(' Wallets created');

  const romaSport = await prisma.sportsCenter.create({
    data: {
      name: 'Roma Sport Center',
      address: 'Via Tuscolana 120',
      city: 'Milano',
      phone: '0612345678',
      distanceKm: 3.2,
    },
  });

  const greenArena = await prisma.sportsCenter.create({
    data: {
      name: 'Green Arena',
      address: 'Via Appia 45',
      city: 'Milano',
      phone: '0698765432',
      distanceKm: 7.2,
    },
  });

  const milanoFootballHub = await prisma.sportsCenter.create({
    data: {
      name: 'Milano Football Hub',
      address: 'Via Torino 22',
      city: 'Milano',
      phone: '0245123456',
      distanceKm: 2.1,
    },
  });

  const navigliSportVillage = await prisma.sportsCenter.create({
    data: {
      name: 'Navigli Sport Village',
      address: 'Alzaia Naviglio Grande 18',
      city: 'Milano',
      phone: '0287654321',
      distanceKm: 4.5,
    },
  });

  const bicoccaArena = await prisma.sportsCenter.create({
    data: {
      name: 'Bicocca Arena',
      address: 'Viale Sarca 95',
      city: 'Milano',
      phone: '0299988877',
      distanceKm: 6.3,
    },
  });

  console.log('Sports centres created');


  await prisma.field.createMany({
    data: [

      {
        name: 'Campo A',
        sportType: 'Calcetto',
        size: '5vs5',
        surface: 'Erba sintetica',
        indoor: false,
        pricePerHour: 60,
        sportsCenterId: romaSport.id,
      },
      {
        name: 'Campo B',
        sportType: 'Calcetto',
        size: '7vs7',
        surface: 'Erba sintetica',
        indoor: true,
        pricePerHour: 80,
        sportsCenterId: romaSport.id,
      },


      {
        name: 'Campo Green 1',
        sportType: 'Calcetto',
        size: '5vs5',
        surface: 'Cemento',
        indoor: false,
        pricePerHour: 50,
        sportsCenterId: greenArena.id,
      },


      {
        name: 'Campo Hub 5',
        sportType: 'Calcetto',
        size: '5vs5',
        surface: 'Erba sintetica',
        indoor: false,
        pricePerHour: 55,
        sportsCenterId: milanoFootballHub.id,
      },
      {
        name: 'Campo Hub 6',
        sportType: 'Calcetto',
        size: '6vs6',
        surface: 'Erba sintetica',
        indoor: false,
        pricePerHour: 70,
        sportsCenterId: milanoFootballHub.id,
      },
      {
        name: 'Campo Hub 7',
        sportType: 'Calcetto',
        size: '7vs7',
        surface: 'Erba sintetica',
        indoor: true,
        pricePerHour: 85,
        sportsCenterId: milanoFootballHub.id,
      },


      {
        name: 'Campo Navigli 5',
        sportType: 'Calcetto',
        size: '5vs5',
        surface: 'Erba sintetica',
        indoor: false,
        pricePerHour: 58,
        sportsCenterId: navigliSportVillage.id,
      },
      {
        name: 'Campo Navigli 6',
        sportType: 'Calcetto',
        size: '6vs6',
        surface: 'Erba sintetica',
        indoor: true,
        pricePerHour: 72,
        sportsCenterId: navigliSportVillage.id,
      },


      {
        name: 'Campo Bicocca 6',
        sportType: 'Calcetto',
        size: '6vs6',
        surface: 'Erba sintetica',
        indoor: false,
        pricePerHour: 68,
        sportsCenterId: bicoccaArena.id,
      },
      {
        name: 'Campo Bicocca 7',
        sportType: 'Calcetto',
        size: '7vs7',
        surface: 'Erba sintetica',
        indoor: false,
        pricePerHour: 82,
        sportsCenterId: bicoccaArena.id,
      },
    ],
  });

  console.log(' Fields created');

  console.log(' Seed completed');

  console.log('');
  console.log('Account demo disponibili:');
  console.log('ADMIN -> admin@example.com / password123');
  console.log('USER  -> mario@example.com / password123');
  console.log('USER  -> luca@example.com / password123');
  console.log('USER  -> giulia@example.com / password123');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
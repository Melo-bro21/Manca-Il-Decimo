const prisma = require('./shared/prisma');

async function main() { 
 const user = await prisma.user.create({
  data: {
    email: 'test4@example.com',
    name: 'Utente Test'
  },
 });

 console.log('Utente creato:',user);

 const users = await prisma.user.findMany(); 

 console.log('Lista utenti:',users);
}

main()
 .catch((error)=>{
    console.error('Errore durante il test Prisma:',error)
 })
  .finally(async () => {
    await prisma.$disconnect();
  })
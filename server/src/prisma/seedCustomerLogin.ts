import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const customer = await prisma.customer.findFirst({
    where: { name: { contains: 'Anand' } },
  });

  const hash = await bcrypt.hash('Cust@123', 10);

  if (customer) {
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        loginId: 'CUST-101',
        password: hash,
        canLogin: true,
      },
    });
    console.log(`Customer ${customer.name} updated with loginId: CUST-101, password: Cust@123`);
  } else {
    const business = await prisma.business.findFirst();
    if (!business) return;
    const newCust = await prisma.customer.create({
      data: {
        businessId: business.id,
        name: 'Anand Traders (Customer Demo)',
        phone: '9845099001',
        email: 'anand@customer.com',
        loginId: 'CUST-101',
        password: hash,
        canLogin: true,
        balance: 15400,
        creditLimit: 50000,
      },
    });
    console.log(`Created customer ${newCust.name} with loginId: CUST-101, password: Cust@123`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

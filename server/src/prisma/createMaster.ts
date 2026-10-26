import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const business = await prisma.business.findFirst();
  if (!business) {
    console.log('No business found');
    return;
  }
  const branch = await prisma.branch.findFirst({ where: { businessId: business.id } });
  const hash = await bcrypt.hash('Master@123', 10);

  const existing = await prisma.user.findUnique({ where: { email: 'master@billingpro.com' } });
  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { role: 'MASTER_ADMIN', name: 'Master Admin (Owner)', password: hash },
    });
    console.log('Master Admin updated successfully');
  } else {
    await prisma.user.create({
      data: {
        businessId: business.id,
        branchId: branch ? branch.id : null,
        name: 'Master Admin (Owner)',
        email: 'master@billingpro.com',
        password: hash,
        role: 'MASTER_ADMIN',
        phone: '+91 99999 88888',
      },
    });
    console.log('Master Admin created successfully');
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });

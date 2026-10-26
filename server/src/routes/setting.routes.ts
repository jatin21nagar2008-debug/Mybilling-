import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma';
import { authenticateToken, requireRoles } from '../middlewares/auth.middleware';

const router = Router();

// GET /api/settings/business
router.get('/business', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const businessId = req.user!.businessId;
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: {
        branches: true,
      },
    });

    if (!business) {
      res.status(404).json({ success: false, message: 'Business settings not found' });
      return;
    }

    res.json({ success: true, data: business });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch business settings' });
  }
});

// PUT /api/settings/business
router.put('/business', authenticateToken, requireRoles(['ADMIN']), async (req: Request, res: Response): Promise<void> => {
  try {
    const businessId = req.user!.businessId;
    const {
      name,
      legalName,
      gstin,
      pan,
      email,
      phone,
      address,
      city,
      state,
      pincode,
      currency,
      currencySymbol,
      invoicePrefix,
      termsFooter,
      logoUrl,
    } = req.body;

    const updated = await prisma.business.update({
      where: { id: businessId },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        legalName: legalName !== undefined ? legalName.trim() : undefined,
        gstin: gstin !== undefined ? gstin.trim().toUpperCase() : undefined,
        pan: pan !== undefined ? pan.trim().toUpperCase() : undefined,
        email: email !== undefined ? email.trim() : undefined,
        phone: phone !== undefined ? phone.trim() : undefined,
        address: address !== undefined ? address.trim() : undefined,
        city: city !== undefined ? city.trim() : undefined,
        state: state !== undefined ? state.trim() : undefined,
        pincode: pincode !== undefined ? pincode.trim() : undefined,
        currency: currency !== undefined ? currency.trim() : undefined,
        currencySymbol: currencySymbol !== undefined ? currencySymbol.trim() : undefined,
        invoicePrefix: invoicePrefix !== undefined ? invoicePrefix.trim() : undefined,
        termsFooter: termsFooter !== undefined ? termsFooter.trim() : undefined,
        logoUrl: logoUrl !== undefined ? logoUrl.trim() : undefined,
      },
    });

    await prisma.auditLog.create({
      data: {
        businessId,
        userId: req.user!.id,
        action: 'UPDATE_SETTINGS',
        entity: 'Business',
        entityId: businessId,
        details: `Updated business information and invoice configuration`,
      },
    });

    res.json({ success: true, message: 'Business configuration updated successfully', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update business configuration' });
  }
});

// GET /api/settings/users
router.get('/users', authenticateToken, requireRoles(['ADMIN', 'MANAGER']), async (req: Request, res: Response): Promise<void> => {
  try {
    const businessId = req.user!.businessId;
    const users = await prisma.user.findMany({
      where: { businessId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        isActive: true,
        createdAt: true,
        branch: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch team members' });
  }
});

// POST /api/settings/users
router.post('/users', authenticateToken, requireRoles(['ADMIN']), async (req: Request, res: Response): Promise<void> => {
  try {
    const businessId = req.user!.businessId;
    const { name, email, password, role = 'CASHIER', phone, branchId } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ success: false, message: 'Name, email, and password are required' });
      return;
    }

    // Only MASTER_ADMIN can create an ADMIN or MASTER_ADMIN!
    if ((role === 'ADMIN' || role === 'MASTER_ADMIN') && req.user!.role !== 'MASTER_ADMIN') {
      res.status(403).json({
        success: false,
        message: 'Only Master Admin has authority to create Admin accounts.',
      });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) {
      res.status(400).json({ success: false, message: 'A user with this email already exists' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: {
        businessId,
        branchId: branchId || null,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role,
        phone: phone?.trim(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        isActive: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        businessId,
        userId: req.user!.id,
        action: 'CREATE_USER',
        entity: 'User',
        entityId: newUser.id,
        details: `Created user account for ${newUser.name} with role ${newUser.role}`,
      },
    });

    res.status(201).json({ success: true, message: 'User created successfully', data: newUser });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to create user' });
  }
});

// DELETE /api/settings/users/:id
router.delete('/users/:id', authenticateToken, requireRoles(['ADMIN']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const target = await prisma.user.findUnique({ where: { id } });

    if (!target) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    if (target.role === 'MASTER_ADMIN') {
      res.status(403).json({ success: false, message: 'Master Admin account cannot be deleted' });
      return;
    }

    if (target.role === 'ADMIN' && req.user!.role !== 'MASTER_ADMIN') {
      res.status(403).json({ success: false, message: 'Only Master Admin can delete another Admin' });
      return;
    }

    await prisma.user.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        businessId: req.user!.businessId,
        userId: req.user!.id,
        action: 'DELETE_USER',
        entity: 'User',
        entityId: id,
        details: `Deleted user ${target.name} (${target.email}) with role ${target.role}`,
      },
    });

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to delete user' });
  }
});

// GET /api/settings/audit-logs
router.get('/audit-logs', authenticateToken, requireRoles(['ADMIN']), async (req: Request, res: Response): Promise<void> => {
  try {
    const businessId = req.user!.businessId;
    const logs = await prisma.auditLog.findMany({
      where: { businessId },
      include: {
        user: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch audit trail' });
  }
});

export default router;

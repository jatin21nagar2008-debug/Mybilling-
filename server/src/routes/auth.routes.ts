import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'billingpro_secret_key_production_grade_super_secure_2026';

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, loginId, password } = req.body;
    const identifier = (loginId || email || '').trim();

    if (!identifier || !password) {
      res.status(400).json({ success: false, message: 'Login ID / Email and password are required' });
      return;
    }

    // 1. Try Staff / Admin User first
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase() },
          { phone: identifier },
        ],
      },
      include: {
        business: true,
        branch: true,
      },
    });

    if (user) {
      if (!user.isActive) {
        res.status(401).json({ success: false, message: 'Account is disabled. Contact your administrator.' });
        return;
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        res.status(401).json({ success: false, message: 'Invalid credentials. Please verify ID and password.' });
        return;
      }

      const token = jwt.sign(
        { userId: user.id, businessId: user.businessId, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Record audit log
      await prisma.auditLog.create({
        data: {
          businessId: user.businessId,
          userId: user.id,
          action: 'USER_LOGIN',
          entity: 'User',
          entityId: user.id,
          details: `Staff ${user.name} (${user.role}) logged in successfully`,
          ipAddress: req.ip || req.socket.remoteAddress,
        },
      });

      res.json({
        success: true,
        token,
        role: user.role,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          branch: user.branch ? { id: user.branch.id, name: user.branch.name } : null,
        },
        business: {
          id: user.business.id,
          name: user.business.name,
          gstin: user.business.gstin,
          currency: user.business.currency,
          currencySymbol: user.business.currencySymbol,
          invoicePrefix: user.business.invoicePrefix,
          termsFooter: user.business.termsFooter,
        },
      });
      return;
    }

    // 2. Try Customer Login
    const customer = await prisma.customer.findFirst({
      where: {
        canLogin: true,
        OR: [
          { loginId: identifier },
          { phone: identifier },
          { email: identifier.toLowerCase() },
        ],
      },
      include: {
        business: true,
      },
    });

    if (!customer || !customer.password) {
      res.status(401).json({ success: false, message: 'Invalid credentials or Customer Portal access not enabled' });
      return;
    }

    const isMatch = await bcrypt.compare(password, customer.password);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid Customer ID or Password' });
      return;
    }

    const token = jwt.sign(
      { customerId: customer.id, businessId: customer.businessId, role: 'CUSTOMER' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      role: 'CUSTOMER',
      user: {
        id: customer.id,
        customerId: customer.id,
        name: customer.name,
        email: customer.email || '',
        phone: customer.phone || '',
        loginId: customer.loginId || '',
        role: 'CUSTOMER',
        balance: customer.balance,
      },
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        gstin: customer.gstin,
        address: customer.address,
        city: customer.city,
        state: customer.state,
        balance: customer.balance,
        creditLimit: customer.creditLimit,
        loginId: customer.loginId,
      },
      business: {
        id: customer.business.id,
        name: customer.business.name,
        phone: customer.business.phone,
        email: customer.business.email,
        address: customer.business.address,
        gstin: customer.business.gstin,
        currency: customer.business.currency,
        currencySymbol: customer.business.currencySymbol,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Internal server error during login' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // Check if Customer
    if (req.user.role === 'CUSTOMER') {
      const customer = await prisma.customer.findUnique({
        where: { id: req.user.id },
        include: { business: true },
      });

      if (!customer) {
        res.status(404).json({ success: false, message: 'Customer account not found' });
        return;
      }

      res.json({
        success: true,
        role: 'CUSTOMER',
        user: {
          id: customer.id,
          customerId: customer.id,
          name: customer.name,
          email: customer.email || '',
          phone: customer.phone || '',
          loginId: customer.loginId || '',
          role: 'CUSTOMER',
          balance: customer.balance,
        },
        customer: {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          gstin: customer.gstin,
          address: customer.address,
          city: customer.city,
          state: customer.state,
          balance: customer.balance,
          creditLimit: customer.creditLimit,
          loginId: customer.loginId,
        },
        business: {
          id: customer.business.id,
          name: customer.business.name,
          phone: customer.business.phone,
          email: customer.business.email,
          address: customer.business.address,
          gstin: customer.business.gstin,
          currency: customer.business.currency,
          currencySymbol: customer.business.currencySymbol,
        },
      });
      return;
    }

    // Staff User
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        business: true,
        branch: true,
      },
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.json({
      success: true,
      role: user.role,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        branch: user.branch ? { id: user.branch.id, name: user.branch.name } : null,
      },
      business: {
        id: user.business.id,
        name: user.business.name,
        legalName: user.business.legalName,
        gstin: user.business.gstin,
        pan: user.business.pan,
        phone: user.business.phone,
        email: user.business.email,
        address: user.business.address,
        city: user.business.city,
        state: user.business.state,
        pincode: user.business.pincode,
        currency: user.business.currency,
        currencySymbol: user.business.currencySymbol,
        invoicePrefix: user.business.invoicePrefix,
        invoiceNextNum: user.business.invoiceNextNum,
        termsFooter: user.business.termsFooter,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch current user' });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.user) {
      await prisma.auditLog.create({
        data: {
          businessId: req.user.businessId,
          userId: req.user.id,
          action: 'USER_LOGOUT',
          entity: 'User',
          entityId: req.user.id,
          details: `User ${req.user.name} logged out`,
        },
      });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.json({ success: true, message: 'Logged out' });
  }
});

export default router;

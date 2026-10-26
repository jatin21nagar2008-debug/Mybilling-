import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';

export interface AuthUser {
  id: string;
  businessId: string;
  branchId?: string | null;
  name: string;
  email: string;
  role: 'MASTER_ADMIN' | 'ADMIN' | 'MANAGER' | 'CASHIER' | 'CUSTOMER';
  customerId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'billingpro_secret_key_production_grade_super_secure_2026';

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: 'Authentication token required' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId?: string;
      customerId?: string;
      businessId: string;
      role?: string;
    };

    if (decoded.customerId || decoded.role === 'CUSTOMER') {
      const customer = await prisma.customer.findUnique({
        where: { id: decoded.customerId },
        include: { business: true },
      });

      if (!customer || !customer.canLogin) {
        res.status(401).json({ success: false, message: 'Customer portal access disabled or not found' });
        return;
      }

      req.user = {
        id: customer.id,
        customerId: customer.id,
        businessId: customer.businessId,
        name: customer.name,
        email: customer.email || customer.loginId || customer.phone || '',
        role: 'CUSTOMER',
      };
      next();
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        businessId: true,
        branchId: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ success: false, message: 'User account inactive or not found' });
      return;
    }

    req.user = {
      id: user.id,
      businessId: user.businessId,
      branchId: user.branchId,
      name: user.name,
      email: user.email,
      role: user.role as 'MASTER_ADMIN' | 'ADMIN' | 'MANAGER' | 'CASHIER',
    };

    next();
  } catch (error) {
    res.status(403).json({ success: false, message: 'Invalid or expired session token' });
  }
};

export const requireRoles = (allowedRoles: Array<'MASTER_ADMIN' | 'ADMIN' | 'MANAGER' | 'CASHIER'>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // MASTER_ADMIN always has full access to all protected endpoints!
    if (req.user.role === 'MASTER_ADMIN' || allowedRoles.includes(req.user.role)) {
      next();
      return;
    }

    res.status(403).json({
      success: false,
      message: `Forbidden: requires ${allowedRoles.join(' or ')} privileges`,
    });
  };
};

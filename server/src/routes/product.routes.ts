import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { authenticateToken, requireRoles } from '../middlewares/auth.middleware';

const router = Router();

// GET /api/products
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const businessId = req.user!.businessId;
    const { search, categoryId, lowStock, activeOnly = 'true' } = req.query;

    const where: any = { businessId };

    if (activeOnly === 'true') {
      where.isActive = true;
    }

    if (categoryId && typeof categoryId === 'string' && categoryId !== 'ALL') {
      where.categoryId = categoryId;
    }

    if (search && typeof search === 'string') {
      const q = search.trim();
      where.OR = [
        { name: { contains: q } },
        { sku: { contains: q } },
        { barcode: { contains: q } },
        { hsnCode: { contains: q } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    let filtered = products;
    if (lowStock === 'true') {
      filtered = products.filter((p) => p.currentStock <= p.minStockAlert);
    }

    res.json({ success: true, count: filtered.length, data: filtered });
  } catch (error) {
    console.error('Fetch products error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch products' });
  }
});

// GET /api/products/barcode/:barcode
router.get('/barcode/:barcode', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const businessId = req.user!.businessId;
    const { barcode } = req.params;

    const product = await prisma.product.findFirst({
      where: {
        businessId,
        isActive: true,
        OR: [
          { barcode: barcode.trim() },
          { sku: barcode.trim() },
        ],
      },
      include: {
        category: true,
      },
    });

    if (!product) {
      res.status(404).json({ success: false, message: 'No product found with this barcode or SKU' });
      return;
    }

    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Barcode scan lookup failed' });
  }
});

// GET /api/products/:id
router.get('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const businessId = req.user!.businessId;
    const product = await prisma.product.findFirst({
      where: { id: req.params.id, businessId },
      include: {
        category: true,
        stockMovements: {
          take: 15,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!product) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }

    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch product details' });
  }
});

// POST /api/products
router.post('/', authenticateToken, requireRoles(['ADMIN', 'MANAGER']), async (req: Request, res: Response): Promise<void> => {
  try {
    const businessId = req.user!.businessId;
    const {
      name,
      sku,
      barcode,
      hsnCode,
      categoryId,
      unit = 'PCS',
      costPrice = 0,
      sellPrice = 0,
      taxRate = 18,
      isTaxInclusive = false,
      currentStock = 0,
      minStockAlert = 5,
      description,
      batchNumber,
    } = req.body;

    if (!name || name.trim() === '') {
      res.status(400).json({ success: false, message: 'Product name is required' });
      return;
    }

    const cleanSku = sku?.trim() || `SKU-${Date.now().toString().slice(-6)}`;
    const cleanBarcode = barcode?.trim() || cleanSku;

    const product = await prisma.product.create({
      data: {
        businessId,
        name: name.trim(),
        sku: cleanSku,
        barcode: cleanBarcode,
        hsnCode: hsnCode?.trim(),
        categoryId: categoryId || null,
        unit,
        costPrice: Number(costPrice) || 0,
        sellPrice: Number(sellPrice) || 0,
        taxRate: Number(taxRate) || 0,
        isTaxInclusive: Boolean(isTaxInclusive),
        currentStock: Number(currentStock) || 0,
        minStockAlert: Number(minStockAlert) || 5,
        description: description?.trim(),
        batchNumber: batchNumber?.trim(),
      },
    });

    // Record initial stock movement if > 0
    if (product.currentStock > 0) {
      await prisma.stockMovement.create({
        data: {
          productId: product.id,
          userId: req.user!.id,
          type: 'PURCHASE',
          quantity: product.currentStock,
          balanceAfter: product.currentStock,
          referenceNo: 'INITIAL-STOCK',
          reason: 'Initial stock on product creation',
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        businessId,
        userId: req.user!.id,
        action: 'CREATE_PRODUCT',
        entity: 'Product',
        entityId: product.id,
        details: `Created product "${product.name}" with stock ${product.currentStock}`,
      },
    });

    res.status(201).json({ success: true, message: 'Product created successfully', data: product });
  } catch (error: any) {
    console.error('Create product error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to create product' });
  }
});

// PUT /api/products/:id
router.put('/:id', authenticateToken, requireRoles(['ADMIN', 'MANAGER']), async (req: Request, res: Response): Promise<void> => {
  try {
    const businessId = req.user!.businessId;
    const { id } = req.params;
    const {
      name,
      sku,
      barcode,
      hsnCode,
      categoryId,
      unit,
      costPrice,
      sellPrice,
      taxRate,
      isTaxInclusive,
      minStockAlert,
      description,
      batchNumber,
      isActive,
    } = req.body;

    const existing = await prisma.product.findFirst({ where: { id, businessId } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        sku: sku !== undefined ? sku.trim() : undefined,
        barcode: barcode !== undefined ? barcode.trim() : undefined,
        hsnCode: hsnCode !== undefined ? hsnCode.trim() : undefined,
        categoryId: categoryId !== undefined ? categoryId : undefined,
        unit: unit !== undefined ? unit : undefined,
        costPrice: costPrice !== undefined ? Number(costPrice) : undefined,
        sellPrice: sellPrice !== undefined ? Number(sellPrice) : undefined,
        taxRate: taxRate !== undefined ? Number(taxRate) : undefined,
        isTaxInclusive: isTaxInclusive !== undefined ? Boolean(isTaxInclusive) : undefined,
        minStockAlert: minStockAlert !== undefined ? Number(minStockAlert) : undefined,
        description: description !== undefined ? description?.trim() : undefined,
        batchNumber: batchNumber !== undefined ? batchNumber?.trim() : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      },
    });

    await prisma.auditLog.create({
      data: {
        businessId,
        userId: req.user!.id,
        action: 'UPDATE_PRODUCT',
        entity: 'Product',
        entityId: updated.id,
        details: `Updated product "${updated.name}"`,
      },
    });

    res.json({ success: true, message: 'Product updated successfully', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update product' });
  }
});

// POST /api/products/:id/adjust-stock
router.post('/:id/adjust-stock', authenticateToken, requireRoles(['ADMIN', 'MANAGER']), async (req: Request, res: Response): Promise<void> => {
  try {
    const businessId = req.user!.businessId;
    const { id } = req.params;
    const { quantityChange, reason = 'Inventory audit / manual adjustment', referenceNo = 'ADJ-MANUAL' } = req.body;

    const change = Number(quantityChange);
    if (isNaN(change) || change === 0) {
      res.status(400).json({ success: false, message: 'Invalid quantity adjustment amount' });
      return;
    }

    const product = await prisma.product.findFirst({ where: { id, businessId } });
    if (!product) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }

    const newStock = product.currentStock + change;
    if (newStock < 0) {
      res.status(400).json({
        success: false,
        message: `Adjustment rejected: Cannot reduce stock below 0 (Current: ${product.currentStock}, change: ${change})`,
      });
      return;
    }

    const [updatedProduct, movement] = await prisma.$transaction([
      prisma.product.update({
        where: { id },
        data: { currentStock: newStock },
      }),
      prisma.stockMovement.create({
        data: {
          productId: id,
          userId: req.user!.id,
          type: 'ADJUSTMENT',
          quantity: change,
          balanceAfter: newStock,
          referenceNo,
          reason,
        },
      }),
      prisma.auditLog.create({
        data: {
          businessId,
          userId: req.user!.id,
          action: 'ADJUST_STOCK',
          entity: 'Product',
          entityId: id,
          details: `Adjusted stock for "${product.name}" by ${change > 0 ? '+' : ''}${change} (New stock: ${newStock}). Reason: ${reason}`,
        },
      }),
    ]);

    res.json({
      success: true,
      message: `Stock adjusted to ${newStock} ${product.unit}`,
      data: updatedProduct,
      movement,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to adjust stock' });
  }
});

// CSV Product Import
router.post('/import-csv', authenticateToken, requireRoles(['ADMIN', 'MANAGER']), async (req: Request, res: Response): Promise<void> => {
  try {
    const businessId = req.user!.businessId;
    const { rows } = req.body; // Array of product objects

    if (!Array.isArray(rows) || rows.length === 0) {
      res.status(400).json({ success: false, message: 'No valid rows provided for import' });
      return;
    }

    let importedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row.name || row.name.trim() === '') {
        errors.push(`Row ${i + 1}: Missing product name`);
        continue;
      }

      try {
        const cleanSku = row.sku?.trim() || `SKU-${Date.now().toString().slice(-6)}-${i}`;
        const prod = await prisma.product.create({
          data: {
            businessId,
            name: row.name.trim(),
            sku: cleanSku,
            barcode: row.barcode?.trim() || cleanSku,
            hsnCode: row.hsnCode?.trim(),
            unit: row.unit || 'PCS',
            costPrice: Number(row.costPrice) || 0,
            sellPrice: Number(row.sellPrice) || 0,
            taxRate: Number(row.taxRate) || 0,
            currentStock: Number(row.currentStock) || 0,
            minStockAlert: Number(row.minStockAlert) || 5,
          },
        });

        if (prod.currentStock > 0) {
          await prisma.stockMovement.create({
            data: {
              productId: prod.id,
              userId: req.user!.id,
              type: 'PURCHASE',
              quantity: prod.currentStock,
              balanceAfter: prod.currentStock,
              referenceNo: 'CSV-IMPORT',
              reason: 'Bulk CSV Import',
            },
          });
        }

        importedCount++;
      } catch (err: any) {
        errors.push(`Row ${i + 1} (${row.name}): ${err.message}`);
      }
    }

    await prisma.auditLog.create({
      data: {
        businessId,
        userId: req.user!.id,
        action: 'IMPORT_PRODUCTS',
        entity: 'Product',
        details: `Imported ${importedCount} products via CSV with ${errors.length} errors`,
      },
    });

    res.json({
      success: true,
      message: `Imported ${importedCount} products successfully`,
      importedCount,
      errors,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to process CSV import' });
  }
});

// GET /api/categories
router.get('/categories/all', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const businessId = req.user!.businessId;
    const categories = await prisma.category.findMany({
      where: { businessId },
      include: {
        _count: { select: { products: true } },
      },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
});

// POST /api/categories
router.post('/categories', authenticateToken, requireRoles(['ADMIN', 'MANAGER']), async (req: Request, res: Response): Promise<void> => {
  try {
    const businessId = req.user!.businessId;
    const { name, description } = req.body;

    if (!name || name.trim() === '') {
      res.status(400).json({ success: false, message: 'Category name is required' });
      return;
    }

    const cat = await prisma.category.create({
      data: {
        businessId,
        name: name.trim(),
        description: description?.trim(),
      },
    });

    res.status(201).json({ success: true, message: 'Category created', data: cat });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create category' });
  }
});

export default router;

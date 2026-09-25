import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed for Egyptian Retail & POS System...");

  // ---------------------------------------------------------------
  // Clean existing data in reverse dependency order
  // ---------------------------------------------------------------
  console.log("🧹 Cleaning existing data...");

  await prisma.couponUsage.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.ticketMessage.deleteMany();
  await prisma.supportTicket.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoiceHold.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.supplierLedger.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.loyaltyTransaction.deleteMany();
  await prisma.loyaltyConfig.deleteMany();
  await prisma.giftCard.deleteMany();
  await prisma.customerLedger.deleteMany();
  await prisma.customerAddress.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.stockAlert.deleteMany();
  await prisma.inventoryMovement.deleteMany();
  await prisma.stockLevel.deleteMany();
  await prisma.productPrice.deleteMany();
  await prisma.priceList.deleteMany();
  await prisma.productCompositeItem.deleteMany();
  await prisma.productVariantOption.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.productUnit.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.webhookEndpoint.deleteMany();
  await prisma.backup.deleteMany();
  await prisma.exchangeRate.deleteMany();
  await prisma.taxConfig.deleteMany();
  await prisma.revenue.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.cashShift.deleteMany();
  await prisma.promotion.deleteMany();
  await prisma.featureFlag.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.subscriptionPlan.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.cashierProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();
  await prisma.superAdmin.deleteMany();
  await prisma.currencyRate.deleteMany();

  console.log("✅ Cleaned existing data.");

  // ---------------------------------------------------------------
  // 1. Create Super Admin
  // ---------------------------------------------------------------
  console.log("👤 Creating Super Admin...");
  const adminPasswordHash = await bcrypt.hash("Admin@123456", 12);
  const superAdmin = await prisma.superAdmin.create({
    data: {
      email: "admin@smartpos.com",
      passwordHash: adminPasswordHash,
      name: "مدير النظام العام (Super Admin)",
      isActive: true,
    },
  });
  console.log(`  ✅ Super Admin created: ${superAdmin.email}`);

  // ---------------------------------------------------------------
  // 2. Create Subscription Plans
  // ---------------------------------------------------------------
  console.log("📦 Creating Subscription Plans...");

  const trialPlan = await prisma.subscriptionPlan.create({
    data: {
      nameAr: "تجريبي مجاني",
      nameEn: "Free Trial",
      descriptionAr: "خطة تجريبية مجانية لمدة 14 يوم",
      descriptionEn: "Free 14-day trial plan",
      maxBranches: 1,
      maxCashiers: 3,
      maxProducts: 500,
      maxInvoicesPerMonth: 1000,
      durationDays: 14,
      price: 0,
      features: JSON.stringify([
        "فرع واحد",
        "3 كاشير",
        "500 منتج",
        "1,000 فاتورة/شهر",
        "نقطة بيع سريعة",
        "عروض أسعار واستفسارات",
        "تقارير أساسية",
      ]),
      interval: "TRIAL",
      isActive: true,
      sortOrder: 0,
    },
  });

  const monthlyPlan = await prisma.subscriptionPlan.create({
    data: {
      nameAr: "الخطة الاحترافية الشهرية",
      nameEn: "Pro Monthly",
      descriptionAr: "خطة شهرية شاملة للمتاجر ونقاط البيع",
      descriptionEn: "Comprehensive monthly plan for Egyptian retail & POS",
      maxBranches: 5,
      maxCashiers: 15,
      maxProducts: 10000,
      maxInvoicesPerMonth: 50000,
      durationDays: 30,
      price: 499,
      features: JSON.stringify([
        "5 فروع",
        "15 كاشير",
        "10,000 منتج",
        "فواتير غير محدودة",
        "إدارة المخزون والمستودعات",
        "عروض الأسعار واستفسارات العملاء",
        "طباعة فواتير بالجنيه المصري",
        "برنامج ولاء ونقاط عملاء",
        "تقارير أرباح ومبيعات فورية",
        "دعم فني سريع",
      ]),
      interval: "MONTHLY",
      isActive: true,
      sortOrder: 1,
    },
  });

  // ---------------------------------------------------------------
  // 3. Create Demo Tenant (Egyptian Retail Store)
  // ---------------------------------------------------------------
  console.log("🏢 Creating Egyptian Demo Tenant...");
  const demoBranchPasswordHash = await bcrypt.hash("Trader@123456", 12);
  const demoTenant = await prisma.tenant.create({
    data: {
      name: "سوبرماركت ومحلات الأمل - مصر",
      subdomain: "demo",
      email: "demo@smartpos.com",
      phone: "01000000000",
      address: "شارع عباس العقاد، مدينة نصر، القاهرة",
      isActive: true,
      maxBranches: 5,
      maxCashiers: 15,
      maxProducts: 10000,
      maxInvoicesPerMonth: 50000,
      branding: JSON.stringify({
        primaryColor: "#1a73e8",
        secondaryColor: "#10b981",
        logoUrl: null,
      }),
      settings: JSON.stringify({
        currency: "EGP",
        currencySymbol: "ج.م",
        language: "ar",
        timezone: "Africa/Cairo",
        dateFormat: "DD/MM/YYYY",
        taxRate: 14,
        lowStockAlert: true,
      }),
    },
  });
  console.log(`  ✅ Demo Tenant created: ${demoTenant.name} (${demoTenant.subdomain})`);

  // ---------------------------------------------------------------
  // 4. Create Demo Subscription
  // ---------------------------------------------------------------
  console.log("💳 Creating Demo Subscription...");
  const subscriptionEndDate = new Date();
  subscriptionEndDate.setDate(subscriptionEndDate.getDate() + 60);
  await prisma.subscription.create({
    data: {
      tenantId: demoTenant.id,
      planId: monthlyPlan.id,
      startDate: new Date(),
      endDate: subscriptionEndDate,
      status: "ACTIVE",
      amount: 499,
      autoRenew: true,
    },
  });

  // ---------------------------------------------------------------
  // 5. Create Demo Trader User & Cashiers
  // ---------------------------------------------------------------
  console.log("👤 Creating Demo Trader User...");
  const demoUser = await prisma.user.create({
    data: {
      tenantId: demoTenant.id,
      email: "trader@demo.com",
      phone: "01012345678",
      passwordHash: demoBranchPasswordHash,
      name: "أحمد محمود (التاجر)",
      role: "TRADER",
      isActive: true,
    },
  });
  console.log(`  ✅ Demo Trader created: ${demoUser.email} / ${demoUser.phone}`);

  // ---------------------------------------------------------------
  // 6. Create Demo Branches (Cairo & Alexandria)
  // ---------------------------------------------------------------
  console.log("🏪 Creating Branches in Egypt...");
  const mainBranch = await prisma.branch.create({
    data: {
      tenantId: demoTenant.id,
      nameAr: "فرع القاهرة - مدينة نصر",
      nameEn: "Cairo - Nasr City Branch",
      code: "CAI-01",
      address: "شارع عباس العقاد، مدينة نصر، القاهرة",
      phone: "01000000001",
      isActive: true,
      isMain: true,
      location: JSON.stringify({
        lat: 30.0561,
        lng: 31.3439,
        city: "Cairo",
      }),
    },
  });

  const secondBranch = await prisma.branch.create({
    data: {
      tenantId: demoTenant.id,
      nameAr: "فرع الإسكندرية - سموحة",
      nameEn: "Alexandria - Smouha Branch",
      code: "ALX-02",
      address: "ميدان فيكتور عمانويل، سموحة، الإسكندرية",
      phone: "01000000002",
      isActive: true,
      isMain: false,
      location: JSON.stringify({
        lat: 31.2156,
        lng: 29.9553,
        city: "Alexandria",
      }),
    },
  });

  // Update demo user with branch assignment
  await prisma.user.update({
    where: { id: demoUser.id },
    data: { branchId: mainBranch.id },
  });

  // ---------------------------------------------------------------
  // 7. Create Warehouses
  // ---------------------------------------------------------------
  console.log("🏭 Creating Warehouses...");
  const mainWarehouse = await prisma.warehouse.create({
    data: {
      tenantId: demoTenant.id,
      branchId: mainBranch.id,
      nameAr: "مستودع القاهرة المركزي",
      nameEn: "Cairo Central Warehouse",
      code: "WH-CAI",
      isActive: true,
      isDefault: true,
    },
  });

  const secondWarehouse = await prisma.warehouse.create({
    data: {
      tenantId: demoTenant.id,
      branchId: secondBranch.id,
      nameAr: "مستودع الإسكندرية",
      nameEn: "Alexandria Warehouse",
      code: "WH-ALX",
      isActive: true,
      isDefault: true,
    },
  });

  // ---------------------------------------------------------------
  // 8. Create Realistic Demo Categories
  // ---------------------------------------------------------------
  console.log("📁 Creating Categories...");
  const categoriesData = [
    { nameAr: "إلكترونيات وهواتف", nameEn: "Electronics & Phones", slug: "electronics", sortOrder: 1 },
    { nameAr: "مشروبات وبن وشاي", nameEn: "Beverages & Coffee", slug: "beverages", sortOrder: 2 },
    { nameAr: "بقالة ومواد غذائية", nameEn: "Groceries & Food", slug: "groceries", sortOrder: 3 },
    { nameAr: "ألبان وأجبان", nameEn: "Dairy & Cheese", slug: "dairy", sortOrder: 4 },
    { nameAr: "منظفات وعناية", nameEn: "Cleaning & Care", slug: "cleaning", sortOrder: 5 },
  ];

  const categories: Record<string, string> = {};
  for (const cat of categoriesData) {
    const category = await prisma.category.create({
      data: {
        tenantId: demoTenant.id,
        nameAr: cat.nameAr,
        nameEn: cat.nameEn,
        slug: cat.slug,
        sortOrder: cat.sortOrder,
        isActive: true,
      },
    });
    categories[cat.slug] = category.id;
    console.log(`  ✅ Category created: ${category.nameAr}`);
  }

  // ---------------------------------------------------------------
  // 9. Create Realistic Egyptian Products (Real items & EGP prices)
  // ---------------------------------------------------------------
  console.log("📦 Creating Realistic Egyptian Products...");
  const productsData = [
    // Electronics
    {
      nameAr: "شاومي ريدمي نوت 13 (8GB / 256GB)",
      nameEn: "Xiaomi Redmi Note 13 (8GB/256GB)",
      sku: "ELEC-001",
      barcode: "6221000000001",
      categorySlug: "electronics",
      costPrice: 7800.0,
      sellingPrice: 8500.0,
      unit: "PIECE",
      descriptionAr: "شاشة AMOLED 120Hz، كاميرا 108MP، شحن سريع 33W",
      descriptionEn: "AMOLED 120Hz screen, 108MP Camera, 33W fast charge",
    },
    {
      nameAr: "سماعة أنكر ساوندكور P20i لاسلكية",
      nameEn: "Anker Soundcore P20i Earbuds",
      sku: "ELEC-002",
      barcode: "6221000000002",
      categorySlug: "electronics",
      costPrice: 750.0,
      sellingPrice: 950.0,
      unit: "PIECE",
      descriptionAr: "بطارية تدوم حتى 30 ساعة، صوت قوي مع باس عميق",
      descriptionEn: "30-hour battery, powerful sound with deep bass",
    },
    {
      nameAr: "باور بانك جوي روم 20000 مللي أمبير 22.5W",
      nameEn: "Joyroom Power Bank 20000mAh 22.5W",
      sku: "ELEC-003",
      barcode: "6221000000003",
      categorySlug: "electronics",
      costPrice: 950.0,
      sellingPrice: 1200.0,
      unit: "PIECE",
      descriptionAr: "شحن سريع متعدد المنافذ ويدعم PD و QC",
      descriptionEn: "Fast charging multi-port supporting PD & QC",
    },
    {
      nameAr: "كابل شحن تايب سي أنكر مضفر 0.9 متر",
      nameEn: "Anker Braided Type-C Cable 0.9m",
      sku: "ELEC-004",
      barcode: "6221000000004",
      categorySlug: "electronics",
      costPrice: 180.0,
      sellingPrice: 250.0,
      unit: "PIECE",
      descriptionAr: "كابل مضفر فائق المتانة يدعم الشحن السريع",
      descriptionEn: "Ultra-durable braided cable fast charge",
    },

    // Groceries
    {
      nameAr: "أرز مصري فاخر الضحى 1 كجم",
      nameEn: "ElDoha Egyptian Rice 1kg",
      sku: "GROC-001",
      barcode: "6221000000005",
      categorySlug: "groceries",
      costPrice: 31.0,
      sellingPrice: 38.0,
      unit: "PACK",
      descriptionAr: "أرز مصري حبة رفيعة منقى ومغسول آلياً",
      descriptionEn: "Premium sorted Egyptian rice 1kg",
    },
    {
      nameAr: "مكرونة الملكة 400 جم (أنواع متعددة)",
      nameEn: "ElMaleka Pasta 400g",
      sku: "GROC-002",
      barcode: "6221000000006",
      categorySlug: "groceries",
      costPrice: 11.5,
      sellingPrice: 14.0,
      unit: "PIECE",
      descriptionAr: "مكرونة الملكة المصنوعة من دقيق السيمولينا الفاخر",
      descriptionEn: "ElMaleka premium semolina pasta 400g",
    },
    {
      nameAr: "زيت عباد الشمس عافية 1.6 لتر",
      nameEn: "Afia Sunflower Oil 1.6L",
      sku: "GROC-003",
      barcode: "6221000000007",
      categorySlug: "groceries",
      costPrice: 115.0,
      sellingPrice: 135.0,
      unit: "BOTTLE",
      descriptionAr: "زيت عباد شمس نقي خالي من الكوليسترول",
      descriptionEn: "Pure sunflower cooking oil 1.6L",
    },
    {
      nameAr: "سمن بلدي طبيعي شيراتون 800 جم",
      nameEn: "Sheraton Pure Ghee 800g",
      sku: "GROC-004",
      barcode: "6221000000008",
      categorySlug: "groceries",
      costPrice: 280.0,
      sellingPrice: 320.0,
      unit: "CAN",
      descriptionAr: "سمن بقري طبيعي 100% عالي الجودة",
      descriptionEn: "100% pure butter ghee 800g",
    },

    // Beverages & Coffee
    {
      nameAr: "شاي العروسة ناعم 250 جم",
      nameEn: "ElArosa Black Tea 250g",
      sku: "BEV-001",
      barcode: "6221000000009",
      categorySlug: "beverages",
      costPrice: 46.0,
      sellingPrice: 55.0,
      unit: "PACK",
      descriptionAr: "شاي أسود كيني فاخر نقي",
      descriptionEn: "Premium Kenyan black tea 250g",
    },
    {
      nameAr: "بن عبد المعبود محوج وسط 200 جم",
      nameEn: "Abdel Maaboud Turkish Coffee Spiced 200g",
      sku: "BEV-002",
      barcode: "6221000000010",
      categorySlug: "beverages",
      costPrice: 90.0,
      sellingPrice: 110.0,
      unit: "PACK",
      descriptionAr: "بن تركي محوج بالحبهان طازج ومطحون بعناية",
      descriptionEn: "Cardamom spiced Turkish ground coffee 200g",
    },
    {
      nameAr: "نسكافيه جولد برطمان 100 جم",
      nameEn: "Nescafe Gold Jar 100g",
      sku: "BEV-003",
      barcode: "6221000000011",
      categorySlug: "beverages",
      costPrice: 165.0,
      sellingPrice: 195.0,
      unit: "JAR",
      descriptionAr: "قهوة سريعة الذوبان غنية بنكهة أرابيكا وروبوستا",
      descriptionEn: "Rich instant coffee with Arabica & Robusta",
    },
    {
      nameAr: "مياه معدنية نستله 1.5 لتر",
      nameEn: "Nestle Pure Life Water 1.5L",
      sku: "BEV-004",
      barcode: "6221000000012",
      categorySlug: "beverages",
      costPrice: 7.5,
      sellingPrice: 10.0,
      unit: "BOTTLE",
      descriptionAr: "مياه شرب نقية معززة بالمعادن",
      descriptionEn: "Pure life mineral water 1.5L",
    },

    // Dairy & Cheese
    {
      nameAr: "لبن جهينة كامل الدسم 1 لتر",
      nameEn: "Juhayna Full Cream Milk 1L",
      sku: "DRY-001",
      barcode: "6221000000013",
      categorySlug: "dairy",
      costPrice: 38.0,
      sellingPrice: 44.0,
      unit: "PACK",
      descriptionAr: "حليب بقري طبيعي 100% معقم",
      descriptionEn: "100% pure cow milk full cream 1L",
    },
    {
      nameAr: "جبنة دومتي بلس فيتا 500 جم",
      nameEn: "Domty Plus Feta Cheese 500g",
      sku: "DRY-002",
      barcode: "6221000000014",
      categorySlug: "dairy",
      costPrice: 30.0,
      sellingPrice: 36.0,
      unit: "PACK",
      descriptionAr: "جبنة بيضاء فيتا كريمية بزيت نباتي",
      descriptionEn: "Creamy white feta cheese 500g",
    },
    {
      nameAr: "زبادي جهينة طبيعي 105 جم",
      nameEn: "Juhayna Plain Yogurt 105g",
      sku: "DRY-003",
      barcode: "6221000000015",
      categorySlug: "dairy",
      costPrice: 7.0,
      sellingPrice: 9.0,
      unit: "CUP",
      descriptionAr: "زبادي طازج متماسك وطبيعي",
      descriptionEn: "Fresh natural plain yogurt 105g",
    },
    {
      nameAr: "شيبسي عائلي بالفلفل والليمون 100 جم",
      nameEn: "Chipsy Chili & Lemon Family Pack",
      sku: "SNK-001",
      barcode: "6221000000016",
      categorySlug: "groceries",
      costPrice: 12.0,
      sellingPrice: 15.0,
      unit: "PACK",
      descriptionAr: "رقائق البطاطس المقرمشة بنكهة الفلفل الحلو والليمون",
      descriptionEn: "Crispy potato chips chili & lemon flavor",
    },

    // Cleaning & Household
    {
      nameAr: "مسحوق غسيل أوتوماتيك أريال لافندر 2.5 كجم",
      nameEn: "Ariel Automatic Powder Lavender 2.5kg",
      sku: "CLN-001",
      barcode: "6221000000017",
      categorySlug: "cleaning",
      costPrice: 185.0,
      sellingPrice: 220.0,
      unit: "BAG",
      descriptionAr: "مسحوق غسيل للغسالات الأوتوماتيكية بقوة تنظيف عميقة",
      descriptionEn: "Automatic laundry detergent powder 2.5kg",
    },
    {
      nameAr: "سائل غسيل الأطباق فيري ليمون 650 مل",
      nameEn: "Fairy Lemon Dishwashing Liquid 650ml",
      sku: "CLN-002",
      barcode: "6221000000018",
      categorySlug: "cleaning",
      costPrice: 40.0,
      sellingPrice: 48.0,
      unit: "BOTTLE",
      descriptionAr: "قوة إذابة الدهون الفائقة برائحة الليمون المنعش",
      descriptionEn: "Ultra grease cutting dishwashing liquid 650ml",
    },
    {
      nameAr: "مناديل ورقية زينة كلاسيك عبوة 3 علب (550 منديل)",
      nameEn: "Zeina Classic Facial Tissues 3-Pack",
      sku: "CLN-003",
      barcode: "6221000000019",
      categorySlug: "cleaning",
      costPrice: 52.0,
      sellingPrice: 65.0,
      unit: "PACK",
      descriptionAr: "مناديل ورقية ناعمة 3 طبقات عالية الامتصاص",
      descriptionEn: "Soft 3-ply facial tissues 3-pack",
    },
  ];

  const products: Array<{ id: string; sku: string; nameAr: string }> = [];
  for (const prod of productsData) {
    const product = await prisma.product.create({
      data: {
        tenantId: demoTenant.id,
        categoryId: categories[prod.categorySlug],
        nameAr: prod.nameAr,
        nameEn: prod.nameEn,
        descriptionAr: prod.descriptionAr,
        descriptionEn: prod.descriptionEn,
        sku: prod.sku,
        barcode: prod.barcode,
        costPrice: prod.costPrice,
        sellingPrice: prod.sellingPrice,
        unit: prod.unit,
        hasExpiry: prod.categorySlug === "dairy",
        expiryDays: prod.categorySlug === "dairy" ? 14 : null,
        isActive: true,
        lowStockAlert: 10,
      },
    });
    products.push({ id: product.id, sku: product.sku, nameAr: product.nameAr });
    console.log(`  ✅ Product: ${product.nameAr} (${product.sellingPrice} ج.م)`);
  }

  // ---------------------------------------------------------------
  // 10. Create Demo Egyptian Customers
  // ---------------------------------------------------------------
  console.log("👥 Creating Egyptian Demo Customers...");
  const customersData = [
    { name: "أحمد محمود عبد الله", phone: "01012345678", email: "ahmed.mahmoud@gmail.com", tier: "GOLD" },
    { name: "محمد علي إبراهيم", phone: "01123456789", email: "mohamed.ali@gmail.com", tier: "SILVER" },
    { name: "سارة طارق حسن", phone: "01234567890", email: "sara.tariq@gmail.com", tier: "REGULAR" },
    { name: "يوسف خالد المنشاوي", phone: "01551234567", email: "yousef.khaled@gmail.com", tier: "PLATINUM" },
    { name: "فاطمة سعيد الشريف", phone: "01098765432", email: "fatma.saeed@gmail.com", tier: "REGULAR" },
  ];

  const customers: Array<{ id: string; name: string }> = [];
  for (const cust of customersData) {
    const customer = await prisma.customer.create({
      data: {
        tenantId: demoTenant.id,
        name: cust.name,
        phone: cust.phone,
        email: cust.email,
        tier: cust.tier,
        balance: 0,
        creditLimit: cust.tier === "PLATINUM" ? 10000 : cust.tier === "GOLD" ? 5000 : cust.tier === "SILVER" ? 2000 : 0,
        loyaltyPoints: 120,
        totalSpent: 1500,
        totalOrders: 3,
        isActive: true,
      },
    });
    customers.push({ id: customer.id, name: customer.name });
    console.log(`  ✅ Customer: ${customer.name} - ${cust.phone}`);
  }

  // ---------------------------------------------------------------
  // 11. Create Demo Suppliers
  // ---------------------------------------------------------------
  console.log("🚚 Creating Suppliers...");
  const supplier1 = await prisma.supplier.create({
    data: {
      tenantId: demoTenant.id,
      name: "شركة جهينة للصناعات الغذائية",
      phone: "0238270000",
      email: "orders@juhayna.com",
      contactPerson: "مهندس سامح عثمان",
      address: "مدينة السادس من أكتوبر، الجيزة",
      balance: 0,
      paymentTerms: "آجل 30 يوم",
      notes: "المورد الرئيسي لمنتجات الألبان والعصائر",
      isActive: true,
    },
  });

  const supplier2 = await prisma.supplier.create({
    data: {
      tenantId: demoTenant.id,
      name: "مجموعة الضحى للأغذية",
      phone: "0224150000",
      email: "sales@eldoha.com",
      contactPerson: "أستاذ كريم مصطفى",
      address: "المنطقة الصناعية، العبور، القاهرة",
      balance: 0,
      paymentTerms: "آجل 15 يوم",
      notes: "مورد الأرز والبقوليات الفاخرة",
      isActive: true,
    },
  });

  // ---------------------------------------------------------------
  // 12. Create Stock Levels
  // ---------------------------------------------------------------
  console.log("📊 Creating Stock Levels...");
  for (const product of products) {
    await prisma.stockLevel.create({
      data: {
        tenantId: demoTenant.id,
        warehouseId: mainWarehouse.id,
        productId: product.id,
        quantity: 150,
        minQuantity: 15,
        maxQuantity: 500,
        lastCountedAt: new Date(),
      },
    });
    await prisma.stockLevel.create({
      data: {
        tenantId: demoTenant.id,
        warehouseId: secondWarehouse.id,
        productId: product.id,
        quantity: 80,
        minQuantity: 10,
        maxQuantity: 300,
        lastCountedAt: new Date(),
      },
    });
  }

  console.log("");
  console.log("🎉 Seed completed successfully for Egypt POS!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📧 مدير عام (Super Admin): admin@smartpos.com / Admin@123456");
  console.log("📱 حساب التاجر (Demo Trader): 01012345678 أو trader@demo.com / Trader@123456");
  console.log("🏢 المتجر: سوبرماركت ومحلات الأمل - مصر (القاهرة)");
  console.log("💵 العملة الافتراضية: الجنيه المصري (EGP - ج.م)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });

export { main as seed };
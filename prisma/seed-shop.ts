// seed.ts

import { PrismaClient } from "../src/generated/prisma/client";
import { faker } from "@faker-js/faker";

// 初始化 Prisma Client
const prisma = new PrismaClient();

// 設定要生成的產品總數
const PRODUCT_COUNT = 200;

/**
 * 1. 建立一個函式來生成單一產品主表資料
 */
function createProductData() {
  const productName = faker.commerce.productName();
  return {
    productName: productName,
    // 使用 productName 作為關鍵字和描述的基礎
    keyword: productName.split(" ").join(","),
    description: faker.commerce.productDescription(),
  };
}

/**
 * 2. 建立一個函式來生成產品細項 (ProductVariant) 資料
 * @param productId - 產品主表的 ID
 */
function createVariantData(productId: number) {
  return {
    productId: productId,
    variantName: faker.commerce.productMaterial(),
    // 價格和庫存使用範圍隨機數
    price: faker.number.int({ min: 100, max: 5000 }),
    stock: faker.number.int({ min: 10, max: 200 }),
  };
}

/**
 * 3. 建立一個函式來生成產品圖片 (ProductPic) 資料
 * @param productId - 產品主表的 ID
 */
function createPicData(productId: number) {
  return {
    productId: productId,
    // 產生一個假的圖片 URL
    src: faker.image.url({ width: 640, height: 480 }),
  };
}

/**
 * 執行資料庫填充的主函式
 */
async function main() {
  console.log("🚀 開始資料庫填充...");

  // --- 步驟 1: 清空現有資料 (可選，但在測試環境中很有用) ---
  // 注意：由於您的模型之間有關聯性，您需要從「子表」開始刪除，
  // 才能刪除「父表」
  try {
    await prisma.productPic.deleteMany();
    await prisma.productVariant.deleteMany();
    await prisma.product.deleteMany();
    console.log("🗑️ 成功清空 ProductPic, ProductVariant 和 Product 資料。");
  } catch (e) {
    console.warn("⚠️ 清空資料失敗，可能是資料庫是空的。繼續執行...");
  }

  // --- 步驟 2: 產生並插入產品主表資料 ---
  const productsToCreate = Array.from(
    { length: PRODUCT_COUNT },
    createProductData
  );

  // 使用 createMany 批量插入主表資料
  // 缺點是 createMany 不會返回所有 auto-increment ID，我們需要分批插入來取得 ID

  const productIds: number[] = [];

  for (const productData of productsToCreate) {
    const newProduct = await prisma.product.create({
      data: productData,
    });
    productIds.push(newProduct.id);
  }

  console.log(`✨ 成功創建 ${productIds.length} 個產品主表記錄。`);

  // --- 步驟 3: 產生並插入關聯的細項和圖片資料 ---
  const allVariantsData = [];
  const allPicsData = [];

  productIds.forEach((productId) => {
    // 每個產品隨機產生 1 到 4 個產品細項
    const variantCount = faker.number.int({ min: 1, max: 4 });
    for (let i = 0; i < variantCount; i++) {
      allVariantsData.push(createVariantData(productId));
    }

    // 每個產品隨機產生 2 到 5 張圖片
    const picCount = faker.number.int({ min: 2, max: 5 });
    for (let i = 0; i < picCount; i++) {
      allPicsData.push(createPicData(productId));
    }
  });

  // 使用 createMany 批量插入關聯資料
  const variantsResult = await prisma.productVariant.createMany({
    data: allVariantsData,
  });

  const picsResult = await prisma.productPic.createMany({
    data: allPicsData,
  });

  console.log(`📦 成功插入 ${variantsResult.count} 個產品細項。`);
  console.log(`🖼️ 成功插入 ${picsResult.count} 個產品圖片。`);
}

// 執行主函式並處理錯誤
main()
  .catch((e) => {
    console.error("致命錯誤，填充程序終止:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log("✅ 資料庫填充完成並斷開連線。");
  });

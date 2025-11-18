// seed.ts

import { PrismaClient } from "../src/generated/prisma/client";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient();
const NUM_PRODUCTS = 200; // 實體產品數量 (例如 15 筆)
const NUM_TICKETS = 40; // 門票產品數量 (例如 5 筆)

// --- 實體產品設定 ---
const BRANDS = [
  "Nike",
  "Adidas",
  "Sony",
  "Apple",
  "小米",
  "無印良品",
  "Logitech",
  "Dyson",
  "Samsung",
];
const ITEM_NAMES = [
  "運動鞋",
  "T-shirt",
  "耳機",
  "手錶",
  "背包",
  "保溫杯",
  "行動電源",
];
const MATERIALS = [
  "純棉",
  "羊毛",
  "聚酯纖維",
  "皮革",
  "塑料",
  "鋁合金",
  "不鏽鋼",
  "矽膠",
];
const COLORS = [
  "經典黑",
  "雪亮白",
  "海軍藍",
  "櫻花粉",
  "軍綠",
  "曜石灰",
  "檸檬黃",
  "酒紅",
];

// 關鍵字分類映射 (用於 keyword 欄位)
const CATEGORY_MAP = {
  // 3C/科技產品
  耳機: "3C",
  手錶: "3C",
  鍵盤: "3C",
  電源: "3C",
  吸塵器: "家電",

  // 衣物/穿戴
  運動鞋: "鞋類",
  T恤: "衣物",
  背包: "周邊",

  // 生活周邊
  保溫杯: "周邊",
};

// --- 虛擬門票設定 ---
const PARK_NAMES = ["海生館", "義大世界", "九族文化村", "迪士尼", "劍湖山"];
const TICKET_TYPES = ["一般票", "星光票"];
const TICKET_VARIANTS = ["單人票", "雙人票", "家庭套票"];

async function main() {
  console.log(`開始 Seeding 假資料...`);

  // 1. 清空舊資料
  await prisma.orderDetail.deleteMany(); // 如果您有 OrderDetail 模型的話
  await prisma.cart.deleteMany(); // 如果您有 Cart 模型的話
  console.log("已清空 OrderDetail 和 Cart 資料，解除 ProductVariant 約束。");

  // 接著才能刪除 ProductVariant (被 OrderDetail/Cart 引用)
  await prisma.productVariant.deleteMany();
  console.log("已清空 ProductVariant 資料。");

  // 接著才能刪除 ProductPic (被 Product 引用)
  await prisma.productPic.deleteMany();
  console.log("已清空 ProductPic 資料。");

  // 最後刪除 Product (所有東西的根源)
  await prisma.product.deleteMany();
  console.log("已清空 Product 資料。");

  // 重新整理後的日誌輸出
  console.log("所有現有產品相關資料已安全清空。");

  // --- 區塊一：生成實體產品 (品牌 + 物品名 + 材質/顏色規格) ---
  console.log(`\n--- 1. 開始生成 ${NUM_PRODUCTS} 筆實體產品 ---`);
  for (let i = 0; i < NUM_PRODUCTS; i++) {
    // 產品名稱：品牌 + 物品名
    const brand = faker.helpers.arrayElement(BRANDS);
    const itemName = faker.helpers.arrayElement(ITEM_NAMES);
    const productName = `${brand} - ${itemName}`;

    // 關鍵字生成邏輯
    let keyword = "雜貨";
    for (const [key, value] of Object.entries(CATEGORY_MAP)) {
      // key 是 '耳機', value 是 '3C,科技,音頻'
      if (itemName.includes(key)) {
        keyword = value; // 直接賦予對應的值
        break;
      }
    }

    const sentenceCount = faker.number.int({ min: 1, max: 3 });
    const rawDescription = faker.lorem.sentences(sentenceCount);

    // 2. 將描述用 <p> 標籤包裹
    let description = `<p>${rawDescription.trim()}</p>`;

    // 3. (關鍵步驟) 確保總長度不超過 191，若超長則截斷
    if (description.length > 191) {
      // 截斷到 187 字元，為 </p> 標籤預留空間
      description = description.substring(0, 187) + "</p>";
    }

    // 創建 Product
    const product = await prisma.product.create({
      data: {
        productName: productName,
        keyword: keyword,
        description: description,
      },
    });

    console.log(`\t✅ 創建產品: ${productName} (ID: ${product.id})`);

    // --- 實體產品規格生成 (材質/顏色) ---
    const variantCount = faker.number.int({ min: 2, max: 4 });
    const variantsToCreate = [];

    // 使用 MATERIALS 和 COLORS 進行變量組合
    const selectedMaterials = faker.helpers.arrayElements(MATERIALS, {
      min: 1,
      max: 2,
    });
    const selectedColors = faker.helpers.arrayElements(COLORS, {
      min: 1,
      max: 2,
    });

    for (const material of selectedMaterials) {
      for (const color of selectedColors) {
        if (variantsToCreate.length >= variantCount) break;

        variantsToCreate.push({
          productId: product.id,
          variantName: `${material} / ${color}`, // 規格名稱：材質 / 顏色
          // 價格為 100 的倍數
          price: faker.number.int({ min: 1, max: 99 }) * 100,
          stock: faker.number.int({ min: 0, max: 500 }),
        });
      }
      if (variantsToCreate.length >= variantCount) break;
    }

    await prisma.productVariant.createMany({ data: variantsToCreate });
    console.log(`\t\t📦 創建規格數量: ${variantsToCreate.length}`);

    // --- 實體產品圖片生成 ---
    const picCount = faker.number.int({ min: 1, max: 3 });
    const picsToCreate = [];
    const imageKeywordString = itemName.split(/\s+|-/)[0].trim().toLowerCase();

    for (let j = 0; j < picCount; j++) {
      picsToCreate.push({
        productId: product.id,
        // 使用 category 參數，傳入單一字串
        src: faker.image.urlLoremFlickr({
          width: 640,
          height: 480,
          category: imageKeywordString,
        }),
      });
    }

    await prisma.productPic.createMany({ data: picsToCreate });
    console.log(`\t\t🖼️ 創建圖片數量: ${picsToCreate.length}`);
  }

  // --- 區塊二：生成虛擬門票產品 (遊樂園 + 票種 + 票數規格) ---
  console.log(`\n--- 2. 開始生成 ${NUM_TICKETS} 筆門票產品 ---`);
  for (let i = 0; i < NUM_TICKETS; i++) {
    const parkName = faker.helpers.arrayElement(PARK_NAMES);
    const ticketType = faker.helpers.arrayElement(TICKET_TYPES);
    const productName = `${parkName} - ${ticketType}`; // 產品名稱：遊樂園名稱 - 票種

    // 門票專屬關鍵字
    const keyword = "門票";

    const sentenceCount = faker.number.int({ min: 1, max: 3 });
    const rawDescription = faker.lorem.sentences(sentenceCount);

    // 2. 將描述用 <p> 標籤包裹
    let description = `<p>${rawDescription.trim()}</p>`;

    // 3. (關鍵步驟) 確保總長度不超過 191，若超長則截斷
    if (description.length > 191) {
      // 截斷到 187 字元，為 </p> 標籤預留空間
      description = description.substring(0, 187) + "</p>";
    }

    // 創建 Product
    const product = await prisma.product.create({
      data: {
        productName: productName,
        keyword: keyword,
        description: description,
      },
    });

    console.log(`\t🎟️ 創建門票: ${productName} (ID: ${product.id})`);

    // --- 門票規格生成 (單人/雙人/家庭套票) ---
    const variantsToCreate = [];

    // 定義票價基礎
    let basePrice = 0;
    const STEP = 100; // 我們希望價格是 100 的倍數

    if (ticketType === "一般票") {
      // 範圍 800 - 1500 (即 8 * 100 到 15 * 100)
      basePrice = faker.number.int({ min: 8, max: 15 }) * STEP;
    } else {
      // 範圍 500 - 1000 (即 5 * 100 到 10 * 100)
      basePrice = faker.number.int({ min: 5, max: 10 }) * STEP;
    }

    for (const variantName of TICKET_VARIANTS) {
      let variantPrice = basePrice;

      // 根據票種調整價格
      if (variantName === "雙人票") {
        // 雙人票稍有折扣 (基礎價格 * 1.9)
        variantPrice = Math.round((basePrice * 1.9) / 100) * 100;
      } else if (variantName === "家庭套票") {
        // 家庭套票 (基礎價格 * 3.5)
        variantPrice = Math.round((basePrice * 3.5) / 100) * 100;
      }

      variantsToCreate.push({
        productId: product.id,
        variantName: variantName, // 規格名稱：單人票/雙人票/家庭套票
        price: variantPrice,
        stock: faker.number.int({ min: 1000, max: 5000 }), // 票券庫存較多
      });
    }

    await prisma.productVariant.createMany({ data: variantsToCreate });
    console.log(`\t\t📦 創建規格數量: ${variantsToCreate.length}`);

    // --- 門票圖片生成 (使用 park 關鍵字) ---
    const picsToCreate = [];
    const parkKeyword = parkName.split("樂園")[0].trim().toLowerCase(); // 提取樂園名稱作為關鍵字

    for (let j = 0; j < 1; j++) {
      // 門票通常只有一張圖
      picsToCreate.push({
        productId: product.id,
        src: faker.image.urlLoremFlickr({
          width: 640,
          height: 480,
          category: parkKeyword, // 使用遊樂園名稱作為關鍵字
        }),
      });
    }

    await prisma.productPic.createMany({ data: picsToCreate });
    console.log(`\t\t🖼️ 創建圖片數量: ${picsToCreate.length}`);
  }

  console.log(
    `\n🎉 資料庫 Seed 完成! 總共創建了 ${NUM_PRODUCTS + NUM_TICKETS} 筆產品。`
  );
}

// 運行 main 函數並處理錯誤
main()
  .catch(async (e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect(); // 使用 $disconnect
  });

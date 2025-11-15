import { PrismaClient, Prisma } from "../src/generated/prisma/client";
import { faker } from "@faker-js/faker/locale/zh_TW"; // 導入 faker 並設置為中文地區
import { readFileSync } from "fs";
import * as path from "path";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

// 設置 bcrypt 的 salt rounds
const BCRYPT_SALT_ROUNDS = 10;

// 匯入所需的 Prisma 型別
type CityCreateInput = Prisma.CityCreateInput;
type AccommodationTypeCreateInput = Prisma.AccommodationTypeCreateInput;
type AmenityCreateInput = Prisma.AmenityCreateInput;
type UserCreateInput = Prisma.UserCreateInput;
type AccommodationCreateInput = Prisma.AccommodationCreateInput;
type RoomRateCreateManyInput = Prisma.RoomRateCreateManyInput;
type RoomInventoryCreateManyInput = Prisma.RoomInventoryCreateManyInput;

// 基礎資料路徑
const CITIES_JSON_PATH = path.join(process.cwd(), "seeds", "cities.json");
const ACCOMMODATION_TYPES_JSON_PATH = path.join(
  process.cwd(),
  "seeds",
  "accommodation_types.json"
);
const AMENITIES_JSON_PATH = path.join(process.cwd(), "seeds", "amenities.json");
const USERS_JSON_PATH = path.join(process.cwd(), "seeds", "users.json");

// 數據量配置
const USER_COUNT_FAKER = 100; // 額外生成的 Faker 用戶數量
const ACCOMMODATION_COUNT = 200;
const ROOM_TYPE_PER_ACCOMMODATION = 5;
// 定義目標時間窗的邊界 (來自原 Seeding 配置 [5])
// 統一頂層常數 (字串形式保留，如果需要計算 DAYS_IN_WINDOW)
const WINDOW_START_DATE_STR = "2025-10-01T00:00:00.000Z";
const WINDOW_END_DATE_STR = "2026-01-01T00:00:00.000Z";

// 統一頂層 Date 物件
const WINDOW_START_DATE_OBJ = new Date(WINDOW_START_DATE_STR);
const WINDOW_END_DATE_OBJ = new Date(WINDOW_END_DATE_STR);

// DAYS_IN_WINDOW 計算也要使用 _STR 或 _OBJ
const DAYS_IN_WINDOW =
  (WINDOW_END_DATE_OBJ.getTime() - WINDOW_START_DATE_OBJ.getTime()) /
  (1000 * 60 * 60 * 24);

const BOOKINGS_PER_DAY = 50; // 每天基準訂單數量
const NUM_BOOKINGS = BOOKINGS_PER_DAY * DAYS_IN_WINDOW;
// 價格規則: 平日 10% 折扣
const WEEKDAY_DISCOUNT_FACTOR = 0.9;

/** 判斷是否為平日 (週一到週五)  */
function isWeekday(date: Date): boolean {
  const dayOfWeek = date.getUTCDay(); // 0 = Sunday, 6 = Saturday
  // 1 (Monday) to 5 (Friday)
  return dayOfWeek >= 1 && dayOfWeek <= 5;
}

// 儲存已建立資料的 ID 列表，用於建立關聯
let cities: { id: number; name: string }[] = [];
let cityIds: number[] = [];
let typeIds: number[] = [];
let roomAmenityIds: number[] = [];
let publicAmenityIds: number[] = [];
let userIds: number[] = [];
let accommodationIds: number[] = [];
let roomTypeIds: number[] = [];

function toCamelCase(str: string): string {
  if (!str) return "";
  return str.charAt(0).toLowerCase() + str.slice(1);
}

/** 台灣主要縣市大致經緯度範圍 (手工定義 Bounding Box) */
const TAIWAN_CITY_BBOX: {
  [key: string]: {
    lat: { min: number; max: number };
    lng: { min: number; max: number };
  };
} = {
  台北市: { lat: { min: 24.9, max: 25.3 }, lng: { min: 121.4, max: 121.6 } },
  新北市: { lat: { min: 24.7, max: 25.3 }, lng: { min: 121.3, max: 122.0 } },
  桃園市: { lat: { min: 24.8, max: 25.1 }, lng: { min: 121.0, max: 121.5 } },
  台中市: { lat: { min: 24.0, max: 24.4 }, lng: { min: 120.5, max: 121.0 } },
  台南市: { lat: { min: 22.9, max: 23.3 }, lng: { min: 120.1, max: 120.4 } },
  高雄市: { lat: { min: 22.5, max: 23.0 }, lng: { min: 120.2, max: 120.7 } },
  基隆市: { lat: { min: 25.1, max: 25.2 }, lng: { min: 121.7, max: 121.8 } },
  新竹市: { lat: { min: 24.7, max: 24.9 }, lng: { min: 120.9, max: 121.0 } },
  新竹縣: { lat: { min: 24.5, max: 24.8 }, lng: { min: 120.9, max: 121.4 } },
  苗栗縣: { lat: { min: 24.2, max: 24.7 }, lng: { min: 120.6, max: 121.2 } },
  彰化縣: { lat: { min: 23.8, max: 24.1 }, lng: { min: 120.3, max: 120.6 } },
  南投縣: { lat: { min: 23.7, max: 24.2 }, lng: { min: 120.7, max: 121.3 } },
  雲林縣: { lat: { min: 23.5, max: 23.8 }, lng: { min: 120.2, max: 120.6 } },
  嘉義縣: { lat: { min: 23.3, max: 23.7 }, lng: { min: 120.2, max: 120.8 } },
  嘉義市: { lat: { min: 23.45, max: 23.5 }, lng: { min: 120.4, max: 120.5 } },
  屏東縣: { lat: { min: 21.9, max: 23.0 }, lng: { min: 120.3, max: 120.8 } },
  宜蘭縣: { lat: { min: 24.2, max: 24.8 }, lng: { min: 121.5, max: 122.0 } },
  花蓮縣: { lat: { min: 23.3, max: 24.3 }, lng: { min: 121.0, max: 121.6 } },
  台東縣: { lat: { min: 22.5, max: 23.5 }, lng: { min: 120.8, max: 121.5 } },
  澎湖縣: { lat: { min: 23.2, max: 23.7 }, lng: { min: 119.5, max: 120.0 } },
  金門縣: { lat: { min: 24.4, max: 24.55 }, lng: { min: 118.25, max: 118.5 } },
  連江縣: { lat: { min: 26.0, max: 26.3 }, lng: { min: 119.9, max: 120.15 } },

  DEFAULT: { lat: { min: 21.8, max: 26.3 }, lng: { min: 118.0, max: 122.0 } },
};

const accommodationSuffixMap = {
  飯店: { baseNames: ["晶英", "喜來登", "萬豪", "君悅"], suffix: "飯店" },
  旅社: { baseNames: ["站前", "商務", "星光", "城市"], suffix: "旅店" },
  客棧: { baseNames: ["百年", "舊城", "時光", "古早"], suffix: "客棧" },
  民宿: { baseNames: ["山嵐", "星空", "海景", "童話"], suffix: "民宿" },
  青年旅館: {
    baseNames: ["背包客", "旅行者", "窩居", "簡單"],
    suffix: "青年旅舍",
  },
  度假村: { baseNames: ["遠雄", "日光", "涵碧", "森林"], suffix: "度假村" },
  露營地: { baseNames: ["秘境", "星光", "山谷", "溪畔"], suffix: "露營區" },
  公寓式酒店: {
    baseNames: ["行旅", "美寓", "寓所", "精品"],
    suffix: "公寓酒店",
  },
  "小木屋/別墅": {
    baseNames: ["木屋", "森林", "秘境", "星辰"],
    suffix: "小木屋",
  },
  膠囊旅館: {
    baseNames: ["太空艙", "未來", "城市", "極簡"],
    suffix: "膠囊旅館",
  },
  汽車旅館: { baseNames: ["薇閣", "歐悅", "戀愛", "皇家"], suffix: "精品旅館" }, // 使用更通用的名稱
  "農場/莊園住宿": {
    baseNames: ["牧場", "茶園", "薰衣草", "風情"],
    suffix: "莊園",
  },
  "船屋/遊艇": { baseNames: ["水上", "豪華", "海之", "泊岸"], suffix: "船屋" },
  奢華帳篷: { baseNames: ["奢華", "頂級", "精緻", "高級"], suffix: "帳篷營地" },
};

function generateRandomImagePath(
  pathPrefix: string,
  minRange: number,
  maxRange: number,
  paddingLength = 4
) {
  // 1. 隨機生成一個介於 minRange 到 maxRange 之間的整數
  const min = Math.ceil(minRange); // 確保是整數
  const max = Math.floor(maxRange); // 確保是整數

  // 隨機數生成公式
  const randomNumber = Math.floor(Math.random() * (max - min + 1)) + min;

  // 2. 將數字格式化並補零
  const paddedNumber = String(randomNumber).padStart(paddingLength, "0");

  // 3. 組合相對路徑
  // 假設所有檔案都是 .jpg 格式
  const relativePath = `${pathPrefix}.${paddedNumber}.jpg`;

  return relativePath;
}

async function loadAndCategorizeAmenities() {
  const allAmenities = await prisma.amenity.findMany({
    select: { id: true, type: true },
  });

  publicAmenityIds = allAmenities
    .filter((a) => a.type !== "客房設施")
    .map((a) => a.id);

  roomAmenityIds = allAmenities
    .filter((a) => a.type === "客房設施")
    .map((a) => a.id);

  if (publicAmenityIds.length === 0 || roomAmenityIds.length === 0) {
    console.warn("⚠️ 設施分類資料不足，請檢查 Amenity 靜態資料。");
  } else {
    console.log(
      `設施分類完成：公共 ${publicAmenityIds.length} 個，客房 ${roomAmenityIds.length} 個。`
    );
  }
}

// -----------------------------------------------------------
// Ⅰ. 基礎靜態資料 Seeding (JSON 匯入 - 已修正 TypeScript 錯誤)
// -----------------------------------------------------------

/**
 * 處理靜態 JSON 資料匯入的通用函數。
 * @param modelName 模型的名稱 (例如 'City', 'Amenity')
 * @param jsonPath JSON 檔案路徑
 * @param deleteFunc 模型的 deleteMany 函數
 * @param saveIdsTo 將 ID 列表存入的函數
 */
async function seedStaticData(
  modelName: string,
  jsonPath: string,
  saveIdsTo: (ids: number[]) => void,
  selectField: string
) {
  console.log(`--- 正在填充 ${modelName} (JSON) ---`);

  let data: any[];
  try {
    const fileContent = readFileSync(jsonPath, "utf-8");
    data = JSON.parse(fileContent);
  } catch (error) {
    console.error(
      `❌ 無法讀取或解析 ${modelName} JSON 檔案: ${jsonPath}`,
      error
    );
    process.exit(1);
  }

  // 🌟 修正點：將 prisma 斷言為 any，以允許動態索引
  const prismaAny = prisma as any;
  const modelKey = toCamelCase(modelName);

  // 1. 使用 createMany 批量匯入靜態資料
  await prismaAny[modelKey].createMany({ data, skipDuplicates: true });

  // 2. 獲取所有 ID
  const savedItems = await prismaAny[modelKey].findMany({
    select: { id: true },
  });
  const ids = savedItems.map((i: { id: number }) => i.id); // 確保映射為 number
  saveIdsTo(ids);
  console.log(`✅ ${ids.length} 筆 ${modelName} 資料填充完成。`);
}

/** 封裝靜態資料 Seeding 的主函數 */
async function seedAllStaticData() {
  console.log(`--- 正在填充 City (JSON) ---`);
  // await prisma.city.deleteMany();

  let cityData: any[];
  try {
    const fileContent = readFileSync(CITIES_JSON_PATH, "utf-8");
    cityData = JSON.parse(fileContent);
  } catch (error) {
    console.error(
      `❌ 無法讀取或解析 City JSON 檔案: ${CITIES_JSON_PATH}`,
      error
    );
    process.exit(1);
  }

  await prisma.city.createMany({ data: cityData, skipDuplicates: true });

  // 獲取所有 City 的 ID 和 NAME
  const savedCities = await prisma.city.findMany({
    select: { id: true, name: true },
  });
  cities = savedCities as { id: number; name: string }[];
  cityIds = cities.map((c) => c.id);
  console.log(`✅ ${cityIds.length} 筆 City 資料填充完成。`);

  await seedStaticData(
    "AccommodationType",
    ACCOMMODATION_TYPES_JSON_PATH,
    (ids) => (typeIds = ids),
    "name"
  );

  await seedStaticData("Amenity", AMENITIES_JSON_PATH, () => {}, "name");
}

// -----------------------------------------------------------
// Ⅱ. 核心用戶與住宿 Seeding (混合/Faker)
// -----------------------------------------------------------

/** 4. 填充 User (JSON 靜態 + Faker 動態) */
async function seedUsers() {
  await prisma.user.deleteMany();

  // 1. 讀取並匯入固定的測試/管理員帳號 (JSON)
  const staticUsersContent = readFileSync(USERS_JSON_PATH, "utf-8");
  const usersFromStatic = JSON.parse(staticUsersContent) as UserCreateInput[];

  // 🌟 修正點 1: 處理靜態用戶的密碼雜湊
  const usersWithHashedPasswords: UserCreateInput[] = [];
  for (const user of usersFromStatic) {
    if (user.password) {
      const hashedPassword = await bcrypt.hash(
        user.password as string,
        BCRYPT_SALT_ROUNDS
      );
      usersWithHashedPasswords.push({ ...user, password: hashedPassword });
    } else {
      usersWithHashedPasswords.push(user); // 如果沒有密碼（不應發生），則直接推送
    }
  }

  await prisma.user.createMany({ data: usersWithHashedPasswords });
  console.log(
    `✅ ${usersWithHashedPasswords.length} 筆固定用戶 (JSON/已雜湊) 填充完成。`
  );

  // 2. 使用 Faker 產生大量隨機用戶
  const usersFromFaker: UserCreateInput[] = [];
  const defaultPassword = "fakerpassword";
  const defaultHashedPassword = await bcrypt.hash(
    defaultPassword,
    BCRYPT_SALT_ROUNDS
  ); // 🌟 修正點 2: 雜湊 Faker 用戶的預設密碼

  for (let i = 0; i < USER_COUNT_FAKER; i++) {
    usersFromFaker.push({
      email: faker.internet.email().toLowerCase(),
      password: defaultHashedPassword, // 使用雜湊後的預設密碼
      fullName: faker.person.fullName(),
      nickname: faker.internet.username(),
      description: faker.lorem.sentences(2),
      point: faker.number.int({ min: 100, max: 5000 }),
      safety: faker.helpers.arrayElement([0, 0, 0, 1]),
      avatar: generateRandomImagePath("avatar", 1, 100),
    });
  }

  await prisma.user.createMany({ data: usersFromFaker });
  console.log(
    `✅ ${usersFromFaker.length} 筆隨機用戶 (Faker/已雜湊) 填充完成。`
  );

  // 3. 獲取所有用戶 ID
  const savedUsers = await prisma.user.findMany({ select: { id: true } });
  userIds = savedUsers.map((u) => u.id);
  console.log(`👥 總用戶數：${userIds.length}`);
}

/** 5. 填充 Accommodation (住宿) */
async function seedAccommodations() {
  if (cityIds.length === 0 || typeIds.length === 0) return;

  await prisma.accommodation.deleteMany();

  // 1. 取得所有 AccommodationType 的名稱，用於隨機選擇
  // 由於 typeIds 只有 ID，我們需要取得完整的類型物件，以便知道它的 'name'
  const allAccommodationTypes = await prisma.accommodationType.findMany();
  if (allAccommodationTypes.length === 0) {
    console.warn("⚠️ 住宿類型資料缺失，跳過 Accommodation 填充。");
    return;
  }

  for (let i = 0; i < ACCOMMODATION_COUNT; i++) {
    // A. 隨機選定類型 (先選定類型，因為名稱依賴於類型)
    const randomType = faker.helpers.arrayElement(allAccommodationTypes);
    const typeId = randomType.id;

    // B. 提取中文主名稱 (例如: "飯店 (Hotel)" -> "飯店")
    const chineseTypeName = randomType.name.split(" ")[0];

    // C. 根據類型取得命名風格
    const namingConfig =
      accommodationSuffixMap[
        chineseTypeName as keyof typeof accommodationSuffixMap
      ];

    let accommodationName: string;
    if (namingConfig) {
      // 使用定製化的名稱邏輯
      const baseName = faker.helpers.arrayElement(namingConfig.baseNames);
      accommodationName = `${baseName}${namingConfig.suffix}`;
    } else {
      // Fallback: 如果沒有設定，使用預設的 Faker 邏輯
      const genericBaseName = faker.company.name();
      accommodationName = `${genericBaseName}會館`;
      console.warn(`⚠️ 類型 ${chineseTypeName} 缺乏命名配置，使用預設名稱。`);
    }

    // D. 處理地理位置和地址
    const randomCity = faker.helpers.arrayElement(cities);
    const cityBBox =
      TAIWAN_CITY_BBOX[randomCity.name] || TAIWAN_CITY_BBOX["DEFAULT"];

    const lat = faker.location.latitude({
      min: cityBBox.lat.min,
      max: cityBBox.lat.max,
      precision: 6,
    });
    const lng = faker.location.longitude({
      min: cityBBox.lng.min,
      max: cityBBox.lng.max,
      precision: 6,
    });

    const streetAddress = faker.location.streetAddress({
      useFullAddress: false,
    });

    // 1. 生成三個不同長度的中文詞組
    const sentence1 = faker.word.words({ count: { min: 8, max: 12 } }); // 描述地點和氛圍
    const sentence2 = faker.word.words({ count: { min: 15, max: 25 } }); // 描述特色和服務
    const sentence3 = faker.word.words({ count: { min: 5, max: 8 } }); // 總結或行動呼籲
    const sentence4 = faker.lorem.sentence({ min: 8, max: 12 });

    // 2. 組合句子並加入標點符號，使其看起來像簡介 (約 60-100 字)
    const description = `
      ${accommodationName} 坐落於美麗的 ${randomCity.name}，環境優雅，是您放鬆身心的理想選擇。
      我們提供 ${sentence1} 等多元服務，讓每位旅客都能享有賓至如歸的體驗。
      無論是商務差旅或休閒度假，都歡迎您來感受 ${sentence2} 的極致享受。${sentence3}。
      ${sentence4}。
    `
      .replace(/\s+/g, " ") // 移除多餘空格和換行
      .trim();

    // E. 建立資料
    const data: AccommodationCreateInput = {
      name: accommodationName, // <-- **使用新的、依賴類型的名稱**
      address: `${randomCity.name}${streetAddress}`,
      description: description,
      latitude: lat,
      longitude: lng,
      checkInTime: "15:00",
      checkOutTime: "11:00",
      City: { connect: { id: randomCity.id } },
      accommodationType: {
        // **使用我們選好的 Type ID**
        connect: { id: typeId },
      },
    };

    const accommodation = await prisma.accommodation.create({ data });
    accommodationIds.push(accommodation.id);
  }

  console.log(`✅ ${accommodationIds.length} 筆 Accommodation 資料填充完成。`);
}

// -----------------------------------------------------------
// Ⅲ. 關聯細節 Seeding
// -----------------------------------------------------------

/** 6. 填充 Accommodation 關聯資料 (Contact, Image, Amenity) */
async function seedAccommodationDetails() {
  if (accommodationIds.length === 0) return;

  await prisma.contact.deleteMany();
  await prisma.accommodationImage.deleteMany();
  await prisma.accommodationAmenity.deleteMany();

  for (const accId of accommodationIds) {
    // Contact (電話、Email)
    await prisma.contact.createMany({
      data: [
        // 1. Phone (已修正為 replaceSymbols)
        {
          accommodationId: accId,
          type: "Phone",
          value: faker.helpers.replaceSymbols("0#-####-####"),
        },
        // 2. Email
        {
          accommodationId: accId,
          type: "Email",
          value: faker.internet.email(),
        },
        // 3. Website 🌟 新增
        {
          accommodationId: accId,
          type: "Website",
          value: faker.internet.url(),
        },
        // 4. Line ID 🌟 新增
        {
          accommodationId: accId,
          type: "Line",
          value: `@${faker.string.alphanumeric({
            length: 8,
            casing: "lower",
          })}`,
        },
        // 5. Facebook 🌟 新增
        {
          accommodationId: accId,
          type: "Facebook",
          value: `https://www.facebook.com/${faker.internet.username()}`,
        },
      ],
    });

    // Images
    const imageLinks = [];
    // 1. 決定隨機的張數 (例如隨機 1 到 12 張)
    const numImagesToGenerate = Math.floor(Math.random() * (12 - 1 + 1)) + 1;

    // 2. 使用隨機張數來控制迴圈
    for (let i = 0; i < numImagesToGenerate; i++) {
      // 這裡會是 1 到 12
      imageLinks.push({
        accommodationId: accId,
        url: generateRandomImagePath("accommodations/acc", 1, 1000),
        caption: `照片 ${i + 1}`,
        isPrimary: i === 0,
      });
    }
    await prisma.accommodationImage.createMany({ data: imageLinks });

    // Amenities (隨機 8-12 個設施)
    const randomAmenities = faker.helpers.arrayElements(publicAmenityIds, {
      min: 8,
      max: 12,
    });
    const amenityLinks = randomAmenities.map((amenityId) => ({
      accommodationId: accId,
      amenityId: amenityId,
    }));
    await prisma.accommodationAmenity.createMany({ data: amenityLinks });
  }

  console.log("✅ Accommodation 關聯細節填充完成。");
}

/** 7. 填充 RoomType 和 RoomTypeAmenity */
async function seedRoomTypesAndAmenities() {
  await prisma.roomType.deleteMany();
  await prisma.roomTypeAmenity.deleteMany();
  roomTypeIds = []; // 確保重置 ID 列表

  // 🌟 房型配置陣列，定義了邏輯上的床型、容量和價格基礎
  const ROOM_CONFIGS = [
    {
      name: "標準單人房",
      capacity: 1,
      bedType: "單人床",
      minPrice: 1500,
      maxPrice: 3000,
      descriptionTemplate: [
        "簡約舒適的個人空間。",
        "適合獨自旅行的旅客。",
        "設有單人床，麻雀雖小，五臟俱全。",
      ],
    },
    {
      name: "豪華雙人房",
      capacity: 2,
      bedType: "大床 (Queen/King)",
      minPrice: 3000,
      maxPrice: 6000,
      descriptionTemplate: [
        "寬敞豪華的大床房，提供舒適睡眠。",
        "適合情侶或商務人士入住。",
        "設有落地窗，可欣賞城市美景。",
      ],
    },
    {
      name: "行政套房",
      capacity: 2,
      bedType: "特大床 (King)",
      minPrice: 7000,
      maxPrice: 15000,
      descriptionTemplate: [
        "頂級的行政套房，配備獨立客廳。",
        "享受專屬尊榮服務，體驗奢華住宿。",
        "提供豪華衛浴設施，讓您徹底放鬆。",
      ],
    },
    {
      name: "景觀雙床房",
      capacity: 2,
      bedType: "兩張單人床",
      minPrice: 4000,
      maxPrice: 8000,
      descriptionTemplate: [
        "設有兩張舒適單人床，並享有絕佳景觀。",
        "適合朋友結伴或有分床需求的旅客。",
        "房間採光良好，空間設計時尚簡潔。",
      ],
    },
    {
      name: "四人家庭套房",
      capacity: 4,
      bedType: "兩張雙人床",
      minPrice: 6000,
      maxPrice: 12000,
      descriptionTemplate: [
        "寬敞舒適的家庭套房，提供四人入住。",
        "最適合親子出遊或四人小團體。",
        "配備大型電視和充足的活動空間。",
      ],
    },
    {
      name: "日式榻榻米房",
      capacity: 3,
      bedType: "日式床墊 (Futon)",
      minPrice: 4500,
      maxPrice: 9000,
      descriptionTemplate: [
        "體驗道地的日式風情，感受寧靜。",
        "適合喜歡簡約風格和地板空間的旅客。",
        "晚上可鋪設三張日式床墊，感受在地文化。",
      ],
    },
    // --- 新增房型 ---
    {
      name: "背包客床位",
      capacity: 1,
      bedType: "單人上下舖",
      minPrice: 500,
      maxPrice: 1200,
      descriptionTemplate: [
        "經濟實惠的單人床位，適合預算有限的旅人。",
        "共用衛浴和公共空間，結識世界各地的朋友。",
        "每個床位皆有獨立閱讀燈與插座。",
      ],
    },
    {
      name: "豪華雙床房",
      capacity: 2,
      bedType: "兩張加大單人床",
      minPrice: 5500,
      maxPrice: 11000,
      descriptionTemplate: [
        "升級版的雙床配置，提供更寬敞的睡眠區域。",
        "適合重視個人空間的高級商務人士。",
        "配備高品質寢具，確保一夜好眠。",
      ],
    },
    {
      name: "主題親子房",
      capacity: 4,
      bedType: "一張雙人床與一張上下舖",
      minPrice: 8000,
      maxPrice: 14000,
      descriptionTemplate: [
        "充滿童趣的主題設計，讓孩子們驚喜連連。",
        "設有遊戲區和兒童專屬備品，享受歡樂時光。",
        "一家四口同住，創造美好的家庭回憶。",
      ],
    },
    {
      name: "總統套房",
      capacity: 4,
      bedType: "兩張特大床 (King)",
      minPrice: 25000,
      maxPrice: 60000,
      descriptionTemplate: [
        "極致奢華的住宿體驗，擁有私人管家服務。",
        "寬闊的空間，包含獨立餐廳與會議區。",
        "俯瞰城市天際線的絕美景觀。",
      ],
    },
    {
      name: "小型公寓房",
      capacity: 2,
      bedType: "大床 (Queen)",
      minPrice: 4500,
      maxPrice: 7500,
      descriptionTemplate: [
        "配備簡易廚房和餐具，適合長期住宿。",
        "體驗像家一樣的溫馨舒適。",
        "設有洗衣機，解決長途旅行的洗衣需求。",
      ],
    },
    {
      name: "私人溫泉房",
      capacity: 2,
      bedType: "大床 (Queen)",
      minPrice: 9000,
      maxPrice: 18000,
      descriptionTemplate: [
        "在房內即可享受天然溫泉浴，徹底放鬆身心。",
        "私人溫泉池位於獨立陽台，保有絕對隱私。",
        "享受日式禪意的氛圍與服務。",
      ],
    },
    {
      name: "典雅三人房",
      capacity: 3,
      bedType: "一張雙人床與一張單人床",
      minPrice: 5000,
      maxPrice: 9500,
      descriptionTemplate: [
        "專為三人團體設計，兼具獨立與共享空間。",
        "適合小家庭或三位好友共同入住。",
        "房間佈局優雅，提供充足的休息空間。",
      ],
    },
    {
      name: "湖景木屋別墅",
      capacity: 6,
      bedType: "三張雙人床",
      minPrice: 15000,
      maxPrice: 35000,
      descriptionTemplate: [
        "獨立的兩層樓木屋別墅，坐擁絕美湖景。",
        "設有獨立客廳、餐廳和戶外燒烤區。",
        "最適合多家庭或大型團體入住，體驗戶外奢華。",
      ],
    },
    {
      name: "寵物友善雙人房",
      capacity: 2,
      bedType: "大床 (Queen)",
      minPrice: 3500,
      maxPrice: 7000,
      descriptionTemplate: [
        "專為攜帶寵物的旅客設計，備有寵物專屬備品。",
        "房間地點鄰近戶外活動區，方便帶寵物散步。",
        "入住前請詳閱寵物住宿相關規定。",
      ],
    },
  ];

  for (const accId of accommodationIds) {
    for (let i = 0; i < ROOM_TYPE_PER_ACCOMMODATION; i++) {
      // 🌟 修正點 1: 隨機選取一個結構化的房型配置
      const config = faker.helpers.arrayElement(ROOM_CONFIGS);

      // 🌟 修正點 2: 根據配置產生價格 (價格範圍更合理)
      const basePrice = faker.number.float({
        min: config.minPrice,
        max: config.maxPrice,
        fractionDigits: 0,
      });

      // 🌟 修正點 3: 根據配置產生更相關的描述
      const description = faker.helpers.arrayElement(
        config.descriptionTemplate
      );

      const roomType = await prisma.roomType.create({
        data: {
          accommodationId: accId,
          name: config.name,
          description: description, // 使用相關描述

          basePrice: basePrice, // 使用合理價格
          maxCapacity: config.capacity, // 使用配置的容量
          totalRooms: faker.number.int({ min: 5, max: 20 }),
          bedType: config.bedType, // 使用配置的床型
        },
      });
      roomTypeIds.push(roomType.id);

      // 建立 RoomType Amenities (隨機 1-3 個設施)
      const randomAmenities = faker.helpers.arrayElements(roomAmenityIds, {
        min: 3,
        max: 6,
      });
      const amenityLinks = randomAmenities.map((amenityId) => ({
        roomTypeId: roomType.id,
        amenityId: amenityId,
      }));
      await prisma.roomTypeAmenity.createMany({ data: amenityLinks });
    }
  }
  console.log(`✅ ${roomTypeIds.length} 筆 RoomType 和其關聯設施填充完成。`);
}

// -----------------------------------------------------------
// Ⅳ. 交易資料 Seeding
// -----------------------------------------------------------

/** 8. 填充 Booking 和 Review (新版：支援多房型、動態價格與庫存檢查) */
async function seedBookingsAndReviews() {
  if (userIds.length === 0 || accommodationIds.length === 0) return;

  // 清除舊資料
  await prisma.review.deleteMany();
  await prisma.bookingItem.deleteMany();
  await prisma.booking.deleteMany();

  // 🌟 新增：計算 Check-in 的最大隨機日期 (WINDOW_END_DATE_OBJ 的前一天)
  // 這樣能確保 checkInDate 之後一定還有空間給 checkOutDate
  const checkInMaxDate = new Date(WINDOW_END_DATE_OBJ);
  checkInMaxDate.setDate(checkInMaxDate.getDate() - 1);

  // 如果時間窗只有一天或更短，則無法產生訂單，直接返回
  if (checkInMaxDate < WINDOW_START_DATE_OBJ) {
    console.warn("⚠️ 時間窗過短 (少於兩天)，無法生成訂單。");
    return;
  }

  for (let i = 0; i < NUM_BOOKINGS; i++) {
    const randomAccommodationId = faker.helpers.arrayElement(accommodationIds);
    const randomUserId = faker.helpers.arrayElement(userIds);

    // 1. 取得該住宿下的所有房型 ID [4]
    const allRoomTypesForAcc = await prisma.roomType.findMany({
      where: { accommodationId: randomAccommodationId },
      select: { id: true, basePrice: true },
    });
    const availableRoomTypeIds = allRoomTypesForAcc.map((rt) => rt.id);

    if (availableRoomTypeIds.length === 0) continue;

    // 2. 隨機選定 1 到 3 種不同的房型 [5, 6]
    const selectedRoomTypeIds = faker.helpers.arrayElements(
      availableRoomTypeIds,
      {
        min: 1,
        max: 3,
      }
    );

    // ----------------------------------------------------
    // 3. 確定入住/退房日期 (修正錯誤邏輯)

    const checkInDate = faker.date.between({
      from: WINDOW_START_DATE_OBJ,
      to: checkInMaxDate, // 🌟 使用修正後的上限
    });

    // 創建次日作為退房日期的隨機起始點
    const checkInDatePlusOne = new Date(checkInDate);
    checkInDatePlusOne.setDate(checkInDatePlusOne.getDate() + 1);

    // 這裡 now checkInDatePlusOne 必然早於或等於 WINDOW_END_DATE_OBJ
    let checkOutDate = faker.date.between({
      from: checkInDatePlusOne,
      to: WINDOW_END_DATE_OBJ,
    });
    // ----------------------------------------------------

    // 這裡的邏輯已經得到保證，但保留計算天數
    const stayDurationDays = Math.ceil(
      (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    // 由於生成邏輯已優化，此判斷幾乎不會觸發，但作為安全檢查保留
    if (stayDurationDays <= 0) continue;

    let totalBookingAmount = 0;
    const bookingItemsToCreate = [];
    const inventoryUpdates = [];
    let bookingIsFeasible = true;

    // 4. 遍歷所有選定的房型，進行檢查、價格彙總與準備庫存削減
    for (const roomTypeId of selectedRoomTypeIds) {
      const itemQuantity = faker.number.int({ min: 1, max: 2 }); // 該房型預訂的間數

      // 查詢 RoomRate 和 RoomInventory [9, 10]
      const [rates, inventories] = await Promise.all([
        prisma.roomRate.findMany({
          where: {
            roomTypeId: roomTypeId,
            date: { gte: checkInDate, lt: checkOutDate },
          },
          select: { date: true, dailyPrice: true },
        }),
        prisma.roomInventory.findMany({
          where: {
            roomTypeId: roomTypeId,
            date: { gte: checkInDate, lt: checkOutDate },
          },
          select: { date: true, availableCount: true },
        }),
      ]);

      // 確保數據完整 [10]
      if (
        rates.length !== stayDurationDays ||
        inventories.length !== stayDurationDays
      ) {
        bookingIsFeasible = false;
        break;
      }

      let itemTotalPrice = 0;
      let currentItemIsAvailable = true;

      // 檢查庫存和累計價格
      for (const rate of rates) {
        const inventory = inventories.find(
          (inv) => inv.date.getTime() === rate.date.getTime()
        );

        // 檢查庫存是否足夠 (availableCount < quantity) [11]
        if (!inventory || inventory.availableCount < itemQuantity) {
          currentItemIsAvailable = false;
          bookingIsFeasible = false;
          break;
        }

        itemTotalPrice += parseFloat(rate.dailyPrice.toString()) * itemQuantity;

        // 儲存庫存更新資訊 (如果交易成功將用於削減)
        inventoryUpdates.push({
          roomTypeId: roomTypeId,
          date: inventory.date,
          availableCountBefore: inventory.availableCount,
          quantityToBook: itemQuantity,
        });
      }

      if (!currentItemIsAvailable) break;

      // 準備 BookingItem 數據
      const itemUnitPrice = itemTotalPrice / (itemQuantity * stayDurationDays);
      totalBookingAmount += itemTotalPrice;

      bookingItemsToCreate.push({
        roomTypeId: roomTypeId,
        quantity: itemQuantity,
        unitPrice: new Prisma.Decimal(itemUnitPrice),
      });
    }

    if (!bookingIsFeasible || bookingItemsToCreate.length === 0) continue; // 任何一個房型不合格，則跳過

    // 5. 削減庫存 (通過檢查，執行更新)
    const status = faker.helpers.arrayElement([
      "Confirmed",
      "Completed",
      "Cancelled",
    ]);

    if (status !== "Cancelled") {
      const updatePromises = inventoryUpdates.map((update) =>
        prisma.roomInventory.update({
          where: {
            roomTypeId_date: {
              roomTypeId: update.roomTypeId,
              date: update.date,
            },
          },
          data: {
            availableCount: update.availableCountBefore - update.quantityToBook,
          },
        })
      );
      await Promise.all(updatePromises);
    }

    // 6. 建立 Booking 和 BookingItem (批量創建)
    const booking = await prisma.booking.create({
      data: {
        userId: randomUserId,
        accommodationId: randomAccommodationId,
        checkInDate: checkInDate,
        checkOutDate: checkOutDate,
        totalAmount: new Prisma.Decimal(totalBookingAmount), // 總金額
        status: status,
        guestName: faker.person.fullName(),
        guestContact: faker.helpers.replaceSymbols("0#-####-####"),
        Items: {
          create: bookingItemsToCreate, // 創建多個 BookingItem
        },
      },
    });

    // 7. 隨機建立 Review [13, 14]
    if (booking.status === "Completed" && faker.datatype.boolean(0.8)) {
      await prisma.review.create({
        data: {
          accommodationId: booking.accommodationId,
          userId: randomUserId,
          bookingId: booking.id, // bookingId 欄位設定為 @unique [15]
          ratingScore: faker.number.int({ min: 1, max: 5 }),
          comment: faker.lorem.sentences(3),
        },
      });
    }
  }
  console.log(
    `✅ ${NUM_BOOKINGS} 筆 Booking (已支援多房型、動態定價並削減庫存) 和相關 Review 資料填充完成。`
  );
}

/** 9. 填充 FavoriteAccommodation */
export async function seedFavorites() {
  console.log("--- 正在填充 FavoriteAccommodation (隨機收藏) ---");

  // 取得所有使用者與住宿 ID
  const users = await prisma.user.findMany({ select: { id: true } });
  const accommodations = await prisma.accommodation.findMany({
    select: { id: true },
  });

  const favorites: { userId: number; accommodationId: number }[] = [];

  for (const accommodation of accommodations) {
    const maxFavorites = Math.floor(Math.random() * 20) + 1; // 每筆住宿最多被 1~5 人收藏
    const sampledUsers = getRandomSubset(users, maxFavorites);

    for (const user of sampledUsers) {
      favorites.push({
        userId: user.id,
        accommodationId: accommodation.id,
      });
    }
  }

  // 批量插入收藏資料
  await prisma.favoriteAccommodation.createMany({
    data: favorites,
    skipDuplicates: true, // 避免重複 user-accommodation 組合
  });

  console.log(
    `✅ 已建立 ${favorites.length} 筆 FavoriteAccommodation 收藏資料`
  );
}

/** 10. 填充 RoomRate (每日價格) 和 RoomInventory (每日庫存) */
async function seedRoomRatesAndInventory() {
  console.log("--- 正在填充 RoomRate 和 RoomInventory (M3動態擴展) ---");

  await prisma.roomRate.deleteMany();
  await prisma.roomInventory.deleteMany();

  // 1. 取得所有 RoomType 資料
  const allRoomTypes = await prisma.roomType.findMany({
    select: {
      id: true,
      basePrice: true,
      totalRooms: true,
    },
  });

  // 2. 獲取並聚合所有 Booking Item 數據，以便削減庫存 (包含 booking status 判斷)
  const allBookingItems = await prisma.bookingItem.findMany({
    include: {
      Booking: {
        select: {
          checkInDate: true,
          checkOutDate: true,
          status: true,
        },
      },
    },
  });

  const bookedQuantities = new Map<string, number>();

  for (const item of allBookingItems) {
    // 僅計算 Confirmed 或 Completed 的訂單 [4]
    if (
      item.Booking.status === "Confirmed" ||
      item.Booking.status === "Completed"
    ) {
      const checkIn = new Date(item.Booking.checkInDate);
      const checkOut = new Date(item.Booking.checkOutDate);

      const dayIterator = new Date(checkIn);

      while (dayIterator < checkOut) {
        // 將日期標準化為午夜 UTC，作為 Map Key
        const dateKey = dayIterator.toISOString().split("T");
        const mapKey = `${item.roomTypeId}-${dateKey}`;

        // 累計當天該房型被預訂的數量
        const currentQuantity = bookedQuantities.get(mapKey) || 0;
        bookedQuantities.set(mapKey, currentQuantity + item.quantity);

        // 推進到下一天
        dayIterator.setDate(dayIterator.getDate() + 1);
      }
    }
  }

  const roomRatesData: RoomRateCreateManyInput[] = [];
  const roomInventoryData: RoomInventoryCreateManyInput[] = [];

  // 3. 遍歷時間窗，填充每日價格和庫存
  for (const roomType of allRoomTypes) {
    const currentDay = new Date(WINDOW_START_DATE_OBJ);

    while (currentDay < WINDOW_END_DATE_OBJ) {
      const dateKey = new Date(currentDay);
      dateKey.setUTCHours(0, 0, 0, 0);

      // --- 價格計算 (RoomRate) ---
      const basePrice = parseFloat(roomType.basePrice.toString());
      [4];
      let dailyPrice = basePrice;

      if (isWeekday(currentDay)) {
        // 平日折扣 10%
        dailyPrice = dailyPrice * WEEKDAY_DISCOUNT_FACTOR;
      }

      roomRatesData.push({
        roomTypeId: roomType.id,
        date: dateKey,
        dailyPrice: dailyPrice,
      });

      // --- 庫存計算 (RoomInventory) ---
      const totalRooms = roomType.totalRooms;
      [5];
      const dailyMapKey = `${roomType.id}-${dateKey.toISOString().split("T")}`;

      // 獲取該天該房型被訂走的數量
      const bookedCount = bookedQuantities.get(dailyMapKey) || 0;

      // 可用庫存 = 總庫存 - 已訂數量
      const availableCount = Math.max(0, totalRooms - bookedCount);

      roomInventoryData.push({
        roomTypeId: roomType.id,
        date: dateKey,
        totalCount: totalRooms,
        availableCount: availableCount,
      });

      // 推進到下一天
      currentDay.setDate(currentDay.getDate() + 1);
    }
  }

  // 4. 批量插入資料
  await prisma.roomRate.createMany({
    data: roomRatesData,
    skipDuplicates: true,
  });
  await prisma.roomInventory.createMany({
    data: roomInventoryData,
    skipDuplicates: true,
  });

  console.log(
    `✅ RoomRate: 已填充 ${roomRatesData.length} 筆每日價格數據 (平日 10% 折扣)。`
  );
  console.log(
    `✅ RoomInventory: 已填充 ${roomInventoryData.length} 筆每日庫存數據。`
  );
}

// 工具函式：隨機抽取陣列中的 N 筆資料
function getRandomSubset<T>(array: T[], count: number): T[] {
  return [...array].sort(() => 0.5 - Math.random()).slice(0, count);
}

// -----------------------------------------------------------
// Ⅵ. 資料庫清除函數 (按外鍵順序)
// -----------------------------------------------------------

/**
 * ⚠️ 清除所有資料庫表格中的資料。
 * 必須嚴格按照 外鍵依賴的反向順序 進行刪除 (從子到父)。
 */
async function clearDatabase() {
  console.log("🔥 開始清除所有現有資料 (按外鍵依賴順序)...");

  // 1. 交易/關聯層 (引用 Booking, RoomType, User, Accommodation)
  await prisma.review.deleteMany(); // 引用 Booking, User, Accommodation
  await prisma.bookingItem.deleteMany(); // 引用 Booking, RoomType

  await prisma.roomRate.deleteMany();
  await prisma.roomInventory.deleteMany();

  await prisma.booking.deleteMany(); // 引用 User, Accommodation
  await prisma.roomTypeAmenity.deleteMany(); // 引用 RoomType, Amenity
  await prisma.favoriteAccommodation.deleteMany(); // 引用 User, Accommodation

  // 2. 住宿細節層 (引用 Accommodation)
  await prisma.contact.deleteMany();
  await prisma.accommodationImage.deleteMany();
  await prisma.accommodationAmenity.deleteMany(); // 引用 Amenity (但 Amenity 沒有引用其他表格)

  // 3. 主要實體層
  await prisma.roomType.deleteMany(); // 引用 Accommodation
  await prisma.accommodation.deleteMany(); // 引用 City, AccommodationType

  // 4. 核心/基礎層 (不被其他表格引用)
  await prisma.user.deleteMany();
  await prisma.amenity.deleteMany();
  await prisma.accommodationType.deleteMany();
  await prisma.city.deleteMany();

  console.log("✅ 所有資料表清除完成。");
}

// -----------------------------------------------------------
// Ⅴ. 主執行函數
// -----------------------------------------------------------

async function main() {
  console.log("🚀 開始執行完整的 Seeding 流程 (JSON 靜態 + Faker 動態)...");

  // 清空
  await clearDatabase();

  // 步驟 Ⅰ: 基礎靜態資料 (JSON 匯入)
  await seedAllStaticData();

  await loadAndCategorizeAmenities();

  // 步驟 Ⅱ: 核心用戶與住宿 (混合模式)
  await seedUsers();
  await seedAccommodations();

  // 步驟 Ⅲ: 住宿相關細節 (Faker 關聯)
  await seedAccommodationDetails();
  await seedRoomTypesAndAmenities();

  // 🌟 M3 模組擴展 (動態價格/庫存：必須在 Booking 之前執行)
  await seedRoomRatesAndInventory();

  // 步驟 Ⅳ: 交易資料 (Faker 交易)
  // ⚠️ 註：這裡僅示範核心 Booking/Review，其他模型如 RoomRate/Inventory, Favorite/Like 需自行擴展
  await seedBookingsAndReviews();

  // 🌟 M3 模組擴展 (用戶行為：FavoriteAccommodation)
  await seedFavorites();

  console.log("🎉 所有核心 Seeding 流程已完成！");
}

main()
  .catch((e) => {
    console.error("❌ Seeding 過程發生錯誤：", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log("--- 資料庫連線已關閉 ---");
  });

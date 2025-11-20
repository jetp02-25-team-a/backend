
## 記帳type
INSERT INTO expense_types (expense_type_id, name) VALUES
(1, '交通'),
(2, '住宿'),
(3, '票券'),
(4, '購物'),
(5, '餐飲');

## 行李清單type
INSERT INTO packingitemtemplate (packing_item_template_id, name) VALUES
(1, '重要證件'),
(2, '衣物類'),
(3, '3C物品'),
(4, '日常盥洗用品'),
(5, '其他物品');

## 行李Item
SELECT * FROM shin02.packing_items;
INSERT INTO packing_items (templateId, name, is_checked)
VALUES
(1, '個人證件', 0),
(1, '信用卡', 0),
(1, '旅票', 0);

INSERT INTO packing_items (templateId, name, is_checked)
VALUES
(2, '上衣', 0),
(2, '褲子', 0),
(2, '內衣褲', 0),
(2, '睡衣', 0),
(2, '鞋子與替換鞋', 0),
(2, '襪子', 0);

INSERT INTO packing_items (templateId, name, is_checked)
VALUES
(3, '手機', 0),
(3, '行動電源', 0),
(3, '3C充電器', 0),
(3, '耳機', 0),
(3, '平板', 0);

INSERT INTO packing_items (templateId, name, is_checked)
VALUES
(4, '牙刷/牙膏/毛巾', 0),
(4, '洗面乳', 0),
(4, '洗髮精/沐浴乳', 0),
(4, '護髮乳/防曬乳', 0),
(4, '隨身藥品', 0);

INSERT INTO packing_items (templateId, name, is_checked)
VALUES
(5, '環保餐具', 0),
(5, '水瓶/保溫瓶', 0),
(5, '傘', 0),
(5, '塑膠袋', 0),
(5, '雨傘', 0);



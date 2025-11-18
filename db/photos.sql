-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- 主機： 127.0.0.1
-- 產生時間： 2025-11-18 12:56:44
-- 伺服器版本： 8.0.43
-- PHP 版本： 8.1.25

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- 資料庫： `travel34`
--

-- --------------------------------------------------------

--
-- 資料表結構 `photos`
--

CREATE TABLE `photos` (
  `photo_id` int NOT NULL,
  `post_id` int NOT NULL,
  `url` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- 傾印資料表的資料 `photos`
--

INSERT INTO `photos` (`photo_id`, `post_id`, `url`, `created_at`) VALUES
(1, 1, '72c5b92c-fab8-42de-9d34-5a5933c1de7f.png', '2025-11-18 08:50:26.510'),
(3, 3, 'bb92a969-831a-4ac8-bac0-a7a334d1c2e9.png', '2025-11-18 09:39:47.194'),
(4, 4, 'eb025c14-9a94-4b7d-ac96-4efe3c7c115a.png', '2025-11-18 09:43:47.603'),
(5, 5, '5ef268e5-994b-4847-b44b-05049df5b305.png', '2025-11-18 09:45:40.203'),
(6, 6, 'bb287a2e-47a0-44e1-9f11-1f096533c8b9.png', '2025-11-18 09:47:41.321'),
(7, 7, '4c841ff0-e9b1-46f5-813a-0410e8669795.png', '2025-11-18 09:49:14.518'),
(8, 8, '9f9f28c4-2074-466a-8c44-63062e13d01b.jpg', '2025-11-18 09:52:01.516'),
(9, 9, '297d6b77-b9d1-4ff5-9c19-566ec6d69604.jpg', '2025-11-18 09:54:57.741'),
(10, 10, 'edea5d14-6c21-4c4e-be84-2bccc4f3350b.png', '2025-11-18 09:56:57.493'),
(11, 11, 'd44a6d84-4273-4781-8110-29cc3b9b8e31.jpg', '2025-11-18 09:58:21.566'),
(12, 12, '668b4de7-9588-490b-af99-1e23bea5e430.jpg', '2025-11-18 10:01:08.253'),
(13, 13, 'a4ef026d-4bee-43ce-9f76-7e5eec57c975.png', '2025-11-18 10:03:10.882'),
(14, 14, 'd34c6150-b3c6-4950-9b63-e22b20057b41.png', '2025-11-18 10:28:57.226'),
(15, 15, '23fba3eb-7030-4953-ad1b-ed4a6a61041f.png', '2025-11-18 10:50:07.517'),
(16, 16, '32c89e48-7fd5-493d-ad20-67f3614e2a23.png', '2025-11-18 10:53:04.382'),
(17, 17, '5336fb0e-1d74-4fc4-8a74-b6d9bb09e7ea.png', '2025-11-18 10:54:44.751'),
(18, 18, 'de7680c2-f28a-4eaf-9628-d659cf12f24d.png', '2025-11-18 10:56:25.895'),
(19, 19, '581b3f7f-e2c9-4eb4-b790-b81200208d38.png', '2025-11-18 10:57:47.559'),
(20, 20, 'd547f68e-7779-4716-a928-7af3ff3547b4.png', '2025-11-18 10:59:46.193');

--
-- 已傾印資料表的索引
--

--
-- 資料表索引 `photos`
--
ALTER TABLE `photos`
  ADD PRIMARY KEY (`photo_id`),
  ADD KEY `photos_post_id_idx` (`post_id`);

--
-- 在傾印的資料表使用自動遞增(AUTO_INCREMENT)
--

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `photos`
--
ALTER TABLE `photos`
  MODIFY `photo_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- 已傾印資料表的限制式
--

--
-- 資料表的限制式 `photos`
--
ALTER TABLE `photos`
  ADD CONSTRAINT `photos_post_id_fkey` FOREIGN KEY (`post_id`) REFERENCES `posts` (`post_id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

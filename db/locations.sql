-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- 主機： 127.0.0.1
-- 產生時間： 2025-11-18 12:56:27
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
-- 資料表結構 `locations`
--

CREATE TABLE `locations` (
  `location_id` int NOT NULL,
  `city` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- 傾印資料表的資料 `locations`
--

INSERT INTO `locations` (`location_id`, `city`, `created_at`) VALUES
(1, '台北', '2025-11-18 16:49:25.142'),
(2, '桃園', '2025-11-18 16:49:25.142'),
(3, '新竹', '2025-11-18 16:49:25.142'),
(4, '苗栗', '2025-11-18 16:49:25.142'),
(5, '台中', '2025-11-18 16:49:25.142'),
(6, '彰化', '2025-11-18 16:49:25.142'),
(7, '南投', '2025-11-18 16:49:25.142'),
(8, '雲林', '2025-11-18 16:49:25.142'),
(9, '嘉義', '2025-11-18 16:49:25.142'),
(10, '台南', '2025-11-18 16:49:25.142'),
(11, '高雄', '2025-11-18 16:49:25.142'),
(12, '屏東', '2025-11-18 16:49:25.142'),
(13, '金門', '2025-11-18 16:49:25.142'),
(14, '澎湖', '2025-11-18 16:49:25.142'),
(15, '台東', '2025-11-18 16:49:25.142'),
(16, '花蓮', '2025-11-18 16:49:25.142');

--
-- 已傾印資料表的索引
--

--
-- 資料表索引 `locations`
--
ALTER TABLE `locations`
  ADD PRIMARY KEY (`location_id`);

--
-- 在傾印的資料表使用自動遞增(AUTO_INCREMENT)
--

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `locations`
--
ALTER TABLE `locations`
  MODIFY `location_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

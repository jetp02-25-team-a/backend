-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- 主機： 127.0.0.1
-- 產生時間： 2025 年 11 月 03 日 06:29
-- 伺服器版本： 8.0.33
-- PHP 版本： 8.2.4

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- 資料庫： `report`
--

-- --------------------------------------------------------

--
-- 資料表結構 `friendships`
--

CREATE TABLE `friendships` (
  `friendship_id` int NOT NULL,
  `user_id` int NOT NULL,
  `friend_id` int NOT NULL,
  `status` int NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- 傾印資料表的資料 `friendships`
--

INSERT INTO `friendships` (`friendship_id`, `user_id`, `friend_id`, `status`, `created_at`) VALUES
(1, 4, 5, 1, '2025-11-01 15:58:41.879'),
(2, 4, 6, 1, '2025-11-01 15:58:54.401'),
(3, 4, 7, 1, '2025-11-01 15:59:11.833'),
(4, 6, 4, 1, '2025-11-01 21:31:36.322'),
(5, 5, 4, 1, '2025-11-02 14:11:06.170');

-- --------------------------------------------------------

--
-- 資料表結構 `itineraries`
--

CREATE TABLE `itineraries` (
  `itinerary_id` int NOT NULL,
  `user_id` int NOT NULL,
  `title` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `area` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` int NOT NULL,
  `status` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- 資料表結構 `messages`
--

CREATE TABLE `messages` (
  `message_id` int NOT NULL,
  `room_id` int DEFAULT NULL,
  `receiver_id` int DEFAULT NULL,
  `sender_id` int NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `message_type` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- 傾印資料表的資料 `messages`
--

INSERT INTO `messages` (`message_id`, `room_id`, `receiver_id`, `sender_id`, `content`, `message_type`, `created_at`, `updated_at`) VALUES
(8, NULL, 3, 1, 'hello', 'text', '2025-10-28 07:05:20.982', '2025-10-28 07:05:20.982'),
(9, NULL, 3, 1, '第二次留言', 'text', '2025-10-28 07:17:18.764', '2025-10-28 07:17:18.764'),
(10, NULL, 3, 1, '第3次留言', 'text', '2025-10-28 07:17:24.114', '2025-10-28 07:17:24.114'),
(11, NULL, 3, 1, '第4次留言', 'text', '2025-10-28 07:17:27.493', '2025-10-28 07:17:27.493'),
(12, NULL, 1, 3, '三號第一次發言', 'text', '2025-10-28 07:17:45.091', '2025-10-28 07:17:45.091'),
(13, NULL, NULL, 3, '房間第一次測試', 'text', '2025-10-28 07:34:56.773', '2025-10-28 07:34:56.773'),
(14, NULL, NULL, 1, 'tes2', 'text', '2025-10-28 07:35:15.862', '2025-10-28 07:35:15.862'),
(15, NULL, NULL, 4, 'tes3', 'text', '2025-10-28 07:35:21.262', '2025-10-28 07:35:21.262'),
(16, 6, NULL, 1, '6號房台北一日遊', 'text', '2025-10-28 09:25:15.364', '2025-10-28 09:25:15.364'),
(17, 6, NULL, 2, '好喔出發！！！', 'text', '2025-10-28 09:25:29.748', '2025-10-28 09:25:29.748'),
(18, 6, NULL, 3, '+++', 'text', '2025-10-28 09:25:38.644', '2025-10-28 09:25:38.644'),
(20, 6, NULL, 3, 'okok?', 'text', '2025-10-28 09:37:52.764', '2025-10-28 09:37:52.764'),
(21, 6, NULL, 4, '測試', 'text', '2025-11-01 13:13:48.082', '2025-11-01 13:13:48.082'),
(22, 6, NULL, 4, '測試測試', 'text', '2025-11-01 13:13:51.554', '2025-11-01 13:13:51.554'),
(23, 6, NULL, 4, 'dfe', 'text', '2025-11-01 13:24:10.292', '2025-11-01 13:24:10.292'),
(24, NULL, 5, 4, 'kkkk', 'text', '2025-11-01 13:32:24.376', '2025-11-01 13:32:24.376'),
(25, NULL, 4, 6, 'kofekfoekeokfefe', 'text', '2025-11-01 13:32:31.874', '2025-11-01 13:32:31.874'),
(26, NULL, 5, 4, 'wqqwwq', 'text', '2025-11-01 13:32:35.322', '2025-11-01 13:32:35.322'),
(27, NULL, 4, 6, 'kgeokfeokfe', 'text', '2025-11-01 13:32:38.182', '2025-11-01 13:32:38.182'),
(28, NULL, 5, 4, 'fkeofke', 'text', '2025-11-01 13:32:41.620', '2025-11-01 13:32:41.620'),
(29, 6, NULL, 4, 'dddd', 'text', '2025-11-02 05:52:27.871', '2025-11-02 05:52:27.871'),
(30, 6, NULL, 4, 'dsdsds', 'text', '2025-11-02 05:52:30.389', '2025-11-02 05:52:30.389'),
(31, 6, NULL, 4, 'fkeokeofe', 'text', '2025-11-02 05:52:33.853', '2025-11-02 05:52:33.853'),
(32, 6, NULL, 4, 'ssss', 'text', '2025-11-02 05:52:51.074', '2025-11-02 05:52:51.074'),
(33, NULL, 4, 6, 'fkkoekoee', 'text', '2025-11-02 05:56:05.442', '2025-11-02 05:56:05.442'),
(34, NULL, 4, 6, '這裡是五號', 'text', '2025-11-02 05:56:12.193', '2025-11-02 05:56:12.193'),
(35, NULL, 4, 6, '這裡是五號', 'text', '2025-11-02 05:56:16.511', '2025-11-02 05:56:16.511'),
(36, NULL, 4, 6, '五號', 'text', '2025-11-02 05:56:59.990', '2025-11-02 05:56:59.990'),
(37, NULL, 4, 6, '五號', 'text', '2025-11-02 05:57:00.199', '2025-11-02 05:57:00.199'),
(38, NULL, 6, 4, 'jidje', 'text', '2025-11-02 06:06:03.878', '2025-11-02 06:06:03.878'),
(39, NULL, 7, 4, 'eeeee', 'text', '2025-11-02 06:06:09.672', '2025-11-02 06:06:09.672'),
(40, NULL, 5, 4, '???', 'text', '2025-11-02 06:11:57.416', '2025-11-02 06:11:57.416'),
(41, NULL, 4, 5, '啊之前的訊息勒？', 'text', '2025-11-02 06:12:12.518', '2025-11-02 06:12:12.518'),
(42, NULL, 4, 5, '啊之前的訊息勒？', 'text', '2025-11-02 06:12:12.628', '2025-11-02 06:12:12.628'),
(43, NULL, 5, 4, '我不知道啊', 'text', '2025-11-02 06:12:18.395', '2025-11-02 06:12:18.395'),
(44, NULL, 4, 5, '???', 'text', '2025-11-02 06:14:13.290', '2025-11-02 06:14:13.290'),
(45, NULL, 4, 5, '五號說', 'text', '2025-11-02 06:14:54.981', '2025-11-02 06:14:54.981'),
(46, NULL, 5, 4, '那？？？', 'text', '2025-11-02 06:23:14.598', '2025-11-02 06:23:14.598'),
(47, NULL, 4, 5, 'ddd', 'text', '2025-11-02 06:24:55.844', '2025-11-02 06:24:55.844'),
(48, NULL, 4, 5, 'lll', 'text', '2025-11-02 06:34:35.268', '2025-11-02 06:34:35.268'),
(49, NULL, 4, 5, 'kkkk', 'text', '2025-11-02 06:35:21.276', '2025-11-02 06:35:21.276'),
(50, NULL, 4, 5, 'jidjeie', 'text', '2025-11-02 06:35:24.054', '2025-11-02 06:35:24.054'),
(51, NULL, 5, 4, '應該會看到最底下吧', 'text', '2025-11-02 06:48:39.178', '2025-11-02 06:48:39.178'),
(52, NULL, 5, 4, 'ooop', 'text', '2025-11-02 06:56:35.492', '2025-11-02 06:56:35.492'),
(53, NULL, 5, 4, 'ooop', 'text', '2025-11-02 06:56:37.660', '2025-11-02 06:56:37.660'),
(54, NULL, 5, 4, 'juuiju', 'text', '2025-11-02 06:56:40.226', '2025-11-02 06:56:40.226'),
(55, NULL, 5, 4, 'jijuihu', 'text', '2025-11-02 06:56:41.664', '2025-11-02 06:56:41.664'),
(56, NULL, 5, 4, 'vgtftd', 'text', '2025-11-02 06:56:43.074', '2025-11-02 06:56:43.074'),
(57, NULL, 5, 4, 'dxrtdytf', 'text', '2025-11-02 06:56:51.033', '2025-11-02 06:56:51.033'),
(58, NULL, 5, 4, 'koko', 'text', '2025-11-02 07:13:33.238', '2025-11-02 07:13:33.238'),
(59, NULL, 5, 4, '???', 'text', '2025-11-02 07:13:37.374', '2025-11-02 07:13:37.374'),
(60, NULL, 5, 4, '我我我', 'text', '2025-11-02 10:37:33.245', '2025-11-02 10:37:33.245'),
(61, NULL, 5, 4, 'ddd', 'text', '2025-11-03 02:41:01.630', '2025-11-03 02:41:01.630'),
(62, NULL, 5, 4, 'kokok', 'text', '2025-11-03 02:41:33.970', '2025-11-03 02:41:33.970');

-- --------------------------------------------------------

--
-- 資料表結構 `message_boards`
--

CREATE TABLE `message_boards` (
  `message_id` int NOT NULL,
  `user_id` int DEFAULT NULL,
  `username` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `content` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- 資料表結構 `rooms`
--

CREATE TABLE `rooms` (
  `room_id` int NOT NULL,
  `room_name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- 傾印資料表的資料 `rooms`
--

INSERT INTO `rooms` (`room_id`, `room_name`, `created_at`) VALUES
(2, '台北一日遊', '2025-10-28 08:40:10.561'),
(6, '台北一日遊', '2025-10-28 09:22:25.524');

-- --------------------------------------------------------

--
-- 資料表結構 `user_itineraries`
--

CREATE TABLE `user_itineraries` (
  `user_itinerary_id` int NOT NULL,
  `user_id` int NOT NULL,
  `itinerary_id` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- 已傾印資料表的索引
--

--
-- 資料表索引 `friendships`
--
ALTER TABLE `friendships`
  ADD PRIMARY KEY (`friendship_id`),
  ADD KEY `friendships_user_id_fkey` (`user_id`),
  ADD KEY `friendships_friend_id_fkey` (`friend_id`);

--
-- 資料表索引 `itineraries`
--
ALTER TABLE `itineraries`
  ADD PRIMARY KEY (`itinerary_id`),
  ADD KEY `itineraries_user_id_fkey` (`user_id`);

--
-- 資料表索引 `messages`
--
ALTER TABLE `messages`
  ADD PRIMARY KEY (`message_id`),
  ADD KEY `messages_room_id_fkey` (`room_id`),
  ADD KEY `messages_sender_id_fkey` (`sender_id`),
  ADD KEY `messages_receiver_id_fkey` (`receiver_id`);

--
-- 資料表索引 `message_boards`
--
ALTER TABLE `message_boards`
  ADD PRIMARY KEY (`message_id`),
  ADD KEY `message_boards_user_id_fkey` (`user_id`);

--
-- 資料表索引 `rooms`
--
ALTER TABLE `rooms`
  ADD PRIMARY KEY (`room_id`);

--
-- 資料表索引 `user_itineraries`
--
ALTER TABLE `user_itineraries`
  ADD PRIMARY KEY (`user_itinerary_id`),
  ADD KEY `user_itineraries_user_id_fkey` (`user_id`),
  ADD KEY `user_itineraries_itinerary_id_fkey` (`itinerary_id`);

--
-- 在傾印的資料表使用自動遞增(AUTO_INCREMENT)
--

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `friendships`
--
ALTER TABLE `friendships`
  MODIFY `friendship_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `itineraries`
--
ALTER TABLE `itineraries`
  MODIFY `itinerary_id` int NOT NULL AUTO_INCREMENT;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `messages`
--
ALTER TABLE `messages`
  MODIFY `message_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=63;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `message_boards`
--
ALTER TABLE `message_boards`
  MODIFY `message_id` int NOT NULL AUTO_INCREMENT;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `rooms`
--
ALTER TABLE `rooms`
  MODIFY `room_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- 使用資料表自動遞增(AUTO_INCREMENT) `user_itineraries`
--
ALTER TABLE `user_itineraries`
  MODIFY `user_itinerary_id` int NOT NULL AUTO_INCREMENT;

--
-- 已傾印資料表的限制式
--

--
-- 資料表的限制式 `friendships`
--
ALTER TABLE `friendships`
  ADD CONSTRAINT `friendships_friend_id_fkey` FOREIGN KEY (`friend_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `friendships_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- 資料表的限制式 `itineraries`
--
ALTER TABLE `itineraries`
  ADD CONSTRAINT `itineraries_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- 資料表的限制式 `messages`
--
ALTER TABLE `messages`
  ADD CONSTRAINT `messages_receiver_id_fkey` FOREIGN KEY (`receiver_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `messages_room_id_fkey` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`room_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `messages_sender_id_fkey` FOREIGN KEY (`sender_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- 資料表的限制式 `message_boards`
--
ALTER TABLE `message_boards`
  ADD CONSTRAINT `message_boards_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- 資料表的限制式 `user_itineraries`
--
ALTER TABLE `user_itineraries`
  ADD CONSTRAINT `user_itineraries_itinerary_id_fkey` FOREIGN KEY (`itinerary_id`) REFERENCES `itineraries` (`itinerary_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `user_itineraries_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

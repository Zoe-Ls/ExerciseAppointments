-- =====================================================================
--  华中农业大学 · 校园运动场馆预约系统  数据库建表脚本
--  数据库：MySQL 8.0+（InnoDB / utf8mb4）
--  配套文档：docs/后端接口与数据库设计.md
--  执行：mysql -u root -p < docs/schema.sql
-- =====================================================================

CREATE DATABASE IF NOT EXISTS hzau_sports
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE hzau_sports;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------
-- 1. users 用户（学生 + 管理员）
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS users;
CREATE TABLE users (
  id                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  role                 ENUM('student','admin') NOT NULL DEFAULT 'student',
  student_no           VARCHAR(20)  DEFAULT NULL COMMENT '学号，仅学生',
  login_name           VARCHAR(32)  NOT NULL COMMENT '登录名：学生=学号，管理员=admin',
  password_hash        VARCHAR(255) NOT NULL COMMENT 'bcrypt/argon2id',
  must_change_password TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '管理员首登强制改密',
  status               ENUM('normal','muted','banned') NOT NULL DEFAULT 'normal',
  status_reason        VARCHAR(255) DEFAULT NULL,
  name                 VARCHAR(32)  NOT NULL,
  gender               ENUM('male','female','unknown') NOT NULL DEFAULT 'unknown',
  age                  TINYINT UNSIGNED DEFAULT NULL,
  grade                VARCHAR(16)  DEFAULT NULL COMMENT '年级',
  major                VARCHAR(64)  DEFAULT NULL,
  class_name           VARCHAR(32)  DEFAULT NULL,
  hobbies              VARCHAR(128) DEFAULT NULL,
  bio                  VARCHAR(255) DEFAULT NULL,
  avatar_url           VARCHAR(255) DEFAULT NULL,
  last_login_at        DATETIME     DEFAULT NULL,
  created_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_login_name (login_name),
  UNIQUE KEY uk_student_no (student_no),
  KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- ---------------------------------------------------------------------
-- 2. venue_types 场馆类型（9 条）
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS venue_types;
CREATE TABLE venue_types (
  id                  SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code                VARCHAR(32) NOT NULL COMMENT 'badminton/pingpong/...',
  name                VARCHAR(32) NOT NULL,
  group_name          VARCHAR(32) NOT NULL COMMENT '东体育馆/第二运动场/...',
  location            VARCHAR(64) NOT NULL,
  icon                VARCHAR(16) NOT NULL,
  venue_count         SMALLINT UNSIGNED NOT NULL,
  capacity            TINYINT UNSIGNED NOT NULL COMMENT '场地参考人数（仅展示，不参与校验）',
  capacity_note       VARCHAR(64) DEFAULT NULL COMMENT '展示用说明文案',
  code_prefix         VARCHAR(8)  NOT NULL COMMENT '羽/排/乒/网/泳',
  allow_personal      TINYINT(1) NOT NULL DEFAULT 1 COMMENT '预留字段（已取消个人/社团区分）',
  allow_club          TINYINT(1) NOT NULL DEFAULT 1 COMMENT '预留字段（已取消个人/社团区分）',
  gender_limit        ENUM('none','male','female') NOT NULL DEFAULT 'none' COMMENT '预留字段',
  open_hour           TINYINT UNSIGNED NOT NULL DEFAULT 8,
  close_hour          TINYINT UNSIGNED NOT NULL DEFAULT 22,
  slot_minutes        SMALLINT UNSIGNED NOT NULL DEFAULT 60,
  days_ahead_limit    SMALLINT UNSIGNED NOT NULL DEFAULT 7 COMMENT '可提前预约天数',
  daily_quota_per_user TINYINT UNSIGNED NOT NULL DEFAULT 2 COMMENT '每人每日预约上限',
  status              ENUM('enabled','disabled') NOT NULL DEFAULT 'enabled',
  PRIMARY KEY (id),
  UNIQUE KEY uk_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='场馆类型';

-- ---------------------------------------------------------------------
-- 3. venues 具体场地（80 条，由 venue_types.venue_count 生成）
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS venues;
CREATE TABLE venues (
  id                SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  venue_type_id     SMALLINT UNSIGNED NOT NULL,
  venue_no          VARCHAR(8) NOT NULL COMMENT '01..36',
  display_code      VARCHAR(16) NOT NULL COMMENT '羽01/乒12',
  location_override VARCHAR(64) DEFAULT NULL,
  status            ENUM('enabled','maintenance') NOT NULL DEFAULT 'enabled',
  PRIMARY KEY (id),
  UNIQUE KEY uk_type_no (venue_type_id, venue_no),
  CONSTRAINT fk_venues_type FOREIGN KEY (venue_type_id) REFERENCES venue_types (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='具体场地';

-- ---------------------------------------------------------------------
-- 4. bookings 预约单（唯一索引防超卖）
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS bookings;
CREATE TABLE bookings (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  venue_id       SMALLINT UNSIGNED NOT NULL,
  venue_type_id  SMALLINT UNSIGNED NOT NULL COMMENT '冗余，便于统计',
  book_date      DATE NOT NULL,
  slot_index     TINYINT UNSIGNED NOT NULL COMMENT '0..13',
  slot_start     TIME NOT NULL,
  slot_end       TIME NOT NULL,
  user_id        BIGINT UNSIGNED NOT NULL COMMENT '预约人（组队时为队长）',
  reason         VARCHAR(255) NOT NULL COMMENT '预约理由（必填，展示给管理员审核）',
  member_count   TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '同行成员人数（选填，不限制）',
  status         ENUM('pending','approved','rejected','cancelled','expired') NOT NULL DEFAULT 'pending',
  active_flag    TINYINT UNSIGNED GENERATED ALWAYS AS (IF(status IN ('pending','approved'), 1, NULL)) STORED
                 COMMENT '生效标记：NULL 不参与唯一索引，实现“同一时段仅一条生效预约”',
  team_id        BIGINT UNSIGNED DEFAULT NULL,
  reviewed_by    BIGINT UNSIGNED DEFAULT NULL,
  reviewed_at    DATETIME DEFAULT NULL,
  reject_reason  VARCHAR(255) DEFAULT NULL,
  cancel_reason  VARCHAR(255) DEFAULT NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_slot (venue_id, book_date, slot_start, active_flag) COMMENT '同一场地同一时段仅一条生效预约',
  UNIQUE KEY uk_user_slot (user_id, book_date, slot_start, active_flag) COMMENT '同一用户同一时段仅一条预约',
  KEY idx_status_date (status, book_date),
  KEY idx_user_date (user_id, book_date),
  KEY idx_type_date (venue_type_id, book_date),
  CONSTRAINT fk_bookings_venue FOREIGN KEY (venue_id) REFERENCES venues (id),
  CONSTRAINT fk_bookings_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='预约单';

-- ---------------------------------------------------------------------
-- 5. booking_members 预约成员名单
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS booking_members;
CREATE TABLE booking_members (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_id BIGINT UNSIGNED NOT NULL,
  seq        TINYINT UNSIGNED NOT NULL,
  name       VARCHAR(32) NOT NULL,
  user_id    BIGINT UNSIGNED DEFAULT NULL COMMENT '成员为注册用户时回填',
  PRIMARY KEY (id),
  UNIQUE KEY uk_booking_seq (booking_id, seq),
  KEY idx_booking (booking_id),
  CONSTRAINT fk_members_booking FOREIGN KEY (booking_id) REFERENCES bookings (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='预约成员名单';
-- ---------------------------------------------------------------------
-- 6. teams 组队消息
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS teams;
CREATE TABLE teams (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  owner_id      BIGINT UNSIGNED NOT NULL COMMENT '队长',
  venue_id      SMALLINT UNSIGNED DEFAULT NULL,
  venue_type_id SMALLINT UNSIGNED DEFAULT NULL,
  book_date     DATE DEFAULT NULL,
  slot_index    TINYINT UNSIGNED DEFAULT NULL,
  slot_start    TIME DEFAULT NULL,
  need_count    TINYINT UNSIGNED NOT NULL,
  joined_count  TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '事务内维护',
  title         VARCHAR(64) NOT NULL,
  contact       VARCHAR(64) DEFAULT NULL,
  note          VARCHAR(255) DEFAULT NULL,
  status        ENUM('open','full','booked','closed','expired') NOT NULL DEFAULT 'open',
  booking_id    BIGINT UNSIGNED DEFAULT NULL,
  expire_at     DATETIME DEFAULT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_status_date (status, book_date),
  CONSTRAINT fk_teams_owner FOREIGN KEY (owner_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='组队消息';

-- ---------------------------------------------------------------------
-- 7. team_members 入队申请与成员
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS team_members;
CREATE TABLE team_members (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  team_id    BIGINT UNSIGNED NOT NULL,
  user_id    BIGINT UNSIGNED NOT NULL,
  status     ENUM('pending','joined','rejected') NOT NULL DEFAULT 'pending',
  note       VARCHAR(128) DEFAULT NULL,
  acted_by   BIGINT UNSIGNED DEFAULT NULL,
  acted_at   DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_team_user (team_id, user_id) COMMENT '防重复申请',
  KEY idx_user (user_id),
  CONSTRAINT fk_tm_team FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE,
  CONSTRAINT fk_tm_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='组队成员/申请';

-- ---------------------------------------------------------------------
-- 8. posts / post_comments / post_likes / post_favorites 交流中心
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS posts;
CREATE TABLE posts (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id        BIGINT UNSIGNED NOT NULL,
  content        VARCHAR(1000) NOT NULL,
  like_count     INT UNSIGNED NOT NULL DEFAULT 0,
  comment_count  INT UNSIGNED NOT NULL DEFAULT 0,
  favorite_count INT UNSIGNED NOT NULL DEFAULT 0,
  status         ENUM('visible','removed') NOT NULL DEFAULT 'visible',
  removed_by     BIGINT UNSIGNED DEFAULT NULL,
  removed_reason VARCHAR(255) DEFAULT NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_created (created_at),
  KEY idx_user (user_id),
  CONSTRAINT fk_posts_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='帖子';

DROP TABLE IF EXISTS post_comments;
CREATE TABLE post_comments (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  post_id    BIGINT UNSIGNED NOT NULL,
  user_id    BIGINT UNSIGNED NOT NULL,
  content    VARCHAR(500) NOT NULL,
  status     ENUM('visible','removed') NOT NULL DEFAULT 'visible',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_post (post_id, created_at),
  CONSTRAINT fk_comments_post FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
  CONSTRAINT fk_comments_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='帖子评论';

DROP TABLE IF EXISTS post_likes;
CREATE TABLE post_likes (
  post_id    BIGINT UNSIGNED NOT NULL,
  user_id    BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (post_id, user_id),
  CONSTRAINT fk_likes_post FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
  CONSTRAINT fk_likes_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='点赞';

DROP TABLE IF EXISTS post_favorites;
CREATE TABLE post_favorites (
  post_id    BIGINT UNSIGNED NOT NULL,
  user_id    BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (post_id, user_id),
  CONSTRAINT fk_fav_post FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
  CONSTRAINT fk_fav_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='收藏';

-- ---------------------------------------------------------------------
-- 9. reports 举报单
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS reports;
CREATE TABLE reports (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  reporter_id       BIGINT UNSIGNED NOT NULL,
  target_type       ENUM('post','comment','user') NOT NULL,
  target_user_id    BIGINT UNSIGNED NOT NULL,
  target_post_id    BIGINT UNSIGNED DEFAULT NULL,
  target_comment_id BIGINT UNSIGNED DEFAULT NULL,
  reason            VARCHAR(255) NOT NULL,
  status            ENUM('open','resolved','dismissed') NOT NULL DEFAULT 'open',
  action            ENUM('warn','remove_content','mute','ban','unmute','dismiss') DEFAULT NULL,
  handled_by        BIGINT UNSIGNED DEFAULT NULL,
  handled_at        DATETIME DEFAULT NULL,
  handle_note       VARCHAR(255) DEFAULT NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_reporter_target (reporter_id, target_type, target_post_id, target_comment_id, target_user_id)
    COMMENT '同一举报人对同一对象只举报一次（NULL 不参与唯一性，应用层再兜底）',
  KEY idx_status (status),
  KEY idx_target_user (target_user_id),
  CONSTRAINT fk_reports_reporter FOREIGN KEY (reporter_id) REFERENCES users (id),
  CONSTRAINT fk_reports_target FOREIGN KEY (target_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='举报单';

-- ---------------------------------------------------------------------
-- 10. notices 管理员通知
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS notices;
CREATE TABLE notices (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title        VARCHAR(64) NOT NULL,
  content      VARCHAR(1000) NOT NULL,
  status       ENUM('published','deleted') NOT NULL DEFAULT 'published',
  published_by BIGINT UNSIGNED NOT NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_status_created (status, created_at),
  CONSTRAINT fk_notices_admin FOREIGN KEY (published_by) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='通知';

-- ---------------------------------------------------------------------
-- 11. friend_requests / friendships 好友
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS friend_requests;
CREATE TABLE friend_requests (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  from_user_id BIGINT UNSIGNED NOT NULL,
  to_user_id   BIGINT UNSIGNED NOT NULL,
  status       ENUM('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  acted_at     DATETIME DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_from_to (from_user_id, to_user_id) COMMENT '同一对用户只保留一条申请记录',
  KEY idx_to_status (to_user_id, status),
  CONSTRAINT fk_fr_from FOREIGN KEY (from_user_id) REFERENCES users (id),
  CONSTRAINT fk_fr_to FOREIGN KEY (to_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='好友申请';

DROP TABLE IF EXISTS friendships;
CREATE TABLE friendships (
  user_id    BIGINT UNSIGNED NOT NULL,
  friend_id  BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, friend_id),
  CONSTRAINT fk_fs_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT fk_fs_friend FOREIGN KEY (friend_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='好友关系（双向两行）';

-- ---------------------------------------------------------------------
-- 12. 审计与日志
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS admin_audit_logs;
CREATE TABLE admin_audit_logs (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  admin_id    BIGINT UNSIGNED NOT NULL,
  action      VARCHAR(32) NOT NULL COMMENT 'review_booking/ban_user/publish_notice/...',
  target_type VARCHAR(16) DEFAULT NULL,
  target_id   BIGINT UNSIGNED DEFAULT NULL,
  detail      JSON DEFAULT NULL,
  ip          VARCHAR(45) DEFAULT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_admin_time (admin_id, created_at),
  KEY idx_action_time (action, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='管理员操作审计';

DROP TABLE IF EXISTS login_logs;
CREATE TABLE login_logs (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    BIGINT UNSIGNED DEFAULT NULL,
  login_name VARCHAR(32) DEFAULT NULL,
  ip         VARCHAR(45) DEFAULT NULL,
  user_agent VARCHAR(255) DEFAULT NULL,
  success    TINYINT(1) NOT NULL DEFAULT 1,
  fail_reason VARCHAR(64) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_login_time (login_name, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='登录日志';

-- ---------------------------------------------------------------------
-- 13. venue_slot_blocks 场地时段停用（维修/赛事征用）
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS venue_slot_blocks;
CREATE TABLE venue_slot_blocks (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  venue_id   SMALLINT UNSIGNED NOT NULL,
  block_date DATE NOT NULL,
  slot_index TINYINT UNSIGNED NOT NULL,
  reason     VARCHAR(128) DEFAULT NULL,
  created_by BIGINT UNSIGNED DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_block (venue_id, block_date, slot_index),
  CONSTRAINT fk_block_venue FOREIGN KEY (venue_id) REFERENCES venues (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='场地时段停用';

SET FOREIGN_KEY_CHECKS = 1;
-- =====================================================================
--  初始化数据（seed，幂等）
-- =====================================================================

-- 14. 数字辅助表（用于按 venue_count 生成场地）
DROP TABLE IF EXISTS seq_numbers;
CREATE TABLE seq_numbers (n SMALLINT UNSIGNED NOT NULL PRIMARY KEY) ENGINE=InnoDB;
INSERT INTO seq_numbers (n) VALUES
 (1),(2),(3),(4),(5),(6),(7),(8),(9),(10),(11),(12),(13),(14),(15),(16),(17),(18),(19),(20),
 (21),(22),(23),(24),(25),(26),(27),(28),(29),(30),(31),(32),(33),(34),(35),(36),(37),(38),(39),(40);

-- 15. 9 类场馆
INSERT INTO venue_types
  (code, name, group_name, location, icon, venue_count, capacity, capacity_note, code_prefix, allow_personal, allow_club, gender_limit)
VALUES
  ('badminton',        '羽毛球馆',   '东体育馆',      '东体育馆 3楼',      '🏸', 20,  4, '每片场地限 4 人（双打）',       '羽', 1, 1, 'none'),
  ('volleyball-old',   '排球老场',   '第二运动场',    '第二运动场',        '🏐',  8, 12, '每片场地限 12 人',             '排', 1, 1, 'none'),
  ('volleyball-new',   '排球新场',   '第三运动场',    '第三运动场',        '🏐',  6, 12, '每片场地限 12 人',             '排', 1, 1, 'none'),
  ('volleyball-indoor','排球室内场', '西体育馆',      '西体育馆',          '🏐',  1, 12, '每片场地限 12 人',             '排', 1, 1, 'none'),
  ('pingpong',         '乒乓球馆',   '东体育馆',      '东体育馆 1楼',      '🏓', 36,  4, '每张球台限 4 人',               '乒', 1, 1, 'none'),
  ('tennis-indoor',    '室内网球馆', '东体育馆',      '东体育馆 2楼',      '🎾',  3,  4, '每片场地限 4 人',               '网', 1, 1, 'none'),
  ('tennis-outdoor',   '室外网球场', '室外场地',      '室外网球场',        '🎾',  4,  4, '每片场地限 4 人',               '网', 1, 1, 'none'),
  ('swim-male',        '游泳馆（男）','东体育馆游泳馆','东体育馆 游泳馆',   '🏊',  1,  1, '游泳馆 1 人',                 '泳', 1, 1, 'male'),
  ('swim-female',      '游泳馆（女）','东体育馆游泳馆','东体育馆 游泳馆',   '🏊',  1,  1, '游泳馆 1 人',                 '泳', 1, 1, 'female')
ON DUPLICATE KEY UPDATE
  name = VALUES(name), group_name = VALUES(group_name), location = VALUES(location),
  icon = VALUES(icon), venue_count = VALUES(venue_count), capacity = VALUES(capacity),
  capacity_note = VALUES(capacity_note), code_prefix = VALUES(code_prefix),
  allow_personal = VALUES(allow_personal), allow_club = VALUES(allow_club),
  gender_limit = VALUES(gender_limit);

-- 16. 按 venue_count 生成 80 个场地（羽01..羽20 / 乒01..乒36 / 排01..排08 等）
INSERT INTO venues (venue_type_id, venue_no, display_code)
SELECT t.id, LPAD(s.n, 2, '0'), CONCAT(t.code_prefix, LPAD(s.n, 2, '0'))
FROM venue_types t
JOIN seq_numbers s ON s.n <= t.venue_count
ON DUPLICATE KEY UPDATE display_code = VALUES(display_code);

-- 17. 超级管理员（正式版请使用 scripts/seed.js 生成随机密码并写入启动日志）
--     下面的 bcrypt 哈希对应明文 'admin123'，仅供本地开发联调使用！
INSERT INTO users (role, login_name, password_hash, must_change_password, name, status)
VALUES ('admin', 'admin', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 1, '系统管理员', 'normal')
ON DUPLICATE KEY UPDATE role = 'admin', must_change_password = 1;

-- =====================================================================
--  自检（执行后应返回 9 / 80 / 1）
-- =====================================================================
SELECT
  (SELECT COUNT(*) FROM venue_types) AS 场馆类型数,
  (SELECT COUNT(*) FROM venues)      AS 场地总数,
  (SELECT COUNT(*) FROM users WHERE role = 'admin') AS 管理员数;

-- =====================================================================
--  防超卖验证（手动执行观察结果）
--  预期：第 1 条成功；第 2 条报 1062 Duplicate entry 'uk_slot'；第 3 条（不同用户同时段不同场地）受 uk_user_slot 拦截
-- =====================================================================
-- INSERT INTO bookings (venue_id, venue_type_id, book_date, slot_index, slot_start, slot_end, user_id, reason, member_count, status)
--   VALUES (1, 1, CURDATE() + INTERVAL 1 DAY, 3, '11:00', '12:00', 2, '院队训练', 4, 'pending');
-- INSERT INTO bookings (venue_id, venue_type_id, book_date, slot_index, slot_start, slot_end, user_id, reason, member_count, status)
--   VALUES (1, 1, CURDATE() + INTERVAL 1 DAY, 3, '11:00', '12:00', 3, '和同学约球', 4, 'pending');  -- 期望 1062
--
-- 说明：状态改为 rejected/cancelled 后 active_flag 变为 NULL，该时段即可被再次预约：
-- UPDATE bookings SET status = 'cancelled' WHERE id = <上一条预约 id>;
-- 之后同样的 INSERT 会成功。

-- =====================================================================
--  导入提示
--  mysql --default-character-set=utf8mb4 -u root -p < docs/schema.sql
--  （必须指定 utf8mb4，否则场馆图标 emoji 会乱码）
-- =====================================================================

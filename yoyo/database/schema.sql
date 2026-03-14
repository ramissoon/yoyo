-- Yoyo Platform - MySQL Schema

CREATE DATABASE IF NOT EXISTS yoyo_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE yoyo_db;

-- Users table
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  pseudo VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  icon VARCHAR(50) DEFAULT 'lion',
  language ENUM('fr','en') DEFAULT 'fr',
  is_admin TINYINT(1) DEFAULT 0,
  total_score INT DEFAULT 0,
  flames_received INT DEFAULT 0,
  quizzes_played INT DEFAULT 0,
  quizzes_created INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Categories/Tags
CREATE TABLE categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(50) UNIQUE NOT NULL,
  name_fr VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  icon VARCHAR(10) NOT NULL
);

-- Badges
CREATE TABLE badges (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  level ENUM('debutant','intermediaire','expert') NOT NULL,
  name_fr VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- User badges
CREATE TABLE user_badges (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  badge_id INT NOT NULL,
  earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY (user_id, badge_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (badge_id) REFERENCES badges(id)
);

-- Quizzes
CREATE TABLE quizzes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  creator_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category_id INT NOT NULL,
  quiz_type ENUM('saisie','qcm','image','carte') NOT NULL,
  time_limit INT DEFAULT 120,
  image_url VARCHAR(500),
  is_published TINYINT(1) DEFAULT 0,
  is_deleted TINYINT(1) DEFAULT 0,
  plays_count INT DEFAULT 0,
  likes_count INT DEFAULT 0,
  avg_score DECIMAL(5,2) DEFAULT 0,
  avg_time DECIMAL(8,2) DEFAULT 0,
  success_rate DECIMAL(5,2) DEFAULT 0,
  sources TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (creator_id) REFERENCES users(id),
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Quiz questions/answers
CREATE TABLE quiz_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quiz_id INT NOT NULL,
  question TEXT,
  answer VARCHAR(500) NOT NULL,
  alt_answers TEXT,  -- JSON array of alternative valid answers
  image_url VARCHAR(500),
  lat DECIMAL(10,7),
  lng DECIMAL(10,7),
  sort_order INT DEFAULT 0,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);

-- QCM options
CREATE TABLE qcm_options (
  id INT AUTO_INCREMENT PRIMARY KEY,
  item_id INT NOT NULL,
  option_text VARCHAR(255) NOT NULL,
  is_correct TINYINT(1) DEFAULT 0,
  FOREIGN KEY (item_id) REFERENCES quiz_items(id) ON DELETE CASCADE
);

-- Quiz plays / results
CREATE TABLE quiz_plays (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quiz_id INT NOT NULL,
  user_id INT,
  score INT DEFAULT 0,
  total_questions INT DEFAULT 0,
  time_taken INT DEFAULT 0,
  played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Likes on quizzes
CREATE TABLE quiz_likes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quiz_id INT NOT NULL,
  user_id INT NOT NULL,
  UNIQUE KEY (quiz_id, user_id),
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Flames given to creators
CREATE TABLE flames (
  id INT AUTO_INCREMENT PRIMARY KEY,
  from_user_id INT NOT NULL,
  to_user_id INT NOT NULL,
  UNIQUE KEY (from_user_id, to_user_id),
  FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Quiz reports
CREATE TABLE quiz_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quiz_id INT NOT NULL,
  reporter_id INT,
  reason TEXT NOT NULL,
  status ENUM('pending','reviewed','dismissed') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
  FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Sessions
CREATE TABLE sessions (
  id VARCHAR(128) PRIMARY KEY,
  user_id INT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Seed categories
INSERT INTO categories (slug, name_fr, name_en, icon) VALUES
('geographie', 'Géographie', 'Geography', '🌍'),
('histoire', 'Histoire', 'History', '🏛'),
('culture', 'Culture', 'Culture', '🎭'),
('sport', 'Sport', 'Sport', '⚽'),
('cuisine', 'Cuisine', 'Cuisine', '🍛'),
('divertissement', 'Divertissement', 'Entertainment', '🎬'),
('mixte', 'Mixte', 'Mixed', '🎯');

-- Seed badges for each category
INSERT INTO badges (category_id, level, name_fr, name_en) VALUES
(1,'debutant','Géographe Débutant','Beginner Geographer'),
(1,'intermediaire','Géographe Intermédiaire','Intermediate Geographer'),
(1,'expert','Géographe Expert','Expert Geographer'),
(2,'debutant','Historien Débutant','Beginner Historian'),
(2,'intermediaire','Historien Intermédiaire','Intermediate Historian'),
(2,'expert','Historien Expert','Expert Historian'),
(3,'debutant','Culturiste Débutant','Beginner Culturist'),
(3,'intermediaire','Culturiste Intermédiaire','Intermediate Culturist'),
(3,'expert','Culturiste Expert','Expert Culturist'),
(4,'debutant','Sportif Débutant','Beginner Sports Fan'),
(4,'intermediaire','Sportif Intermédiaire','Intermediate Sports Fan'),
(4,'expert','Sportif Expert','Expert Sports Fan'),
(5,'debutant','Cuisinier Débutant','Beginner Cook'),
(5,'intermediaire','Cuisinier Intermédiaire','Intermediate Cook'),
(5,'expert','Cuisinier Expert','Expert Cook'),
(6,'debutant','Entertaineur Débutant','Beginner Entertainer'),
(6,'intermediaire','Entertaineur Intermédiaire','Intermediate Entertainer'),
(6,'expert','Entertaineur Expert','Expert Entertainer'),
(7,'debutant','Mixte Débutant','Beginner Mixed'),
(7,'intermediaire','Mixte Intermédiaire','Intermediate Mixed'),
(7,'expert','Mixte Expert','Expert Mixed');

-- Seed admin account (password: ProJetYoYo225, bcrypt hashed)
INSERT INTO users (email, pseudo, password_hash, is_admin, language) VALUES
('admin@yoyo225.ci', 'YoYo225', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGniMDiLO3yKqMw4ZYB9Y7ZnFTu', 1, 'fr');

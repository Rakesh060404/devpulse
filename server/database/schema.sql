-- DevPulse Database Schema
-- Initialize database for GitHub analytics platform

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    github_id INT UNIQUE NOT NULL,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    avatar_url VARCHAR(500),
    access_token VARCHAR(1000) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_github_id (github_id),
    INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Repositories Table (tracked repos)
CREATE TABLE IF NOT EXISTS repositories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    github_repo_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    html_url VARCHAR(500),
    description LONGTEXT,
    stargazers_count INT DEFAULT 0,
    forks_count INT DEFAULT 0,
    language VARCHAR(50),
    watchers_count INT DEFAULT 0,
    open_issues_count INT DEFAULT 0,
    topics JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tracked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_repo (user_id, github_repo_id),
    INDEX idx_user_id (user_id),
    INDEX idx_github_repo_id (github_repo_id),
    INDEX idx_tracked_at (tracked_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Commits Table
CREATE TABLE IF NOT EXISTS commits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    repo_id INT NOT NULL,
    sha VARCHAR(40) NOT NULL,
    message LONGTEXT NOT NULL,
    author VARCHAR(255),
    committed_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (repo_id) REFERENCES repositories(id) ON DELETE CASCADE,
    UNIQUE KEY unique_repo_sha (repo_id, sha),
    INDEX idx_repo_id (repo_id),
    INDEX idx_sha (sha),
    INDEX idx_committed_at (committed_at),
    INDEX idx_author (author)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Pull Requests Table
CREATE TABLE IF NOT EXISTS pull_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    repo_id INT NOT NULL,
    github_pr_id INT NOT NULL,
    title VARCHAR(500) NOT NULL,
    state VARCHAR(50),
    additions INT DEFAULT 0,
    deletions INT DEFAULT 0,
    changed_files INT DEFAULT 0,
    comments INT DEFAULT 0,
    review_comments INT DEFAULT 0,
    created_at DATETIME,
    merged_at DATETIME,
    closed_at DATETIME,
    user VARCHAR(255),
    reviewers JSON,
    review_time_minutes INT,
    created_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (repo_id) REFERENCES repositories(id) ON DELETE CASCADE,
    UNIQUE KEY unique_repo_pr (repo_id, github_pr_id),
    INDEX idx_repo_id (repo_id),
    INDEX idx_github_pr_id (github_pr_id),
    INDEX idx_state (state),
    INDEX idx_created_at (created_at),
    INDEX idx_merged_at (merged_at),
    INDEX idx_user (user)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Weekly Summaries Table
CREATE TABLE IF NOT EXISTS weekly_summaries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    repo_id INT NOT NULL,
    summary_text LONGTEXT NOT NULL,
    analytics JSON,
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    week_start DATE,
    week_end DATE,
    created_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (repo_id) REFERENCES repositories(id) ON DELETE CASCADE,
    INDEX idx_repo_id (repo_id),
    INDEX idx_generated_at (generated_at),
    INDEX idx_week_start (week_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Webhooks Log Table (for debugging)
CREATE TABLE IF NOT EXISTS webhook_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    repository_id INT,
    event_type VARCHAR(50),
    delivery_id VARCHAR(255),
    payload JSON,
    status VARCHAR(50),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_delivery_id (delivery_id),
    INDEX idx_event_type (event_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

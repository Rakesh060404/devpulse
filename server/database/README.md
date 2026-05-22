# DevPulse Database Setup Guide

## Schema Initialization

Run the schema.sql file to create all necessary tables:

```bash
# If using docker-compose:
docker-compose exec mysql mysql -u root -proot devpulse < database/schema.sql

# If using local MySQL:
mysql -u root -p devpulse < database/schema.sql
```

## Environment Variables

Ensure your `.env` file has these database settings:

```
DB_HOST=mysql              # or localhost if running locally
DB_USER=root
DB_PASSWORD=root           # Change in production
DB_NAME=devpulse
```

## Tables Overview

### users
- Stores GitHub user profile and authentication token
- `github_id`: Unique GitHub user ID
- `access_token`: GitHub OAuth token (for API calls)

### repositories
- Stores tracked repositories
- `user_id`: Owner of this tracking
- `github_repo_id`: GitHub's repository ID (for API calls)
- Includes metadata: stars, forks, language, etc.

### commits
- All commits from tracked repositories
- Indexed by `committed_at` for time-series queries
- Unique on (repo_id, sha) to prevent duplicates

### pull_requests
- All PRs from tracked repositories
- Tracks review time, additions/deletions, reviewers
- Unique on (repo_id, github_pr_id)

### weekly_summaries
- Generated AI summaries for repositories
- Stores analytics JSON alongside summary text
- Can be queried by week_start/week_end for historical data

### webhook_logs
- Optional: for debugging webhook processing
- Stores incoming webhook payloads and processing status

## Backup

Recommended backup schedule:
```bash
# Daily backup
mysqldump -u root -proot devpulse > backups/devpulse_$(date +%Y%m%d).sql

# For Docker:
docker-compose exec -T mysql mysqldump -u root -proot devpulse > backups/devpulse_$(date +%Y%m%d).sql
```

## Common Issues

### Table Already Exists
If you see "Table already exists" errors, it's safe to ignore - the `IF NOT EXISTS` clause handles this.

### Foreign Key Constraint Fails
Ensure tables are created in order: users → repositories → commits/prs/summaries

### Character Encoding Issues
All tables use `utf8mb4` for proper emoji and international character support.

## Indexing for Performance

All critical query columns are indexed:
- `user_id` - for filtering by user
- `committed_at` - for time-range queries  
- `state` - for PR status filtering
- `github_id` / `github_repo_id` - for lookups

For large datasets (100k+ commits), consider adding covering indexes for your specific query patterns.

# Pull Request Analytics - Implementation Guide

## Backend Implementation Status

### ✅ Completed Features

#### 1. **Enhanced PR Synchronization**
- Pagination support: Fetches ALL PRs (100 per page)
- Calculates `review_time_minutes` = `merged_at - created_at`
- Handles all PR fields: additions, deletions, changed_files, comments, review_comments
- Uses `ON DUPLICATE KEY UPDATE` to safely handle re-syncs
- Location: `/api/prs/sync/:repoId` (POST)

#### 2. **PR Data Endpoints**
- **GET /api/prs/:repoId** - All PRs ordered by created_at DESC
- **GET /api/prs/stats/:repoId** - PR statistics (total, merged, open, avg review time)
- **GET /api/prs/analytics/:repoId** - Alias for stats endpoint (backward compatible)
- **GET /api/prs/:repoId/weekly-stats** - Weekly aggregated PR data for charts

#### 3. **Dashboard Statistics**
- **GET /api/stats/dashboard** - Includes PR metrics:
  - `totalPRsOpen` - Count of open PRs across all tracked repos
  - `totalPRsMergedAllTime` - Count of merged PRs
  - `totalPRsClosed` - Count of closed but not merged PRs

#### 4. **Enhanced AI Summaries**
- PR titles, state, and metrics included
- Code change metrics (additions/deletions per PR)
- Review velocity (average review time)
- Collaboration insights (unique reviewers, comment counts)
- Engineering-focused summary generation

#### 5. **Database Schema**
The `pull_requests` table includes:
- `github_pr_id` - Unique GitHub PR identifier
- `state` - 'open' or 'closed'
- `merged_at` - Timestamp when PR was merged
- `review_time_minutes` - Calculated time from creation to merge
- `reviewers` - JSON array of reviewer usernames
- `additions`, `deletions`, `changed_files`, `comments`, `review_comments`

---

## Testing Instructions

### Prerequisites
1. Backend server running on `http://localhost:5000`
2. Valid JWT token from GitHub OAuth login
3. At least one tracked repository with PRs

### Method 1: Using Postman Collection

1. **Import Collection**
   - Open Postman
   - Click "Import" → Select `PR_ANALYTICS_TESTS.postman_collection.json`

2. **Set Variables**
   - Go to Collections → Variables
   - Set `base_url`: `http://localhost:5000`
   - Set `token`: Your JWT token from localStorage
   - Set `repoId`: Your tracked repository ID

3. **Run Tests**
   - Sync PRs: POST `/api/prs/sync/{{repoId}}`
   - Get PRs: GET `/api/prs/{{repoId}}`
   - Get Stats: GET `/api/prs/stats/{{repoId}}`
   - Get Weekly Stats: GET `/api/prs/{{repoId}}/weekly-stats?weeks=12`

### Method 2: Using cURL

```bash
# Set variables
TOKEN="your_jwt_token"
REPO_ID="1"
BASE_URL="http://localhost:5000"

# Test 1: Get Dashboard Stats
curl -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/stats/dashboard" | jq .

# Test 2: Sync PRs
curl -X POST -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/prs/sync/$REPO_ID" | jq .

# Test 3: Get All PRs
curl -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/prs/$REPO_ID" | jq .

# Test 4: Get PR Stats
curl -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/prs/stats/$REPO_ID" | jq .

# Test 5: Get Weekly Stats
curl -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/prs/$REPO_ID/weekly-stats?weeks=12" | jq .

# Test 6: Generate AI Summary
curl -X POST -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/summaries/generate/$REPO_ID" | jq .
```

### Method 3: Browser DevTools

1. Open your DevPulse app in browser
2. Go to Dashboard or RepositoryAnalytics
3. Open DevTools Console (F12)
4. Paste test commands:

```javascript
// Get token from localStorage
const token = localStorage.getItem('token');

// Test 1: Get Dashboard Stats
fetch('/api/stats/dashboard', {
  headers: { 'Authorization': `Bearer ${token}` }
})
  .then(r => r.json())
  .then(data => console.log('Dashboard Stats:', data));

// Test 2: Sync PRs for repo 1
fetch('/api/prs/sync/1', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
})
  .then(r => r.json())
  .then(data => console.log('Sync Result:', data));

// Test 3: Get PR Stats
fetch('/api/prs/stats/1', {
  headers: { 'Authorization': `Bearer ${token}` }
})
  .then(r => r.json())
  .then(data => console.log('PR Stats:', data));
```

---

## Expected API Responses

### Dashboard Stats Response
```json
{
  "trackedReposCount": 2,
  "totalCommitsAllTime": 45,
  "totalCommitsThisWeek": 8,
  "totalPRsOpen": 3,
  "totalPRsMergedAllTime": 12,
  "totalPRsClosed": 2,
  "activeDaysThisMonth": 15,
  "productivityTrendPercent": 25
}
```

### PR Sync Response
```json
{
  "message": "Pull requests synced successfully",
  "syncedCount": 42,
  "pages": 1
}
```

### PR Stats Response
```json
{
  "totalPRs": 42,
  "openPRs": 3,
  "mergedPRs": 37,
  "closedNotMergedPRs": 2,
  "avgReviewTimeMinutes": 240
}
```

### Weekly Stats Response
```json
[
  {
    "week_start": "2024-06-03",
    "prs_created": 5,
    "prs_merged": 4,
    "avg_review_time": 210
  },
  {
    "week_start": "2024-05-27",
    "prs_created": 3,
    "prs_merged": 3,
    "avg_review_time": 180
  }
]
```

### PR Records Response
```json
[
  {
    "id": 1,
    "repo_id": 1,
    "github_pr_id": 123,
    "title": "Add user authentication",
    "state": "closed",
    "additions": 245,
    "deletions": 89,
    "changed_files": 5,
    "comments": 8,
    "review_comments": 3,
    "created_at": "2024-06-01T10:30:00Z",
    "merged_at": "2024-06-02T14:20:00Z",
    "closed_at": "2024-06-02T14:20:00Z",
    "user": "john_doe",
    "reviewers": ["jane_smith", "bob_jones"],
    "review_time_minutes": 1530
  }
]
```

---

## Troubleshooting

### Issue: PRs not syncing

**Check:**
- User has GitHub token stored
- Repository is actually tracked in database
- GitHub API is accessible (not rate limited)
- Check server logs for detailed error messages

**Solution:**
```bash
# Check server logs
tail -f server_logs.txt

# Verify database has repository
SELECT * FROM repositories WHERE user_id = 1;

# Manually test GitHub API
curl -H "Authorization: token YOUR_GITHUB_TOKEN" \
  "https://api.github.com/repos/OWNER/REPO/pulls?state=all&per_page=100"
```

### Issue: Review time is NULL

**Cause:** PR is still open (`merged_at` is NULL)

**Fix:** Only review time for merged PRs is calculated. Open PRs will have NULL review_time.

### Issue: Stats endpoint returns 404

**Check:**
- Repository ID is correct
- User owns/tracks the repository
- Auth token is valid

---

## Next Steps: Frontend Implementation

After backend is verified:

1. **Dashboard Updates** - Add PR stats cards
2. **RepositoryAnalytics** - Add PR table with details
3. **PR Charts** - Weekly PR count and merge rate
4. **Sync UI** - Add button to manually sync PRs
5. **Alerts & Notifications** - Show when sync completes

See `FRONTEND_IMPLEMENTATION.md` for details.

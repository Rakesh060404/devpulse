# DevPulse Production Deployment Checklist

## Phase 1: CRITICAL FIXES ✅ COMPLETED

- [x] **Webhook Signature Verification** - Fixed raw body capture before JSON parsing
- [x] **Dashboard Stats Endpoint** - Created `/api/stats/dashboard` for live aggregations
- [x] **Dashboard Live Data** - Replaced hardcoded values with API calls
- [x] **Repository Metadata** - `getRepo()` now fetches stars/forks/language from GitHub
- [x] **Real-Time Polling** - Dashboard polls every 30 seconds for updates
- [x] **Error Middleware** - Global error handler returns clean JSON responses
- [x] **OpenAI Fallback** - Proper error handling for quota/rate limits/model errors
- [x] **Error Boundaries** - Frontend React error boundary prevents full page crashes
- [x] **RepoCard Schema** - Handles both GitHub and tracked repo field formats
- [x] **Webhook All Branches** - Accepts commits from feature branches (not just main/master)

---

## Phase 2: FRONTEND VALIDATION

### Authentication Flow
```
[ ] User logs in via GitHub OAuth
[ ] Token returned in URL query param
[ ] Token stored in localStorage
[ ] Dashboard loads after token received
[ ] Navigation shows authenticated user
[ ] Logout clears token and redirects to login
```

### Dashboard Page
```
[ ] Dashboard displays after login
[ ] All 4 stat cards show real numbers (not "1,234")
[ ] Stats update when you push commits
[ ] Stats auto-refresh every 30 seconds
[ ] Tracked repos list shows actual repos
[ ] "Track" button visible on available repos
[ ] No console errors on page load
[ ] Error messages display if API fails
```

### Repositories Page
```
[ ] Lists available GitHub repositories
[ ] Shows repository metadata (stars, forks, date)
[ ] "Track" button works for untracked repos
[ ] Tracked repos section shows tracked items
[ ] Navigation between pages doesn't lose state
```

### Repository Analytics Page
```
[ ] Clicking repo name shows analytics page
[ ] Repository header shows correct stats
[ ] No "undefined" values for stars/forks/language
[ ] Commit activity chart displays
[ ] PR analytics show open/merged/closed counts
[ ] "Generate Summary" button works
[ ] Error messages appear if generation fails
```

### Analytics Page
```
[ ] Lists tracked repositories in sidebar
[ ] Clicking repo loads its summaries
[ ] "Generate Summary" button disabled if no repo selected
[ ] Summary generation shows success/error message
[ ] Retry button appears on error
[ ] Previous summaries display chronologically
```

---

## Phase 3: BACKEND VALIDATION

### Auth Endpoints
```
[ ] GET /api/auth/github - Redirects to GitHub OAuth
[ ] GET /api/auth/github/callback - Returns redirect with token
[ ] GET /api/protected - Returns 401 without token
[ ] GET /api/protected - Returns user data with token
```

### Repository Endpoints
```
[ ] GET /api/repos - Lists GitHub repos (with pagination)
[ ] GET /api/repos/tracked - Lists tracked repos
[ ] GET /api/repos/:id - Returns repo with stats
[ ] POST /api/repos - Tracks new repo
[ ] DELETE /api/repos/:id - Untracks repo
```

### Stats Endpoint
```
[ ] GET /api/stats/dashboard - Returns aggregated stats
[ ] Stats include: total commits, total PRs, active days
[ ] Stats computed from actual database data
[ ] Productivity trend calculates correctly
```

### Commits Endpoints
```
[ ] GET /api/commits/:repoId - Lists repo commits
[ ] POST /api/commits/sync/:repoId - Syncs latest commits
[ ] Commits include: sha, message, author, date
[ ] No duplicate commits after sync
```

### PR Endpoints
```
[ ] GET /api/prs/:repoId - Lists repo PRs
[ ] POST /api/prs/sync/:repoId - Syncs latest PRs
[ ] PRs include: title, state, additions, deletions, reviewers
[ ] GET /api/prs/analytics/:repoId - Returns PR analytics
```

### Summaries Endpoints
```
[ ] GET /api/summaries/:repoId - Lists past summaries
[ ] POST /api/summaries/generate/:repoId - Generates new summary
[ ] Summary includes week_start, week_end, summary_text
[ ] Fallback summary generated if OpenAI fails
[ ] Error message returned if generation fails
```

### Webhooks Endpoint
```
[ ] POST /api/webhooks/github - Accepts GitHub webhook
[ ] Invalid signature returns 401
[ ] Valid signature returns 200
[ ] Push events add commits to database
[ ] PR events add/update PRs in database
[ ] Ping events acknowledged correctly
```

---

## Phase 4: DATABASE VALIDATION

### Schema Verification
```
[ ] All tables exist (users, repositories, commits, pull_requests, weekly_summaries)
[ ] Foreign key constraints properly set up
[ ] Unique constraints prevent duplicates
[ ] All indexes created for performance
```

### Data Integrity
```
[ ] User created on first GitHub login
[ ] Repository tracked with all metadata
[ ] Commits synced without duplicates
[ ] PRs upserted (not duplicated)
[ ] Summaries stored with analytics
```

### Performance Tests
```
[ ] Dashboard loads in < 1 second with 100+ commits
[ ] Stats computation completes in < 500ms
[ ] Repo list returns in < 1 second
```

---

## Phase 5: INTEGRATION TESTS

### End-to-End Flow
```
[ ] GitHub Login → Token → Dashboard Load
[ ] Track Repo → Sync Commits → Commits Appear
[ ] Commits Appear → Dashboard Updates
[ ] Generate Summary → Summary Appears
[ ] Webhook Receives Push → Commits Auto-Add
[ ] Logout → Redirected to Login
```

### Error Scenarios
```
[ ] API error 500 → User sees readable error message
[ ] Network error → Page shows error state with retry
[ ] Invalid token → User redirected to login
[ ] OpenAI quota exceeded → Fallback summary shown
[ ] Database connection failed → Clear error message
```

### Concurrent Usage
```
[ ] Multiple users don't see each other's data
[ ] User A's repos isolated from User B
[ ] Concurrent API requests don't crash server
```

---

## Phase 6: DEPLOYMENT VALIDATION

### Docker Setup
```
[ ] docker-compose build - Builds without errors
[ ] docker-compose up - Starts all services
[ ] Services are healthy (mysql, backend, optional frontend)
[ ] Volumes mounted correctly
```

### Environment
```
[ ] .env file has all required variables
[ ] GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET valid
[ ] OPENAI_API_KEY valid
[ ] WEBHOOK_SECRET set (matching GitHub settings)
[ ] JWT_SECRET unique and secure
[ ] DB credentials match docker-compose
```

### Security
```
[ ] JWT tokens have 7-day expiration
[ ] Webhook signatures verified
[ ] CORS restricted to allowed origins
[ ] Database credentials not in version control
[ ] API keys not logged or exposed
```

---

## Phase 7: PERFORMANCE CHECKLIST

### Frontend
```
[ ] Dashboard loads in < 2 seconds
[ ] No console warnings or errors
[ ] No memory leaks on page navigation
[ ] Polling requests don't exceed rate limits
```

### Backend
```
[ ] Response times < 500ms for GET endpoints
[ ] Batch operations (stats) < 1 second
[ ] Database queries use indexes efficiently
[ ] No N+1 query problems
[ ] Error responses return in < 100ms
```

---

## Phase 8: MONITORING & LOGGING

### Backend Logs
```
[ ] Errors logged with full stack trace
[ ] API requests logged (optional: in debug mode)
[ ] Webhook events logged with delivery ID
[ ] Database errors logged with context
```

### Frontend Errors
```
[ ] Console errors captured and reported
[ ] Network errors logged with response status
[ ] Unhandled rejections caught
```

---

## SIGN-OFF CHECKLIST

Before marking as production-ready:

- [ ] All Phase 1-8 items completed and tested
- [ ] Code reviewed for security issues
- [ ] Database schema initialized in target environment
- [ ] Environment variables configured correctly
- [ ] Webhooks configured in GitHub repo settings
- [ ] GitHub OAuth app credentials verified
- [ ] OpenAI API key valid and has quota
- [ ] Team trained on common issues
- [ ] Monitoring/alerting set up
- [ ] Backup/recovery plan documented
- [ ] Deployment runbook created
- [ ] Rollback procedure tested

---

## Quick Troubleshooting

### Dashboard shows no data
1. Check browser console for errors
2. Verify token in localStorage
3. Check backend logs for API errors
4. Verify database connection

### Webhooks not working
1. Verify X-Hub-Signature-256 in webhook headers
2. Check GitHub webhook delivery logs
3. Ensure WEBHOOK_SECRET matches
4. Check backend webhook logs

### OpenAI summaries failing
1. Verify API key is valid
2. Check account has available quota
3. Review error message in logs
4. Fallback summary should still generate

### Authentication issues
1. Check GitHub OAuth credentials
2. Verify callback URL matches repo settings
3. Check JWT_SECRET in env file
4. Clear browser localStorage and try again

---

**Last Updated:** 2024-05-21
**Status:** Ready for Phase 8 Validation

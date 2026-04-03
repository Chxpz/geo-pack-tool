# Operator Standard Operating Procedure (SOP)

This document provides step-by-step instructions for operators to manage AI mention data imports from Otterly (external data provider) into the AgenticRev ICP Pivot platform.

## Overview

The operator workflow has three main phases:
1. **Export Phase:** Extract mention data from Otterly dashboard
2. **Import Phase:** Load CSV into AgenticRev admin panel
3. **Monitoring Phase:** Track task queue and verify data integrity

## Prerequisites

- Active Otterly account with data access
- Operator role assigned in AgenticRev admin panel
- CSV import capability enabled
- Access to admin dashboard at `/admin/import`

## Phase 1: Export from Otterly Dashboard

### Step 1.1: Log into Otterly

1. Navigate to [otterly.com](https://otterly.com)
2. Click "Login"
3. Enter operator email and password
4. Verify two-factor authentication (if enabled)

### Step 1.2: Select Data to Export

1. In Otterly dashboard, navigate to **Mentions** or **AI Visibility**
2. Select your target account/business
3. Choose date range:
   - **Recent data:** Last 7 days
   - **Full refresh:** Last 30 days (for weekly audits)
   - **Historical:** Custom date range
4. Optional: Filter by status (all, verified, needs review, archived)

### Step 1.3: Export as CSV

1. Click **Export** button (usually in top-right)
2. Select format: **CSV** (not Excel)
3. Choose output columns:
   - Business ID (required)
   - Query/Search Term (required)
   - Platform (ChatGPT, Google AI, Perplexity, Claude, Bing, etc.)
   - URL (required)
   - Source Title (optional)
   - Citation Text/Snippet (optional)
   - Visibility Score (0-100, optional)
   - Ranking Position (optional)
   - Date/Timestamp (required)
   - Status (new, verified, updated, removed)

4. Click **Export** to download CSV file
5. Verify file downloaded to your local machine

### Step 1.4: Validate CSV File

Before importing, validate the CSV:

**Required columns:**
```
business_id,query,platform,url,created_at
```

**Example CSV format:**
```csv
business_id,query,platform,url,source_title,snippet,visibility_score,ranking_position,created_at,status
biz-123,ai visibility tools,chatgpt,https://example.com/page1,Example Page,We recommend...,85,3,2026-04-01T10:00:00Z,verified
biz-123,visibility platform,google-ai,https://example.com/page2,Another Page,Best tools for...,75,5,2026-04-01T11:00:00Z,new
biz-456,business ai mentions,perplexity,https://competitor.com/page,Competitor Blog,Companies like...,60,1,2026-04-01T12:00:00Z,verified
```

**Validation checklist:**
- [ ] All rows have required columns (business_id, query, platform, url, created_at)
- [ ] business_id values exist in AgenticRev system
- [ ] All URLs are valid and absolute (start with http/https)
- [ ] Timestamps are ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ)
- [ ] Platform values are valid: chatgpt, google-ai, perplexity, claude, bing
- [ ] No extra spaces in column headers
- [ ] File is UTF-8 encoded

## Phase 2: Import into AgenticRev

### Step 2.1: Access Admin Import Panel

1. Log into AgenticRev with operator account
2. Navigate to **Admin Panel** (if visible) or `/admin/import`
3. Verify you see "Import AI Mentions" heading
4. Check your role shows as "operator" or "admin"

**Access requirements:**
- Must have `role = 'operator'` or `role = 'admin'` in database
- Session must be active (not expired)
- Browser cookies enabled

### Step 2.2: Upload CSV File

1. Click **Choose File** button
2. Navigate to your downloaded CSV file
3. Click **Open** to select the file
4. Verify filename appears in the upload area

**File size limits:**
- Maximum: 50 MB per file
- Recommended: < 10 MB (≈10,000 rows)
- For large datasets: Split into multiple files

### Step 2.3: Configure Import Options

Before submitting, configure import behavior:

```
[ ] Skip duplicates (recommended: checked)
    → Won't re-import mentions already in system

[ ] Overwrite existing data (default: unchecked)
    → Only check if updating historical data

[ ] Mark all as verified (default: checked)
    → Trust Otterly's data quality
```

### Step 2.4: Submit Import

1. Review the preview table (first 10 rows)
2. Verify columns mapped correctly:
   - Business ID → `business_id`
   - Query → `query`
   - Platform → `platform`
   - URL → `url`
   - Date → `created_at`
3. Click **Start Import** button
4. System begins processing (may take several minutes for large files)

### Step 2.5: Monitor Import Progress

After submitting:

1. **Wait for job to start** (typically < 30 seconds)
2. You'll see a **Job ID** displayed: `job-abc123def456`
3. Status updates in real-time:
   - `Processing: 45/1000 rows` (in progress)
   - `Completed: 950 rows imported, 50 skipped` (done)
   - `Failed: Error in row 500: Invalid business_id` (error)

### Step 2.6: Handle Import Errors

**Common errors and solutions:**

| Error | Cause | Solution |
|-------|-------|----------|
| `Invalid business_id` | ID doesn't exist in system | Verify business exists in AgenticRev before importing |
| `Invalid date format` | Timestamp not ISO 8601 | Use format: `2026-04-01T10:00:00Z` |
| `Duplicate URL` | Same URL for same business | Enable "Skip duplicates" option |
| `Invalid platform` | Platform name misspelled | Check against valid list: chatgpt, google-ai, perplexity, claude, bing |
| `File too large` | CSV exceeds size limit | Split file into multiple imports |

## Phase 3: Monitor Task Queue

### Step 3.1: View Import History

1. In admin panel, navigate to **Import History** tab
2. See list of recent imports with:
   - **Job ID:** Unique identifier
   - **Date:** When imported
   - **Status:** Success, Partial, Failed
   - **Rows:** Count imported/skipped/failed

### Step 3.2: Check Data Integration

After import completes, verify data appears in dashboard:

1. Navigate to **Dashboard** (`/dashboard`)
2. Check **Top Queries** section:
   - Should show queries from import
   - Recent timestamps should match imported dates
3. Check **Platform Breakdown**:
   - Should include platforms from your import
4. Check **Competitor Comparison** (if applicable)

### Step 3.3: Monitor Task Queue

1. Go to **Admin Panel** → **Task Queue**
2. See active and queued import jobs:
   - Green = Success
   - Yellow = In Progress
   - Red = Failed
   - Gray = Queued (waiting)

3. Click any job to see:
   - Full error messages
   - Row-by-row details
   - Performance metrics (rows/second)

### Step 3.4: Troubleshooting Failed Imports

**If import fails:**

1. Click the failed job ID
2. Read error message carefully
3. Note the **first row with error**
4. Download the CSV again and fix issue:
   - Check date format
   - Verify business IDs
   - Validate platform names
   - Remove special characters if needed

5. **Re-run import:**
   - Upload corrected CSV
   - Enable "Skip duplicates" to prevent re-importing good rows
   - Submit

**If stuck:**
- Check error logs in `/admin/import/logs`
- Contact system administrator
- Provide job ID and error message

## SLA Expectations by Plan

Import performance depends on user's subscription plan:

### Free Plan
- **Daily imports:** Up to 1
- **Rows per import:** 1,000 max
- **Processing time:** Up to 24 hours
- **Data retention:** 7 days
- **Support:** Community forum only

### Starter Plan
- **Daily imports:** Up to 3
- **Rows per import:** 10,000 max
- **Processing time:** 4 hours
- **Data retention:** 30 days
- **Support:** Email support (48 hour response)

### Professional Plan
- **Daily imports:** Up to 10
- **Rows per import:** 50,000 max
- **Processing time:** 1 hour
- **Data retention:** 90 days
- **Support:** Priority support (4 hour response)

### Enterprise Plan
- **Daily imports:** Unlimited
- **Rows per import:** Unlimited
- **Processing time:** Real-time (< 5 min)
- **Data retention:** 12 months
- **Support:** Dedicated account manager

## Best Practices

### Data Quality

- [ ] **Validate CSV before import** - Use the validation checklist above
- [ ] **Use consistent formats** - Always use ISO 8601 dates
- [ ] **Include timestamps** - More precise than date alone
- [ ] **Verify URLs** - Ensure all URLs are absolute (start with http/https)

### Workflow Optimization

- [ ] **Schedule imports** - Do full refreshes weekly, not daily
- [ ] **Batch small imports** - Combine < 1000 rows into single import
- [ ] **Monitor SLA** - Check expected completion time before proceeding
- [ ] **Document issues** - Keep log of problems for troubleshooting

### Error Prevention

- [ ] **Test with small file first** - Import 100 rows before large batch
- [ ] **Enable skip duplicates** - Prevent data duplication
- [ ] **Verify business IDs** - Ensure all exist in AgenticRev before importing
- [ ] **Check date range** - Don't re-import same period multiple times

### After Import

- [ ] **Verify in dashboard** - Confirm data appears correctly
- [ ] **Check for anomalies** - Look for unexpected numbers or missing data
- [ ] **Monitor performance** - Ensure no dashboard slowdown
- [ ] **Archive old files** - Delete CSV after confirmed import

## Troubleshooting Guide

### Import Appears Stuck

**Symptoms:** Status shows "Processing" for > 30 minutes

**Solutions:**
1. Refresh page (browser F5)
2. Check job ID in **Task Queue** tab
3. If status shows "Completed" but UI didn't update, import succeeded
4. If still shows "Processing," wait up to plan's SLA time
5. Contact admin if > 2 hours

### Missing Data After Import

**Symptoms:** CSV imported but data doesn't appear in dashboard

**Solutions:**
1. Verify import marked as "Success" (not "Partial")
2. Check **Top Queries** for your search terms
3. Verify date range in dashboard matches import dates
4. Check business ID is correct
5. If using competitor data, verify competitor added first

### Duplicate Data

**Symptoms:** Same mentions appear multiple times

**Solutions:**
1. Enable "Skip duplicates" for future imports
2. Contact admin to de-duplicate existing data
3. Don't re-import same CSV file multiple times

### CSV Upload Fails

**Symptoms:** Can't select/upload file

**Solutions:**
1. Ensure file is CSV format (not Excel .xlsx)
2. Check file size is < 50 MB
3. Verify UTF-8 encoding
4. Try different browser
5. Clear browser cache and try again

## Quick Reference

### CSV Format Checklist

```
Headers (required):
- business_id (UUID format)
- query (text)
- platform (chatgpt, google-ai, perplexity, claude, bing)
- url (valid http/https URL)
- created_at (ISO 8601: 2026-04-01T10:00:00Z)

Optional headers:
- source_title (string)
- snippet (text excerpt)
- visibility_score (0-100 integer)
- ranking_position (integer)
- status (new, verified, updated, removed)
```

### Import URL

```
https://your-domain.com/admin/import
```

### Support Contact

For import issues:
- **Email:** support@agenticrev.com
- **Status page:** https://status.agenticrev.com
- **Admin logs:** `/admin/import/logs`

## Changelog

### Version 2.0 (April 2026)
- Added plan-based SLA expectations
- Added troubleshooting guide
- Added data quality validation section
- Support for 5 platforms (added Claude, Bing)

### Version 1.0 (March 2026)
- Initial SOP
- Basic import workflow
- Error handling guide

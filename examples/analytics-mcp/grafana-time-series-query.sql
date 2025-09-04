-- Option 1: Use the date dimension for time series
SELECT 
  blob3 as date,
  double1 as prs_created,
  double2 as prs_merged,
  double3 as prs_closed
FROM github_stats 
WHERE blob2 = 'daily_pr_stats'
ORDER BY blob3

-- Option 2: Create artificial timestamps using days_ago
SELECT 
  timestamp - (double4 * 86400) as historical_timestamp,
  double1 as prs_created,
  double2 as prs_merged,
  double3 as prs_closed
FROM github_stats 
WHERE blob2 = 'daily_pr_stats'
ORDER BY historical_timestamp

-- Option 3: Simple trend by order (what you have now)
SELECT 
  ROW_NUMBER() OVER (ORDER BY timestamp) as day_number,
  double1 as prs_created,
  double2 as prs_merged,
  double3 as prs_closed
FROM github_stats 
WHERE blob2 = 'daily_pr_stats'
ORDER BY timestamp

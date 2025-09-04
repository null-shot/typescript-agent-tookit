-- Query 1: See all your data
SELECT * FROM github_stats WHERE blob2 = 'daily_pr_stats' LIMIT 10;

-- Query 2: Check what's in blob3 (should be dates)
SELECT DISTINCT blob3 FROM github_stats WHERE blob2 = 'daily_pr_stats';

-- Query 3: Count records
SELECT COUNT(*) as total_records FROM github_stats WHERE blob2 = 'daily_pr_stats';

-- Query 4: See the structure
SELECT 
  timestamp,
  blob1, blob2, blob3, blob4,
  double1, double2, double3
FROM github_stats 
WHERE blob2 = 'daily_pr_stats'
ORDER BY timestamp;

-- Query 5: If dates are in blob3, try this for time series
SELECT 
  blob3 as date,
  double1 as prs_created,
  double2 as prs_merged,
  double3 as prs_closed
FROM github_stats 
WHERE blob2 = 'daily_pr_stats' AND blob3 IS NOT NULL
ORDER BY blob3;

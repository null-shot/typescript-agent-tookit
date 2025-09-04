-- WORKING QUERIES FOR GRAFANA CLICKHOUSE PLUGIN

-- Query 1: Basic data check (should work)
SELECT COUNT() FROM github_stats;

-- Query 2: See all available data 
SELECT timestamp, blob1, blob2, double1, double2, double3 
FROM github_stats 
LIMIT 10;

-- Query 3: PR data with proper time field for Grafana
SELECT 
  timestamp as time,
  double1 as value
FROM github_stats 
WHERE double1 > 0
ORDER BY timestamp;

-- Query 4: Multiple metrics (if single metric works)
SELECT 
  timestamp as time,
  'prs_created' as metric,
  double1 as value
FROM github_stats 
WHERE double1 > 0
UNION ALL
SELECT 
  timestamp as time,
  'prs_merged' as metric, 
  double2 as value
FROM github_stats 
WHERE double2 > 0
ORDER BY time;

-- Query 5: Simple table view (guaranteed to work)
SELECT 
  double1 as prs_created,
  double2 as prs_merged,
  double3 as prs_closed
FROM github_stats 
WHERE double1 > 0 OR double2 > 0 OR double3 > 0
LIMIT 20;

# 📊 Final Working Dashboard Setup

## 🎯 Two Separate Panels Setup

### **Panel 1: NullShot Repository (Your Original Clean Data)**
```sql
SELECT blob3, double1, double2, double3 
FROM github_stats 
WHERE blob2 = 'daily_pr_stats_clean' 
ORDER BY blob3
```

**Configuration:**
- **Time field**: `blob3`
- **Panel title**: "NullShot/TypeScript Agent Framework Activity"
- **Legend mapping**:
  - `double1` → "PRs Created" (Green)
  - `double2` → "PRs Merged" (Blue) 
  - `double3` → "PRs Closed" (Orange)

### **Panel 2: Anthropics Repository (GitHub API Data)**
```sql
SELECT blob3, double1, double2, double3, double4, double5 
FROM github_stats 
WHERE blob2 = 'github_daily_stats' 
ORDER BY blob3
```

**Configuration:**
- **Time field**: `blob3`
- **Panel title**: "Anthropics/Claude-Code Activity"
- **Legend mapping**:
  - `double1` → "PRs Created" (Green)
  - `double2` → "PRs Merged" (Blue)
  - `double3` → "PRs Closed" (Orange)
  - `double4` → "Issues Created" (Purple)
  - `double5` → "Issues Closed" (Red)

## 🎨 Grafana Setup Steps

### **Step 1: Create Panel 1 (NullShot)**
1. Add new panel
2. Set data source to your Analytics MCP
3. Use the NullShot query above
4. Go to **Field** tab → **Overrides**
5. Add field overrides for double1, double2, double3 with display names
6. Set panel title: "NullShot Repository Activity"

### **Step 2: Create Panel 2 (Anthropics)**  
1. Add another panel
2. Use the Anthropics query above
3. Add field overrides for all 5 doubles with display names
4. Set panel title: "Anthropics Repository Activity"

### **Step 3: Dashboard Layout**
- Place panels side by side or stack vertically
- Use consistent time ranges
- Add dashboard title: "Multi-Repository GitHub Analytics"

## 📈 Expected Results

### **Panel 1 (NullShot)**: 
- 22 unique dates from 2025-08-06 to 2025-09-04
- Realistic PR activity patterns with weekend dips
- 3 trend lines showing PR lifecycle

### **Panel 2 (Anthropics)**:
- Recent GitHub activity from anthropics/claude-code
- 5 trend lines showing both PRs and Issues
- Real data from one of the most active AI repositories

## 🔄 Adding More Repositories

To add any other repository:

1. **Modify the collector script**:
   ```javascript
   const REPOSITORIES = [
     { owner: 'null-shot', name: 'typescript-agent-framework' },
     { owner: 'anthropics', name: 'claude-code' },
     { owner: 'your-org', name: 'your-repo' }  // Add here
   ];
   ```

2. **Run the collector**: `node github-multi-repo-collector.js`

3. **Add new panel** with query:
   ```sql
   SELECT blob3, double1, double2, double3, double4, double5 
   FROM github_stats 
   WHERE blob1 = 'your-org/your-repo' AND blob2 = 'github_activity'
   ORDER BY blob3
   ```

## 🎯 Why This Works

- **Different blob2 values** separate the data sources
- **blob1** contains the repository identifier  
- **blob3** contains the date for time series
- **double1-5** contain the metrics
- **No aliases needed** - works with Analytics Engine limitations

Your dashboard now shows:
✅ **NullShot**: Simulated trending data over 30 days
✅ **Anthropics**: Real GitHub activity data
✅ **Easy expansion**: Add any repository with minimal changes

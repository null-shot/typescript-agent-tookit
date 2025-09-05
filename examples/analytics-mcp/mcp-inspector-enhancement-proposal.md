# MCP Inspector Enhancement Proposal

## 🎯 **Feature Request: JSON Mode for Tool Arguments**

### **Current State:**
- Users fill individual form fields for each tool parameter
- Complex nested objects require multiple field entries
- Documentation shows JSON but users must manually map to fields

### **Proposed Enhancement:**
Add a **JSON Mode toggle** to tool argument forms:

#### **Form Mode (Current):**
```
Dataset: [text field]
Dimensions: [nested form fields]
Metrics: [nested form fields]
```

#### **JSON Mode (Proposed):**
```json
{
  "dataset": "github_stats",
  "dimensions": {
    "repo": "null-shot/typescript-agent-framework",
    "event_type": "test_pr_data",
    "date": "2025-09-05"
  },
  "metrics": {
    "prs_created": 3,
    "prs_merged": 2,
    "prs_closed": 0
  }
}
```

### **Benefits:**
- ✅ **Copy-paste from documentation** - Direct JSON examples
- ✅ **Faster testing** - No field-by-field entry
- ✅ **Complex objects** - Easy nested structure input
- ✅ **Developer friendly** - Matches API documentation format

### **Implementation Ideas:**
- **Toggle button**: "Form Mode" ↔ "JSON Mode"
- **Validation**: Parse JSON and show errors
- **Conversion**: Switch between modes with data preservation
- **Syntax highlighting**: JSON editor with proper formatting

### **Use Cases:**
- **Analytics tools**: Complex dimensions/metrics objects
- **Batch operations**: Arrays of data points
- **Testing**: Quick copy-paste from documentation examples
- **Development**: Rapid iteration with JSON payloads

This enhancement would significantly improve the MCP Inspector user experience for complex tools like the Analytics MCP example.

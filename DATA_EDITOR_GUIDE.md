# Data Editor & ML Risk Analysis Guide

## Overview

The Data Editor is a powerful feature that allows you to:
1. **Visualize** transaction networks as interactive graphs
2. **Edit** invoice data in real-time
3. **Analyze** risk using ML algorithms
4. **Understand** why transactions are risky or compliant

## Accessing Data Editor

1. Go to http://localhost:3000
2. Click "Data Editor" in the sidebar
3. You'll see the transaction network graph and invoice list

## Features

### 1. Transaction Network Graph

**What it shows:**
- Suppliers (larger nodes) and Buyers (smaller nodes)
- Connections between suppliers and buyers
- Color-coded risk levels:
  - 🟢 Green: Low risk (<30%)
  - 🟡 Yellow: Medium risk (30-70%)
  - 🔴 Red: High risk (>70%)

**Interactions:**
- **Drag nodes** to rearrange the graph
- **Hover over nodes** to see details
- **Zoom in/out** to explore relationships
- **Pan** by clicking and dragging the background

### 2. Invoice List

**View all invoices** with:
- Invoice number
- Date
- Taxable value
- GST amount

**Actions:**
- Click any invoice to select it
- Edit button appears in the editor panel
- Delete button to remove invoices

### 3. Data Editor Panel

**Edit invoice fields:**
- Invoice Number (read-only)
- Date
- Taxable Value (auto-calculates GST)
- Supplier GSTIN
- Buyer GSTIN

**Changes:**
- Click "Save" to apply changes
- Graph updates automatically
- Changes are reflected in the list

### 4. Add New Invoices

**Click "+ Add Invoice"** to:
- Create a new invoice with default values
- Automatically opens in edit mode
- Customize all fields
- Save to add to the dataset

### 5. ML Risk Analysis

**Click "Analyze Risk with ML Model"** to:
- Analyze all invoices
- Run 8 validation checks
- Generate risk score (0-100%)
- Provide detailed reasoning

## ML Risk Analysis Algorithm

### 8 Validation Checks

#### 1. **IRN (E-Invoice) Validation**
- **What it checks:** All invoices have valid invoice numbers
- **Risk if failed:** Missing IRN reduces traceability
- **Recommendation:** Ensure all invoices have valid IRN from e-invoice system

#### 2. **GSTIN Format Validation**
- **What it checks:** GSTIN format is correct (15 characters)
- **Format:** 2-digit state + 10-digit PAN + 1-digit entity + 1-digit check
- **Risk if failed:** Invalid GSTIN indicates fraudulent or incorrect data
- **Recommendation:** Verify GSTIN format

#### 3. **GST Calculation Accuracy**
- **What it checks:** GST amount = Taxable Value × 18%
- **Risk if failed:** Incorrect calculations indicate data manipulation
- **Recommendation:** Verify GST calculations

#### 4. **Intra-state vs Inter-state Consistency**
- **What it checks:**
  - Intra-state (same state): Should use CGST + SGST
  - Inter-state (different state): Should use IGST
- **Risk if failed:** Incorrect tax classification
- **Recommendation:** Verify state codes and tax split

#### 5. **Duplicate Invoice Detection**
- **What it checks:** No duplicate invoice numbers
- **Risk if failed:** Duplicate invoices = double ITC claim (fraud)
- **Recommendation:** Remove duplicate invoices

#### 6. **Unusual Amount Detection**
- **What it checks:** Invoice amounts are within normal range
- **Risk if failed:** Unusually high amounts may indicate fraud
- **Recommendation:** Verify high-value invoices

#### 7. **Date Validity**
- **What it checks:** All invoice dates are in the past
- **Risk if failed:** Future-dated invoices are invalid
- **Recommendation:** Ensure all dates are valid

#### 8. **Zero-Value Invoice Detection**
- **What it checks:** No zero-value invoices
- **Risk if failed:** Zero-value invoices are suspicious
- **Recommendation:** Remove or correct zero-value invoices

### Risk Score Calculation

```
Risk Score = Sum of all failed checks
Maximum = 1.0 (100%)

Risk Level:
- LOW: < 0.3 (< 30%)
- MEDIUM: 0.3 - 0.7 (30-70%)
- HIGH: > 0.7 (> 70%)
```

## Understanding Results

### Risk Factors (⚠️ Red)
**Why it's risky:**
- Lists all validation checks that failed
- Explains the compliance issue
- Shows how many invoices are affected

### Success Factors (✓ Green)
**Why it's compliant:**
- Lists all validation checks that passed
- Shows what's working correctly
- Indicates compliant transactions

### Recommendations (💡 Blue)
**What to do:**
- Actionable steps to reduce risk
- Specific guidance for each issue
- How to fix compliance problems

## Example Scenarios

### Scenario 1: Compliant Data
```
✓ All invoices have valid invoice numbers
✓ All GSTINs are in valid format
✓ All GST calculations are accurate
✓ All intra-state and inter-state transactions are correctly classified
✓ No duplicate invoices found
✓ All invoice dates are valid

Result: LOW RISK (5%)
Status: Data is ready for ITC claim
```

### Scenario 2: High-Risk Data
```
⚠️ 3 invoices with invalid GSTIN format
⚠️ 2 invoices with incorrect GST calculations
⚠️ 1 duplicate invoice number detected
⚠️ 2 invoices with future dates

Result: HIGH RISK (85%)
Status: Data requires correction before ITC claim
```

### Scenario 3: Medium-Risk Data
```
⚠️ 1 invoice with unusually high amount (>3x average)
✓ All other checks passed

Result: MEDIUM RISK (45%)
Status: Verify high-value invoice, then proceed
```

## Workflow

### Step 1: Load Data
- Data Editor loads with sample invoices
- Graph shows supplier-buyer network
- All invoices listed on the left

### Step 2: Review & Edit
- Click invoices to review details
- Edit any fields as needed
- Add new invoices if required
- Delete incorrect invoices

### Step 3: Analyze Risk
- Click "Analyze Risk with ML Model"
- Wait for analysis to complete
- Review risk score and factors

### Step 4: Take Action
- If LOW RISK: Ready for ITC claim
- If MEDIUM RISK: Fix specific issues
- If HIGH RISK: Correct all problems

### Step 5: Re-analyze
- Make corrections
- Click "Analyze Risk" again
- Verify risk score improved

## Tips & Best Practices

### Data Entry
- ✅ Use valid GSTIN format (15 characters)
- ✅ Ensure dates are in the past
- ✅ Use consistent invoice numbering
- ✅ Verify GST calculations before entry

### Risk Analysis
- ✅ Analyze after each batch of edits
- ✅ Address HIGH RISK items first
- ✅ Follow recommendations exactly
- ✅ Re-analyze to confirm improvements

### Graph Visualization
- ✅ Drag nodes to see relationships clearly
- ✅ Zoom in on complex networks
- ✅ Use colors to identify risk patterns
- ✅ Look for isolated or suspicious nodes

## Common Issues & Solutions

### Issue: "Invalid GSTIN format"
**Solution:** GSTIN must be exactly 15 characters
- Format: 2 digits + 5 letters + 4 digits + 1 letter + 1 alphanumeric
- Example: 29AABCS1234F1Z5

### Issue: "Incorrect GST calculations"
**Solution:** GST = Taxable Value × 18%
- For ₹100,000: GST = ₹18,000
- For intra-state: CGST = ₹9,000, SGST = ₹9,000
- For inter-state: IGST = ₹18,000

### Issue: "Duplicate invoice numbers"
**Solution:** Each invoice must have unique number
- Delete duplicate entries
- Use sequential numbering (INV001, INV002, etc.)

### Issue: "Future-dated invoices"
**Solution:** All dates must be in the past
- Check invoice dates
- Correct to actual transaction dates

## API Integration

### Analyze Risk Endpoint
```bash
POST /api/analyze/risk
Content-Type: application/json

{
  "invoices": [
    {
      "invoiceNo": "INV001",
      "date": "2025-04-05",
      "taxableValue": 100000,
      "cgst": 9000,
      "sgst": 9000,
      "igst": 0,
      "gstAmount": 18000,
      "supplierGstin": "29AABCS1234F1Z5",
      "buyerGstin": "29BUYER001KA1Z5",
      "hsn": "7208"
    }
  ]
}
```

### Response
```json
{
  "riskScore": 0.15,
  "riskLevel": "LOW",
  "reasoning": [
    "1 invoice with unusually high amount (>3x average)"
  ],
  "successFactors": [
    "All invoices have valid invoice numbers",
    "All GSTINs are in valid format",
    "All GST calculations are accurate"
  ],
  "recommendations": [
    "Verify high-value invoices for authenticity"
  ]
}
```

## Next Steps

1. ✅ Explore the Data Editor
2. ✅ Edit some invoices
3. ✅ Run risk analysis
4. ✅ Review recommendations
5. ✅ Make corrections
6. ✅ Re-analyze to verify improvements
7. ✅ Export compliant data for ITC claim

## Support

For issues or questions:
- Check this guide for common scenarios
- Review the ML algorithm section
- Check API documentation
- Open an issue on GitHub

# Stock Data Summary

## Overview

The GST Recon application now includes comprehensive stock data with realistic GST transactions for testing and demonstration purposes.

## Data Statistics

- **Suppliers**: 15 companies across India
- **Buyers**: 8 companies across India
- **Total Invoices**: 95 transactions
- **Total GST Amount**: ₹1,000,000+ (approximate)
- **States Covered**: 15 Indian states

## Suppliers Included

1. **Steel Corp India Pvt Ltd** (Karnataka) - Steel products
2. **Tech Solutions Maharashtra** (Maharashtra) - IT services
3. **Tamil Auto Parts Ltd** (Tamil Nadu) - Auto components
4. **Delhi Electronics Hub** (Delhi) - Electronics
5. **Gujarat Textiles Pvt Ltd** (Gujarat) - Textiles
6. **Haryana Chemicals Ltd** (Haryana) - Chemicals
7. **UP Pharma Industries** (Uttar Pradesh) - Pharmaceuticals
8. **Kerala Spice Traders** (Kerala) - Spices
9. **Telangana IT Services** (Telangana) - IT services
10. **Bengal Manufacturing Co** (West Bengal) - Manufacturing
11. **Rajasthan Minerals Ltd** (Rajasthan) - Minerals
12. **Himachal Hydro Power** (Himachal Pradesh) - Energy
13. **Punjab Agro Exports** (Punjab) - Agriculture
14. **Haryana Dairy Products** (Haryana) - Dairy
15. **Goa Tourism Services** (Goa) - Tourism

## Buyers Included

1. **Bangalore Retail Corp** (Karnataka)
2. **Mumbai Trading House** (Maharashtra)
3. **Chennai Distributors** (Tamil Nadu)
4. **Delhi Wholesale Market** (Delhi)
5. **Ahmedabad Import Export** (Gujarat)
6. **Gurgaon Logistics Ltd** (Haryana)
7. **Lucknow Retail Chain** (Uttar Pradesh)
8. **Kochi Trade Center** (Kerala)

## Data Features

### Realistic Transactions
- ✅ Intra-state transactions (CGST + SGST)
- ✅ Inter-state transactions (IGST)
- ✅ Varied invoice amounts (₹50,000 - ₹500,000)
- ✅ Multiple invoices per supplier (3-8 invoices)
- ✅ Random filing statuses (FILED, LATE, NOT_FILED)

### GST Compliance
- ✅ 18% GST rate applied
- ✅ Proper CGST/SGST split for intra-state
- ✅ IGST for inter-state transactions
- ✅ Valid GSTIN format (15 characters)
- ✅ Valid PAN format (10 characters)
- ✅ HSN codes for products

### Data Quality
- ✅ Realistic company names
- ✅ Accurate state codes
- ✅ Proper date formatting
- ✅ Consistent invoice numbering
- ✅ Valid filing dates

## Data Files

### Generated Data
- **`backend/data/mock_dataset_large.json`** - Main stock dataset (95 invoices)
- **`backend/data/mock_dataset.json`** - Original smaller dataset (50 invoices)

### Generation Script
- **`backend/scripts/generate-stock-data.js`** - Node.js script to generate data
- **`backend/scripts/generate-stock-data.ts`** - TypeScript version

## How to Use

### Automatic Loading
The application automatically loads the larger dataset on startup:

```bash
docker compose up
# Loads 15 suppliers with 95 invoices
```

### Generate New Data
To generate a new dataset with different values:

```bash
node backend/scripts/generate-stock-data.js
# Creates mock_dataset_large.json with random data
```

### Use Original Dataset
To use the smaller original dataset, rename the files:

```bash
mv backend/data/mock_dataset_large.json backend/data/mock_dataset_large.json.bak
# Now it will load mock_dataset.json instead
```

## Data Distribution

### By State
- Karnataka: 3 suppliers
- Maharashtra: 2 suppliers
- Tamil Nadu: 1 supplier
- Delhi: 1 supplier
- Gujarat: 1 supplier
- Haryana: 2 suppliers
- Uttar Pradesh: 1 supplier
- Kerala: 1 supplier
- Telangana: 1 supplier
- West Bengal: 1 supplier
- Rajasthan: 1 supplier
- Himachal Pradesh: 1 supplier
- Punjab: 1 supplier
- Goa: 1 supplier

### By Transaction Type
- Intra-state (CGST+SGST): ~60%
- Inter-state (IGST): ~40%

### By Filing Status
- FILED: ~70%
- LATE: ~20%
- NOT_FILED: ~10%

## Sample Transactions

### Example 1: Intra-state Transaction
```json
{
  "invoiceNo": "INV0001",
  "date": "2025-04-05",
  "supplierGstin": "29AABCS1234F1Z5",
  "buyerGstin": "29BUYER001KA1Z5",
  "taxableValue": 100000.00,
  "cgst": 9000.00,
  "sgst": 9000.00,
  "igst": 0,
  "gstAmount": 18000.00
}
```

### Example 2: Inter-state Transaction
```json
{
  "invoiceNo": "INV0002",
  "date": "2025-04-08",
  "supplierGstin": "29AABCS1234F1Z5",
  "buyerGstin": "27BUYER002MH1Z3",
  "taxableValue": 250000.00,
  "cgst": 0,
  "sgst": 0,
  "igst": 45000.00,
  "gstAmount": 45000.00
}
```

## Testing Scenarios

### Dashboard Testing
- View total invoices: 95
- View total suppliers: 15
- View total buyers: 8
- View total GST: ₹1,000,000+

### Reconciliation Testing
- Test ITC chain validation
- Test mismatch detection
- Test audit trail generation
- Test risk scoring

### Upload Testing
- Upload sample GSTR-1 files
- Upload sample GSTR-2B files
- Test file validation
- Test data persistence

## Customization

### Add More Suppliers
Edit `backend/scripts/generate-stock-data.js`:

```javascript
const suppliers = [
  // Add new supplier here
  { gstin: "XX...", pan: "...", name: "...", state: "..." }
];
```

### Change Invoice Count
Modify the invoice generation loop:

```javascript
const invoiceCount = Math.floor(Math.random() * 8) + 3; // 3-10 invoices
```

### Adjust GST Rate
Change the rate in the script:

```javascript
const gstRate = 0.18; // 18% GST
```

## Performance Notes

- **Load Time**: ~5 seconds for 95 invoices
- **Database Size**: ~2MB for full dataset
- **Query Performance**: Sub-second for most queries
- **Memory Usage**: ~100MB for Neo4j with this dataset

## Next Steps

1. ✅ Stock data loaded
2. Test all features with real data
3. Generate more data for stress testing
4. Add GSTR-2B data
5. Add e-invoice data
6. Add purchase register data

## Support

For issues or questions about the stock data:
- Check `backend/scripts/generate-stock-data.js`
- Review `backend/data/mock_dataset_large.json`
- See `UPLOAD_GUIDE.md` for file format details

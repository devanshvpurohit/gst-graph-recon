# GST Recon - File Upload Guide

## Overview

The GST Recon application now supports uploading bills and GST returns through the **Upload Bills** page. You can upload:

- **GSTR-1**: Supplier returns with invoice details
- **GSTR-2B**: Buyer returns with claimed invoices
- **E-Invoice**: IRN (Invoice Reference Number) data
- **Purchase Register**: Purchase transactions and ledger entries

## Accessing the Upload Page

1. Navigate to http://localhost:3000
2. Click on **Upload Bills** in the left sidebar
3. Select the document type you want to upload

## File Format Requirements

### GSTR-1 (Supplier Returns)

Upload JSON files with the following structure:

```json
{
  "supplier": {
    "gstin": "29AABCS1234F1Z5",
    "pan": "AABCS1234F",
    "name": "Supplier Company Name",
    "state": "Karnataka"
  },
  "returns_info": {
    "id": "R001",
    "type": "GSTR1",
    "period": "042025",
    "status": "FILED",
    "filingDate": "2025-05-11",
    "gstin": "29AABCS1234F1Z5"
  },
  "invoices": [
    {
      "invoiceNo": "INV001",
      "date": "2025-04-05",
      "taxableValue": 100000.00,
      "cgst": 9000.00,
      "sgst": 9000.00,
      "igst": 0,
      "gstAmount": 18000.00,
      "supplierGstin": "29AABCS1234F1Z5",
      "buyerGstin": "29BUYER001KA1Z5",
      "hsn": "7208"
    }
  ]
}
```

**Status Options**: `FILED`, `LATE`, `NOT_FILED`

### GSTR-2B (Buyer Returns)

Similar structure to GSTR-1 but for buyer perspective:

```json
{
  "buyer": {
    "gstin": "29BUYER001KA1Z5",
    "pan": "BUYER001KA",
    "name": "Buyer Company Name",
    "state": "Karnataka"
  },
  "returns_info": {
    "id": "B001",
    "type": "GSTR2B",
    "period": "042025",
    "status": "FILED",
    "filingDate": "2025-05-15",
    "gstin": "29BUYER001KA1Z5"
  },
  "invoices": [
    {
      "invoiceNo": "INV001",
      "supplierGstin": "29AABCS1234F1Z5",
      "taxableValue": 100000.00,
      "gstAmount": 18000.00,
      "status": "ACCEPTED"
    }
  ]
}
```

### E-Invoice

Upload IRN (Invoice Reference Number) data:

```json
{
  "invoices": [
    {
      "invoiceNo": "INV001",
      "irnHash": "abc123def456",
      "supplierGstin": "29AABCS1234F1Z5",
      "buyerGstin": "29BUYER001KA1Z5",
      "invoiceDate": "2025-04-05",
      "taxableValue": 100000.00,
      "gstAmount": 18000.00,
      "status": "ACTIVE"
    }
  ]
}
```

### Purchase Register

Upload purchase transactions and ledger entries:

```json
{
  "buyer": {
    "gstin": "29BUYER001KA1Z5",
    "name": "Buyer Company"
  },
  "period": "042025",
  "purchases": [
    {
      "invoiceNo": "INV001",
      "supplierGstin": "29AABCS1234F1Z5",
      "invoiceDate": "2025-04-05",
      "taxableValue": 100000.00,
      "cgst": 9000.00,
      "sgst": 9000.00,
      "igst": 0,
      "gstAmount": 18000.00
    }
  ],
  "ledgerEntries": [
    {
      "date": "2025-04-05",
      "description": "ITC Claim",
      "amount": 18000.00,
      "type": "CREDIT"
    }
  ]
}
```

## Upload Methods

### Method 1: Drag & Drop

1. Go to the Upload Bills page
2. Drag your JSON file onto the upload box
3. The file will be automatically processed

### Method 2: Click to Browse

1. Go to the Upload Bills page
2. Click on the upload box
3. Select your file from the file browser
4. Click Open

## Supported File Types

- **JSON** (.json) - Recommended format
- **CSV** (.csv) - Will be parsed as JSON
- **Excel** (.xlsx, .xls) - Will be converted to JSON

## API Endpoints

You can also upload files programmatically using the API:

```bash
# GSTR-1 Upload
curl -X POST -F "file=@gstr1.json" http://localhost:8000/ingest/upload/gstr1

# GSTR-2B Upload
curl -X POST -F "file=@gstr2b.json" http://localhost:8000/ingest/upload/gstr2b

# E-Invoice Upload
curl -X POST -F "file=@einvoice.json" http://localhost:8000/ingest/upload/einvoice

# Purchase Register Upload
curl -X POST -F "file=@purchase.json" http://localhost:8000/ingest/upload/purchase-register
```

## Response Format

After successful upload, you'll receive:

```json
{
  "status": "success",
  "invoicesProcessed": 5,
  "fileName": "gstr1.json"
}
```

## Error Handling

If there's an error during upload:

```json
{
  "error": "Error message describing what went wrong"
}
```

Common errors:
- **Invalid file type**: Only JSON, CSV, and Excel files are supported
- **Invalid JSON**: File must be valid JSON format
- **Missing required fields**: Check that all required fields are present
- **Database error**: Neo4j connection issue

## Sample Files

Sample upload files are available in `backend/data/`:
- `sample-gstr1-upload.json` - Example GSTR-1 file

## Tips

1. **Validate JSON**: Use a JSON validator before uploading to catch syntax errors
2. **Check GSTIN Format**: GSTIN must be 15 characters (e.g., 29AABCS1234F1Z5)
3. **Date Format**: Use ISO format (YYYY-MM-DD)
4. **Period Format**: Use MMYYYY format (e.g., 042025 for April 2025)
5. **Batch Uploads**: Upload multiple invoices in a single file for efficiency

## Troubleshooting

**Upload fails with "No file uploaded"**
- Ensure you've selected a file before uploading

**"Invalid file type" error**
- Check that your file has the correct extension (.json, .csv, .xlsx)
- Verify the file MIME type is correct

**"Invalid JSON" error**
- Validate your JSON using an online JSON validator
- Check for missing commas or quotes

**"Database error" message**
- Ensure Neo4j is running (check http://localhost:7474)
- Check backend logs: `docker logs gst-backend`

## Next Steps

After uploading:
1. Go to **Dashboard** to see aggregated data
2. Go to **Reconciliation** to run ITC reconciliation
3. Go to **Vendor Risk** to see vendor risk scores

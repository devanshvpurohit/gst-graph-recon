# PDF Invoice Analysis Guide

## Overview

The GST Reconciliation Engine now includes **AI-powered PDF invoice analysis** using Gemma 3:1B. Upload invoice PDFs and the system will:

1. **Extract text** from PDF documents
2. **Parse invoice data** using AI (invoice number, GSTIN, amounts, etc.)
3. **Validate** extracted data against GST compliance rules
4. **Generate compliance report** with recommendations

---

## Features

### 1. Automatic Invoice Data Extraction

The AI extracts:
- Invoice number
- Invoice date
- Supplier GSTIN (15-digit tax ID)
- Buyer GSTIN (15-digit tax ID)
- Taxable value
- GST amount
- HSN code

### 2. Data Validation

Validates:
- ✓ GSTIN format (15 digits)
- ✓ Date format (YYYY-MM-DD)
- ✓ Amount validity (no negative values)
- ✓ GST calculation (18% standard rate)
- ✓ Critical field presence

### 3. Compliance Assessment

Provides:
- Overall compliance status
- Red flags and concerns
- Recommended next steps
- Confidence score (0-100%)

### 4. Error Handling

Gracefully handles:
- Corrupted PDFs
- Scanned images (limited OCR)
- Missing data fields
- Invalid formats

---

## How to Use

### Via Frontend (Recommended)

1. **Navigate to Upload Page**
   - Go to http://localhost:3000/upload

2. **Select PDF Upload**
   - Click on "📄 Invoice PDF (AI)" card

3. **Upload Invoice**
   - Drag & drop PDF or click to browse
   - Supported: Single-page or multi-page PDFs

4. **View Results**
   - Extracted invoice data displayed
   - AI analysis and confidence score shown
   - Validation results with any warnings/errors
   - Compliance report provided

### Via API (Advanced)

**Endpoint**: `POST /ingest/upload/pdf`

**Request**:
```bash
curl -X POST http://localhost:8000/ingest/upload/pdf \
  -F "file=@invoice.pdf"
```

**Response**:
```json
{
  "success": true,
  "fileName": "invoice.pdf",
  "fileSize": 245000,
  "data": {
    "extractedText": "Invoice text...",
    "invoiceData": {
      "invoiceNo": "INV-2025-001",
      "date": "2025-02-27",
      "supplierGstin": "29AABCS1234F1Z5",
      "buyerGstin": "29BUYER001KA1Z5",
      "taxableValue": 100000,
      "gstAmount": 18000,
      "hsn": "7208"
    },
    "aiAnalysis": "Invoice appears compliant...",
    "confidence": 0.85
  },
  "validation": {
    "isValid": true,
    "errors": [],
    "warnings": []
  },
  "complianceReport": "Overall compliance status: COMPLIANT..."
}
```

---

## Understanding Results

### Extracted Invoice Data

| Field | Description | Example |
|-------|-------------|---------|
| **invoiceNo** | Unique invoice identifier | INV-2025-001 |
| **date** | Invoice date | 2025-02-27 |
| **supplierGstin** | Supplier's 15-digit GSTIN | 29AABCS1234F1Z5 |
| **buyerGstin** | Buyer's 15-digit GSTIN | 29BUYER001KA1Z5 |
| **taxableValue** | Amount before GST | ₹100,000 |
| **gstAmount** | GST amount (18% standard) | ₹18,000 |
| **hsn** | HSN code for goods/services | 7208 |

### Validation Results

**Valid Invoice**:
```json
{
  "isValid": true,
  "errors": [],
  "warnings": ["Date format may be incorrect"]
}
```

**Invalid Invoice**:
```json
{
  "isValid": false,
  "errors": [
    "Invalid supplier GSTIN format (must be 15 digits)",
    "Taxable value cannot be negative"
  ],
  "warnings": ["GST amount does not match expected 18% calculation"]
}
```

### Confidence Score

- **0.9-1.0**: Excellent - High confidence in extraction
- **0.7-0.9**: Good - Reliable extraction
- **0.5-0.7**: Fair - Some uncertainty
- **<0.5**: Low - Manual review recommended

---

## Supported PDF Types

### ✅ Supported

- **Digital PDFs**: Generated from accounting software
- **Scanned Invoices**: Clear, high-resolution scans
- **Multi-page PDFs**: First page analyzed
- **Standard Formats**: GST invoices, commercial invoices

### ⚠️ Limited Support

- **Handwritten PDFs**: May have extraction errors
- **Low-quality Scans**: Reduced accuracy
- **Image-only PDFs**: Requires OCR (limited)
- **Complex Layouts**: May miss some fields

### ❌ Not Supported

- **Encrypted PDFs**: Password-protected files
- **Corrupted Files**: Damaged or incomplete PDFs
- **Non-invoice PDFs**: Receipts, quotations, etc.

---

## Error Handling

### Common Errors

**"Failed to extract PDF text"**
- Cause: Corrupted or encrypted PDF
- Solution: Verify PDF is valid and not password-protected

**"Failed to parse invoice with AI"**
- Cause: Ollama not running or model not available
- Solution: Start Ollama and pull Gemma model

**"Invalid GSTIN format"**
- Cause: GSTIN not 15 digits
- Solution: Verify GSTIN in PDF is correct

**"GST amount does not match expected calculation"**
- Cause: GST rate not 18% or calculation error
- Solution: Check if different GST rate applies (5%, 12%, etc.)

### Troubleshooting

1. **Verify Ollama is running**
   ```bash
   curl http://localhost:11434/api/tags
   ```

2. **Check Gemma model is available**
   ```bash
   ollama list
   ```

3. **Review backend logs**
   ```bash
   docker logs gst-backend -f
   ```

4. **Test with sample PDF**
   - Use a known-good invoice PDF
   - Verify extraction works
   - Check confidence score

---

## Workflow Integration

### Step 1: Upload Invoice PDF
```
User uploads PDF → Backend receives file
```

### Step 2: Extract Text
```
PDF → Text extraction → Raw text (first 2000 chars)
```

### Step 3: AI Parsing
```
Raw text → Gemma 3:1B → JSON with invoice data
```

### Step 4: Validation
```
Invoice data → Validation rules → Errors/Warnings
```

### Step 5: Compliance Report
```
Invoice data + Extracted text → Gemma 3:1B → Compliance assessment
```

### Step 6: Display Results
```
Results → Frontend → User sees extracted data, validation, compliance
```

---

## Performance

| Metric | Value |
|--------|-------|
| **PDF Size Limit** | 50MB (configurable) |
| **Processing Time** | 5-15 seconds |
| **Text Extraction** | <1 second |
| **AI Parsing** | 3-8 seconds |
| **Validation** | <1 second |
| **Compliance Report** | 2-5 seconds |

---

## Configuration

### Environment Variables

```bash
# Ollama configuration
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=gemma:3b

# Backend
PORT=8000
NEO4J_URI=bolt://localhost:7687
```

### Adjustable Parameters

In `backend/src/services/pdf-analyzer.ts`:

```typescript
// Temperature for AI parsing (lower = more deterministic)
temperature: 0.2  // For parsing (strict)
temperature: 0.3  // For compliance report (balanced)

// Timeout for AI requests
timeout: 30000  // 30 seconds

// Text extraction limit
pdfText.substring(0, 2000)  // First 2000 characters
```

---

## API Reference

### Upload PDF

**Endpoint**: `POST /ingest/upload/pdf`

**Request**:
```bash
curl -X POST http://localhost:8000/ingest/upload/pdf \
  -F "file=@invoice.pdf"
```

**Response** (Success):
```json
{
  "success": true,
  "fileName": "invoice.pdf",
  "fileSize": 245000,
  "data": { ... },
  "validation": { ... },
  "complianceReport": "..."
}
```

**Response** (Error):
```json
{
  "success": false,
  "error": "Failed to extract PDF text: ...",
  "hint": "Ensure Ollama is running with Gemma model"
}
```

### Analyze PDF (Serverless)

**Endpoint**: `POST /api/ingest/pdf-analyze`

**Request**:
```bash
curl -X POST https://your-vercel-app.vercel.app/api/ingest/pdf-analyze \
  -H "Content-Type: application/json" \
  -d '{
    "pdfBase64": "JVBERi0xLjQKJeLj..."
  }'
```

**Note**: PDF must be base64-encoded for serverless endpoint

---

## Best Practices

### 1. PDF Quality
- Use high-resolution scans (300+ DPI)
- Ensure text is clear and readable
- Avoid rotated or skewed pages

### 2. Invoice Format
- Include all required fields (GSTIN, amounts, dates)
- Use standard invoice layout
- Avoid custom or unusual formats

### 3. Error Handling
- Check confidence score before using data
- Review validation warnings
- Manually verify high-risk invoices

### 4. Batch Processing
- Upload one invoice at a time
- Monitor processing time
- Check results before proceeding

### 5. Data Security
- PDFs are processed in memory
- Temporary files are deleted after processing
- No data is stored permanently

---

## Limitations

1. **Single Page**: Only first page of multi-page PDFs is analyzed
2. **Language**: English text only (GST invoices typically in English)
3. **OCR**: Limited support for scanned/image-based PDFs
4. **Accuracy**: Depends on PDF quality and format
5. **Confidence**: AI confidence score is estimate, not guarantee

---

## Future Enhancements

- [ ] Multi-page PDF support
- [ ] Batch PDF upload
- [ ] OCR improvement for scanned invoices
- [ ] Support for multiple languages
- [ ] Direct database import after validation
- [ ] Audit trail for PDF uploads
- [ ] Custom field extraction templates

---

## Support

For issues:
1. Check `SYSTEM_STATUS.md` for service status
2. Review troubleshooting section above
3. Check backend logs: `docker logs gst-backend -f`
4. Verify Ollama: `curl http://localhost:11434/api/tags`
5. Test with sample PDF

---

## Examples

### Example 1: Valid Invoice

**PDF Content**:
```
Invoice No: INV-2025-001
Date: 27-02-2025
Supplier GSTIN: 29AABCS1234F1Z5
Buyer GSTIN: 29BUYER001KA1Z5
Taxable Value: ₹100,000
GST (18%): ₹18,000
```

**Result**:
```json
{
  "success": true,
  "data": {
    "invoiceData": {
      "invoiceNo": "INV-2025-001",
      "date": "2025-02-27",
      "supplierGstin": "29AABCS1234F1Z5",
      "buyerGstin": "29BUYER001KA1Z5",
      "taxableValue": 100000,
      "gstAmount": 18000
    },
    "confidence": 0.92
  },
  "validation": {
    "isValid": true,
    "errors": [],
    "warnings": []
  }
}
```

### Example 2: Invalid Invoice

**PDF Content**:
```
Invoice No: INV-2025-002
Date: 27/02/2025
Supplier GSTIN: 29AABCS1234F1Z (14 digits - INVALID)
Buyer GSTIN: 29BUYER001KA1Z5
Taxable Value: -₹50,000 (NEGATIVE)
GST: ₹15,000
```

**Result**:
```json
{
  "success": true,
  "validation": {
    "isValid": false,
    "errors": [
      "Invalid supplier GSTIN format (must be 15 digits)",
      "Taxable value cannot be negative"
    ],
    "warnings": [
      "Date format may be incorrect (expected YYYY-MM-DD)",
      "GST amount does not match expected 18% calculation"
    ]
  }
}
```

---

## Conclusion

PDF invoice analysis with Gemma 3:1B provides:
- ✅ Automatic data extraction
- ✅ AI-powered parsing
- ✅ Compliance validation
- ✅ Confidence scoring
- ✅ Error handling

**Ready to analyze invoices!** 📄🤖


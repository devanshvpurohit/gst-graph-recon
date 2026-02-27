const fs = require('fs');
const path = require('path');

// Generate realistic GST data
const generateStockData = () => {
    const suppliers = [
        { gstin: "29AABCS1234F1Z5", pan: "AABCS1234F", name: "Steel Corp India Pvt Ltd", state: "Karnataka" },
        { gstin: "27AABCT5678G1Z3", pan: "AABCT5678G", name: "Tech Solutions Maharashtra", state: "Maharashtra" },
        { gstin: "33AABCU9012H1Z1", pan: "AABCU9012H", name: "Tamil Auto Parts Ltd", state: "Tamil Nadu" },
        { gstin: "07AABCV3456I1Z9", pan: "AABCV3456I", name: "Delhi Electronics Hub", state: "Delhi" },
        { gstin: "24AABCW7890J1Z7", pan: "AABCW7890J", name: "Gujarat Textiles Pvt Ltd", state: "Gujarat" },
        { gstin: "06AABCX1234K1Z5", pan: "AABCX1234K", name: "Haryana Chemicals Ltd", state: "Haryana" },
        { gstin: "09AABCY5678L1Z3", pan: "AABCY5678L", name: "UP Pharma Industries", state: "Uttar Pradesh" },
        { gstin: "32AABCZ9012M1Z1", pan: "AABCZ9012M", name: "Kerala Spice Traders", state: "Kerala" },
        { gstin: "36AADCA3456N1Z9", pan: "AADCA3456N", name: "Telangana IT Services", state: "Telangana" },
        { gstin: "19AADCB7890O1Z7", pan: "AADCB7890O", name: "Bengal Manufacturing Co", state: "West Bengal" },
        { gstin: "08AADCC1234P1Z5", pan: "AADCC1234P", name: "Rajasthan Minerals Ltd", state: "Rajasthan" },
        { gstin: "10AADCD5678Q1Z3", pan: "AADCD5678Q", name: "Himachal Hydro Power", state: "Himachal Pradesh" },
        { gstin: "12AADCE9012R1Z1", pan: "AADCE9012R", name: "Punjab Agro Exports", state: "Punjab" },
        { gstin: "14AADCF3456S1Z9", pan: "AADCF3456S", name: "Haryana Dairy Products", state: "Haryana" },
        { gstin: "16AADCG7890T1Z7", pan: "AADCG7890T", name: "Goa Tourism Services", state: "Goa" },
    ];

    const buyers = [
        { gstin: "29BUYER001KA1Z5", pan: "BUYER001KA", name: "Bangalore Retail Corp", state: "Karnataka" },
        { gstin: "27BUYER002MH1Z3", pan: "BUYER002MH", name: "Mumbai Trading House", state: "Maharashtra" },
        { gstin: "33BUYER003TN1Z1", pan: "BUYER003TN", name: "Chennai Distributors", state: "Tamil Nadu" },
        { gstin: "07BUYER004DL1Z9", pan: "BUYER004DL", name: "Delhi Wholesale Market", state: "Delhi" },
        { gstin: "24BUYER005GJ1Z7", pan: "BUYER005GJ", name: "Ahmedabad Import Export", state: "Gujarat" },
        { gstin: "06BUYER006HR1Z5", pan: "BUYER006HR", name: "Gurgaon Logistics Ltd", state: "Haryana" },
        { gstin: "09BUYER007UP1Z3", pan: "BUYER007UP", name: "Lucknow Retail Chain", state: "Uttar Pradesh" },
        { gstin: "32BUYER008KL1Z1", pan: "BUYER008KL", name: "Kochi Trade Center", state: "Kerala" },
    ];

    const gstr1Filings = suppliers.map((supplier, idx) => {
        const invoiceCount = Math.floor(Math.random() * 8) + 3;
        const invoices = [];
        const statuses = ["FILED", "LATE", "NOT_FILED"];
        const status = statuses[Math.floor(Math.random() * statuses.length)];

        for (let i = 0; i < invoiceCount; i++) {
            const buyer = buyers[Math.floor(Math.random() * buyers.length)];
            const taxableValue = Math.floor(Math.random() * 500000) + 50000;
            const isIntra = supplier.state === buyer.state;
            const gstRate = 0.18;

            let cgst = 0, sgst = 0, igst = 0;
            if (isIntra) {
                cgst = Math.round(taxableValue * gstRate / 2);
                sgst = Math.round(taxableValue * gstRate / 2);
            } else {
                igst = Math.round(taxableValue * gstRate);
            }

            invoices.push({
                invoiceNo: `INV${String(idx * 100 + i + 1).padStart(4, '0')}`,
                date: `2025-04-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
                taxableValue,
                cgst,
                sgst,
                igst,
                gstAmount: cgst + sgst + igst,
                supplierGstin: supplier.gstin,
                buyerGstin: buyer.gstin,
                hsn: String(Math.floor(Math.random() * 9000) + 1000),
            });
        }

        return {
            supplier,
            returns_info: {
                id: `R${String(idx + 1).padStart(3, '0')}`,
                type: "GSTR1",
                period: "042025",
                status,
                filingDate: status === "NOT_FILED" ? null : `2025-05-${String(Math.floor(Math.random() * 20) + 8).padStart(2, '0')}`,
                gstin: supplier.gstin,
            },
            invoices,
        };
    });

    return {
        suppliers,
        buyers,
        gstr1_filings: gstr1Filings,
        einvoice_data: [],
        purchase_register_data: [],
        gstr2b_data: [],
    };
};

const data = generateStockData();
const outputPath = path.join(__dirname, '../data/mock_dataset_large.json');

fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
console.log(`✅ Generated stock data with ${data.suppliers.length} suppliers and ${data.gstr1_filings.reduce((sum, f) => sum + f.invoices.length, 0)} invoices`);
console.log(`📁 Saved to: ${outputPath}`);

import { VercelRequest, VercelResponse } from '@vercel/node';
import { withCors, withErrorHandler } from '../../api/middleware';

interface Invoice {
    invoiceNo: string;
    date: string;
    taxableValue: number;
    cgst: number;
    sgst: number;
    igst: number;
    gstAmount: number;
    supplierGstin: string;
    buyerGstin: string;
    hsn: string;
}

interface RiskAnalysis {
    riskScore: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    reasoning: string[];
    successFactors: string[];
    recommendations: string[];
}

// ML Risk Scoring Algorithm
function analyzeRisk(invoices: Invoice[]): RiskAnalysis {
    const reasoning: string[] = [];
    const successFactors: string[] = [];
    const recommendations: string[] = [];

    let riskScore = 0;
    let riskFactors = 0;

    // 1. Check for missing IRN (e-invoice)
    const missingIrnCount = invoices.filter((inv) => !inv.invoiceNo.startsWith('INV')).length;
    if (missingIrnCount > 0) {
        riskScore += 0.15;
        riskFactors++;
        reasoning.push(`${missingIrnCount} invoices missing IRN (e-invoice) - reduces traceability`);
        recommendations.push('Ensure all invoices have valid IRN from e-invoice system');
    } else {
        successFactors.push('All invoices have valid invoice numbers');
    }

    // 2. Check for GSTIN validity
    const invalidGstins = invoices.filter(
        (inv) => !isValidGSTIN(inv.supplierGstin) || !isValidGSTIN(inv.buyerGstin)
    );
    if (invalidGstins.length > 0) {
        riskScore += 0.25;
        riskFactors++;
        reasoning.push(`${invalidGstins.length} invoices with invalid GSTIN format`);
        recommendations.push('Verify GSTIN format (15 characters: 2-digit state code + 10-digit PAN + 1-digit entity + 1-digit check)');
    } else {
        successFactors.push('All GSTINs are in valid format');
    }

    // 3. Check for GST amount calculation errors
    const calculationErrors = invoices.filter((inv) => {
        const expectedGst = inv.taxableValue * 0.18;
        return Math.abs(inv.gstAmount - expectedGst) > 1; // Allow 1 rupee rounding difference
    });
    if (calculationErrors.length > 0) {
        riskScore += 0.2;
        riskFactors++;
        reasoning.push(`${calculationErrors.length} invoices with incorrect GST calculations`);
        recommendations.push('Verify GST calculations: GST should be 18% of taxable value');
    } else {
        successFactors.push('All GST calculations are accurate');
    }

    // 4. Check for intra-state vs inter-state consistency
    const intraStateErrors = invoices.filter((inv) => {
        const supplierState = inv.supplierGstin.substring(0, 2);
        const buyerState = inv.buyerGstin.substring(0, 2);
        const isIntraState = supplierState === buyerState;

        if (isIntraState && inv.igst > 0) {
            return true; // Error: intra-state should not have IGST
        }
        if (!isIntraState && (inv.cgst > 0 || inv.sgst > 0)) {
            return true; // Error: inter-state should not have CGST/SGST
        }
        return false;
    });
    if (intraStateErrors.length > 0) {
        riskScore += 0.2;
        riskFactors++;
        reasoning.push(`${intraStateErrors.length} invoices with incorrect CGST/SGST/IGST split`);
        recommendations.push('Verify intra-state transactions use CGST+SGST, inter-state use IGST');
    } else {
        successFactors.push('All intra-state and inter-state transactions are correctly classified');
    }

    // 5. Check for duplicate invoices
    const invoiceNos = invoices.map((inv) => inv.invoiceNo);
    const duplicates = invoiceNos.filter((no, idx) => invoiceNos.indexOf(no) !== idx);
    if (duplicates.length > 0) {
        riskScore += 0.3;
        riskFactors++;
        reasoning.push(`${duplicates.length} duplicate invoice numbers detected`);
        recommendations.push('Remove duplicate invoices to prevent double-claiming of ITC');
    } else {
        successFactors.push('No duplicate invoices found');
    }

    // 6. Check for unusually high amounts
    const avgAmount = invoices.reduce((sum, inv) => sum + inv.taxableValue, 0) / invoices.length;
    const highAmountInvoices = invoices.filter((inv) => inv.taxableValue > avgAmount * 3);
    if (highAmountInvoices.length > 0) {
        riskScore += 0.1;
        reasoning.push(`${highAmountInvoices.length} invoices with unusually high amounts (>3x average)`);
        recommendations.push('Verify high-value invoices for authenticity and proper documentation');
    }

    // 7. Check for date consistency
    const futureInvoices = invoices.filter((inv) => new Date(inv.date) > new Date());
    if (futureInvoices.length > 0) {
        riskScore += 0.25;
        riskFactors++;
        reasoning.push(`${futureInvoices.length} invoices with future dates`);
        recommendations.push('Ensure all invoice dates are in the past');
    } else {
        successFactors.push('All invoice dates are valid');
    }

    // 8. Check for zero-value invoices
    const zeroValueInvoices = invoices.filter((inv) => inv.taxableValue === 0);
    if (zeroValueInvoices.length > 0) {
        riskScore += 0.15;
        reasoning.push(`${zeroValueInvoices.length} invoices with zero taxable value`);
        recommendations.push('Remove or correct zero-value invoices');
    }

    // Normalize risk score to 0-1 range
    riskScore = Math.min(riskScore, 1);

    // Determine risk level
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    if (riskScore < 0.3) {
        riskLevel = 'LOW';
    } else if (riskScore < 0.7) {
        riskLevel = 'MEDIUM';
    } else {
        riskLevel = 'HIGH';
    }

    // Add general success factors if no issues
    if (riskFactors === 0) {
        successFactors.push('All invoices passed compliance checks');
        successFactors.push('Data is ready for ITC claim');
    }

    return {
        riskScore,
        riskLevel,
        reasoning,
        successFactors,
        recommendations,
    };
}

function isValidGSTIN(gstin: string): boolean {
    // GSTIN format: 2-digit state + 10-digit PAN + 1-digit entity + 1-digit check = 15 chars
    if (!gstin || gstin.length !== 15) return false;
    if (!/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z0-9]{1}$/.test(gstin)) return false;
    return true;
}

const handler = async (req: VercelRequest, res: VercelResponse) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { invoices } = req.body;

        if (!invoices || !Array.isArray(invoices)) {
            return res.status(400).json({ error: 'Invalid invoices data' });
        }

        const analysis = analyzeRisk(invoices);
        res.status(200).json(analysis);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export default withCors(withErrorHandler(handler));

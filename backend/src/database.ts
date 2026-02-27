import neo4j, { Driver, Session } from 'neo4j-driver';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
const user = process.env.NEO4J_USER || 'neo4j';
const password = process.env.NEO4J_PASSWORD || 'gstrecon2025';

class Database {
    private static instance: Database;
    private driver: Driver;

    private constructor() {
        this.driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
            maxConnectionPoolSize: 100,
        });
    }

    public static getInstance(): Database {
        if (!Database.instance) {
            Database.instance = new Database();
        }
        return Database.instance;
    }

    public getSession(): Session {
        return this.driver.session();
    }

    public async close(): Promise<void> {
        await this.driver.close();
    }

    public async initConstraints(): Promise<void> {
        const session = this.getSession();
        const constraints = [
            "CREATE CONSTRAINT taxpayer_gstin IF NOT EXISTS FOR (t:Taxpayer) REQUIRE t.gstin IS UNIQUE",
            "CREATE INDEX return_idx IF NOT EXISTS FOR (r:Return) ON (r.returnType, r.period, r.gstin)",
            "CREATE INDEX invoice_idx IF NOT EXISTS FOR (i:Invoice) ON (i.invoiceNo, i.supplierGstin)",
            "CREATE CONSTRAINT irn_hash IF NOT EXISTS FOR (irn:IRN) REQUIRE irn.irnHash IS UNIQUE",
        ];

        try {
            for (const q of constraints) {
                try {
                    await session.run(q);
                } catch (err: any) {
                    // Ignore Node Key constraint errors (not supported in Community Edition)
                    if (!err.message?.includes("Node Key constraint requires Neo4j Enterprise")) {
                        throw err;
                    }
                }
            }
            console.log("✅ Neo4j constraints initialized");
        } catch (error) {
            console.error("❌ Failed to initialize constraints:", error);
        } finally {
            await session.close();
        }
    }
}

export default Database.getInstance();

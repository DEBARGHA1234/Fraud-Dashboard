import { Router } from "express";
import { db, fraudTransactionsTable } from "@workspace/db";
import { eq, desc, and, gte, lte, like, or, count, avg, sum, sql } from "drizzle-orm";

const router = Router();

router.get("/transactions/stats", async (req, res) => {
  try {
    const [totals] = await db
      .select({
        totalAnalyzed: count(),
        totalBlocked: sql<number>`count(*) filter (where status = 'BLOCKED')`,
        totalReview: sql<number>`count(*) filter (where status = 'REVIEW')`,
        totalApproved: sql<number>`count(*) filter (where status = 'APPROVED')`,
        avgScore: avg(fraudTransactionsTable.score),
        totalAmountProtected: sum(fraudTransactionsTable.amount),
      })
      .from(fraudTransactionsTable);

    const fraudByCategory = await db
      .select({
        category: fraudTransactionsTable.category,
        count: count(),
        avgScore: avg(fraudTransactionsTable.score),
      })
      .from(fraudTransactionsTable)
      .groupBy(fraudTransactionsTable.category)
      .orderBy(desc(avg(fraudTransactionsTable.score)))
      .limit(6);

    const hourlyTrend = await db
      .select({
        hour: sql<string>`to_char(created_at, 'HH24:00')`,
        count: count(),
      })
      .from(fraudTransactionsTable)
      .where(
        gte(
          fraudTransactionsTable.createdAt,
          new Date(Date.now() - 24 * 60 * 60 * 1000),
        ),
      )
      .groupBy(sql`to_char(created_at, 'HH24:00')`)
      .orderBy(sql`to_char(created_at, 'HH24:00')`);

    res.json({
      totalAnalyzed: Number(totals.totalAnalyzed ?? 0),
      totalBlocked: Number(totals.totalBlocked ?? 0),
      totalReview: Number(totals.totalReview ?? 0),
      totalApproved: Number(totals.totalApproved ?? 0),
      avgScore: Number(totals.avgScore ?? 0),
      totalAmountProtected: Number(totals.totalAmountProtected ?? 0),
      fraudByCategory: fraudByCategory.map((r) => ({
        category: r.category,
        count: Number(r.count),
        avgScore: Number(r.avgScore ?? 0),
      })),
      hourlyTrend: hourlyTrend.map((r) => ({
        hour: r.hour,
        count: Number(r.count),
      })),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

router.get("/transactions", async (req, res) => {
  try {
    const {
      status,
      category,
      search,
      minScore,
      maxScore,
      limit = "50",
      offset = "0",
    } = req.query as Record<string, string>;

    const conditions = [];
    if (status) conditions.push(eq(fraudTransactionsTable.status, status as "APPROVED" | "REVIEW" | "BLOCKED"));
    if (category) conditions.push(eq(fraudTransactionsTable.category, category));
    if (minScore) conditions.push(gte(fraudTransactionsTable.score, parseInt(minScore)));
    if (maxScore) conditions.push(lte(fraudTransactionsTable.score, parseInt(maxScore)));
    if (search) {
      conditions.push(
        or(
          like(fraudTransactionsTable.txnRef, `%${search.toUpperCase()}%`),
          like(fraudTransactionsTable.category, `%${search}%`),
          like(fraudTransactionsTable.deviceType, `%${search}%`),
          like(fraudTransactionsTable.country, `%${search}%`),
        ),
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [transactions, [{ total }]] = await Promise.all([
      db
        .select()
        .from(fraudTransactionsTable)
        .where(where)
        .orderBy(desc(fraudTransactionsTable.createdAt))
        .limit(parseInt(limit))
        .offset(parseInt(offset)),
      db
        .select({ total: count() })
        .from(fraudTransactionsTable)
        .where(where),
    ]);

    res.json({
      transactions: transactions.map((t) => ({
        ...t,
        createdAt: t.createdAt.toISOString(),
      })),
      total: Number(total),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

router.post("/transactions", async (req, res) => {
  try {
    const body = req.body;
    const [inserted] = await db
      .insert(fraudTransactionsTable)
      .values({
        txnRef: body.txnRef,
        amount: body.amount,
        category: body.category,
        hour: body.hour,
        distance: body.distance,
        frequency: body.frequency,
        deviceType: body.deviceType,
        country: body.country,
        isFirstTransaction: body.isFirstTransaction,
        score: body.score,
        status: body.status,
        velocityRisk: body.velocityRisk,
        geographicRisk: body.geographicRisk,
        behavioralRisk: body.behavioralRisk,
        deviceRisk: body.deviceRisk,
        amlStatus: body.amlStatus,
        complianceTier: body.complianceTier,
      })
      .returning();

    res.status(201).json({ ...inserted, createdAt: inserted.createdAt.toISOString() });
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ error: "Failed to save transaction" });
  }
});

router.post("/transactions/bulk", async (req, res) => {
  try {
    const { transactions } = req.body as { transactions: Array<{
      txnRef: string; amount: number; category: string; hour: number;
      distance: number; frequency: number; deviceType: string; country: string;
      isFirstTransaction: boolean; score: number; status: string;
      velocityRisk: number; geographicRisk: number; behavioralRisk: number;
      deviceRisk: number; amlStatus: string; complianceTier: string;
    }> };

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ error: "transactions array is required" });
    }

    let saved = 0;
    let failed = 0;

    // Insert in chunks of 100
    const CHUNK = 100;
    for (let i = 0; i < transactions.length; i += CHUNK) {
      const chunk = transactions.slice(i, i + CHUNK);
      try {
        await db.insert(fraudTransactionsTable).values(
          chunk.map(t => ({
            txnRef: t.txnRef,
            amount: t.amount,
            category: t.category,
            hour: t.hour,
            distance: t.distance,
            frequency: t.frequency,
            deviceType: t.deviceType,
            country: t.country,
            isFirstTransaction: t.isFirstTransaction,
            score: t.score,
            status: t.status as "APPROVED" | "REVIEW" | "BLOCKED",
            velocityRisk: t.velocityRisk,
            geographicRisk: t.geographicRisk,
            behavioralRisk: t.behavioralRisk,
            deviceRisk: t.deviceRisk,
            amlStatus: t.amlStatus as "PASSED" | "FLAGGED",
            complianceTier: t.complianceTier,
          }))
        );
        saved += chunk.length;
      } catch {
        failed += chunk.length;
      }
    }

    res.status(201).json({ saved, failed, total: transactions.length });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Bulk insert failed" });
  }
});

router.delete("/transactions/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const deleted = await db
      .delete(fraudTransactionsTable)
      .where(eq(fraudTransactionsTable.id, id))
      .returning();

    if (deleted.length === 0) {
      return res.status(404).json({ error: "Transaction not found" });
    }
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete transaction" });
  }
});

router.get("/transactions/export", async (req, res) => {
  try {
    const { status, category, search } = req.query as Record<string, string>;

    const conditions = [];
    if (status) conditions.push(eq(fraudTransactionsTable.status, status as "APPROVED" | "REVIEW" | "BLOCKED"));
    if (category) conditions.push(eq(fraudTransactionsTable.category, category));
    if (search) conditions.push(like(fraudTransactionsTable.txnRef, `%${search.toUpperCase()}%`));

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const transactions = await db
      .select()
      .from(fraudTransactionsTable)
      .where(where)
      .orderBy(desc(fraudTransactionsTable.createdAt))
      .limit(10000);

    const headers = [
      "TXN Reference",
      "Date/Time",
      "Amount ($)",
      "Category",
      "Device",
      "Country",
      "Hour",
      "Distance (km)",
      "Frequency",
      "First w/ Merchant",
      "Risk Score",
      "Status",
      "AML Status",
      "Compliance Tier",
      "Velocity Risk",
      "Geographic Risk",
      "Behavioral Risk",
      "Device Risk",
    ];

    const rows = transactions.map((t) => [
      `TXN-${t.txnRef}`,
      t.createdAt.toISOString(),
      t.amount.toFixed(2),
      t.category,
      t.deviceType,
      t.country,
      t.hour,
      t.distance.toFixed(1),
      t.frequency,
      t.isFirstTransaction ? "Yes" : "No",
      t.score,
      t.status,
      t.amlStatus,
      t.complianceTier,
      t.velocityRisk,
      t.geographicRisk,
      t.behavioralRisk,
      t.deviceRisk,
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const filename = `FraudIQ_Export_${new Date().toISOString().split("T")[0]}.csv`;
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to export" });
  }
});

export default router;

const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");
const { config } = require("./config");

let sqlite;
let pgPool;

const sqliteSchema = `
  CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    request_code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    address TEXT NOT NULL DEFAULT '',
    project_code TEXT NOT NULL DEFAULT '',
    project TEXT NOT NULL,
    area TEXT NOT NULL DEFAULT '',
    budget TEXT NOT NULL DEFAULT '',
    style TEXT NOT NULL DEFAULT '',
    assigned_to TEXT NOT NULL DEFAULT '',
    expected_date TEXT NOT NULL DEFAULT '',
    message TEXT NOT NULL,
    file_name TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'new',
    source TEXT NOT NULL DEFAULT 'website',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
  CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
  CREATE TABLE IF NOT EXISTS case_counters (
    day TEXT PRIMARY KEY,
    seq INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS lead_events (
    id TEXT PRIMARY KEY,
    lead_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    from_status TEXT NOT NULL DEFAULT '',
    to_status TEXT NOT NULL DEFAULT '',
    actor TEXT NOT NULL DEFAULT 'system',
    metadata TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL,
    FOREIGN KEY (lead_id) REFERENCES leads(id)
  );
  CREATE INDEX IF NOT EXISTS idx_lead_events_lead ON lead_events(lead_id, created_at DESC);
  CREATE TABLE IF NOT EXISTS outbox_jobs (
    id TEXT PRIMARY KEY,
    lead_id TEXT NOT NULL,
    job_type TEXT NOT NULL,
    payload TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    next_run_at TEXT NOT NULL,
    last_error TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (lead_id) REFERENCES leads(id)
  );
  CREATE INDEX IF NOT EXISTS idx_outbox_pending
    ON outbox_jobs(status, next_run_at);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_outbox_lead_type
    ON outbox_jobs(lead_id, job_type);
`;

const postgresSchema = `
  CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY,
    request_code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    address TEXT NOT NULL DEFAULT '',
    project_code TEXT NOT NULL DEFAULT '',
    project TEXT NOT NULL,
    area TEXT NOT NULL DEFAULT '',
    budget TEXT NOT NULL DEFAULT '',
    style TEXT NOT NULL DEFAULT '',
    assigned_to TEXT NOT NULL DEFAULT '',
    expected_date DATE,
    message TEXT NOT NULL,
    file_name TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'new',
    source TEXT NOT NULL DEFAULT 'website',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
  CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS area TEXT NOT NULL DEFAULT '';
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS budget TEXT NOT NULL DEFAULT '';
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS style TEXT NOT NULL DEFAULT '';
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS assigned_to TEXT NOT NULL DEFAULT '';
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS expected_date DATE;
  CREATE TABLE IF NOT EXISTS case_counters (
    day DATE PRIMARY KEY,
    seq INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS lead_events (
    id UUID PRIMARY KEY,
    lead_id UUID NOT NULL REFERENCES leads(id),
    event_type TEXT NOT NULL,
    from_status TEXT NOT NULL DEFAULT '',
    to_status TEXT NOT NULL DEFAULT '',
    actor TEXT NOT NULL DEFAULT 'system',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_lead_events_lead ON lead_events(lead_id, created_at DESC);
  CREATE TABLE IF NOT EXISTS outbox_jobs (
    id UUID PRIMARY KEY,
    lead_id UUID NOT NULL REFERENCES leads(id),
    job_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    next_run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_error TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_outbox_pending
    ON outbox_jobs(status, next_run_at);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_outbox_lead_type
    ON outbox_jobs(lead_id, job_type);
`;

async function initDatabase() {
  if (config.dbDriver === "postgres") {
    if (!config.databaseUrl) throw new Error("DATABASE_URL chưa được cấu hình.");
    const { Pool } = require("pg");
    pgPool = new Pool({
      connectionString: config.databaseUrl,
      max: Number(process.env.DB_POOL_SIZE || 10),
      ssl:
        config.env === "production" && process.env.DB_SSL !== "false"
          ? { rejectUnauthorized: false }
          : false,
    });
    await pgPool.query(postgresSchema);
    await pgPool.query(
      "UPDATE outbox_jobs SET status='retry', next_run_at=NOW() WHERE status='processing'",
    );
    return;
  }

  const { DatabaseSync } = require("node:sqlite");
  fs.mkdirSync(path.dirname(config.sqliteFile), { recursive: true });
  sqlite = new DatabaseSync(config.sqliteFile);
  sqlite.exec("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;");
  sqlite.exec(sqliteSchema);
  const leadColumns = new Set(
    sqlite.prepare("PRAGMA table_info(leads)").all().map((column) => column.name),
  );
  for (const column of ["area", "budget", "style", "assigned_to", "expected_date"]) {
    if (!leadColumns.has(column)) {
      sqlite.exec(`ALTER TABLE leads ADD COLUMN ${column} TEXT NOT NULL DEFAULT ''`);
    }
  }
  sqlite.exec(
    "UPDATE outbox_jobs SET status='retry', next_run_at=datetime('now') WHERE status='processing'",
  );
}

function normalizeLead(input) {
  const now = new Date().toISOString();
  const createdAt = input.date || now;
  return {
    id: randomUUID(),
    requestCode: input.code,
    code: input.code || "",
    name: input.name,
    phone: String(input.phone).replace(/\D/g, "").replace(/^84/, "0"),
    email: input.email.toLowerCase(),
    address: input.address || "",
    projectCode: input.projectCode || "",
    project: input.project,
    area: input.area || "",
    budget: input.budget || "",
    style: input.style || "",
    assignedTo: input.assignedTo || "",
    expectedDate: input.expectedDate || "",
    message: input.message,
    fileName: input.file || "",
    file: input.file || "",
    status: "new",
    source: input.source || "website",
    createdAt,
    date: createdAt,
    updatedAt: now,
  };
}

function rowToLead(row) {
  if (!row) return null;
  return {
    id: row.id,
    code: row.request_code,
    name: row.name,
    phone: row.phone,
    email: row.email,
    address: row.address,
    projectCode: row.project_code,
    project: row.project,
    area: row.area || "",
    budget: row.budget || "",
    style: row.style || "",
    assignedTo: row.assigned_to || "",
    expectedDate: row.expected_date || "",
    message: row.message,
    file: row.file_name,
    status: row.status,
    source: row.source,
    date: new Date(row.created_at).toISOString(),
  };
}

async function nextPostgresCode(client) {
  const result = await client.query(
    `INSERT INTO case_counters(day, seq) VALUES (CURRENT_DATE, 1)
     ON CONFLICT (day) DO UPDATE SET seq=case_counters.seq+1
     RETURNING TO_CHAR(day, 'YYYYMMDD') AS day_key, seq`,
  );
  const { day_key: day, seq } = result.rows[0];
  return `KC-${day}-${String(seq).padStart(4, "0")}`;
}

function nextSqliteCode() {
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  sqlite
    .prepare(
      `INSERT INTO case_counters(day, seq) VALUES (?, 1)
       ON CONFLICT(day) DO UPDATE SET seq=seq+1`,
    )
    .run(day);
  const counter = sqlite
    .prepare("SELECT seq FROM case_counters WHERE day=?")
    .get(day);
  return `KC-${day}-${String(counter.seq).padStart(4, "0")}`;
}

async function createLeadWithOutbox(input) {
  const lead = normalizeLead(input);
  const now = new Date().toISOString();
  const jobs = [
    "email.admin",
    "crm.push",
    "zalo.notify",
    "slack.notify",
    "teams.notify",
  ].map((type) => ({
    id: randomUUID(),
    leadId: lead.id,
    type,
    payload: lead,
    now,
  }));

  if (config.dbDriver === "postgres") {
    const client = await pgPool.connect();
    try {
      await client.query("BEGIN");
      if (!lead.requestCode) {
        lead.requestCode = await nextPostgresCode(client);
        lead.code = lead.requestCode;
      }
      const result = await client.query(
        `INSERT INTO leads
          (id, request_code, name, phone, email, address, project_code, project, area, budget, style, assigned_to, expected_date, message, file_name, status, source, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NULLIF($13,''),$14,$15,$16,$17,$18,$19)
         ON CONFLICT (request_code) DO NOTHING RETURNING *`,
        [
          lead.id,
          lead.requestCode,
          lead.name,
          lead.phone,
          lead.email,
          lead.address,
          lead.projectCode,
          lead.project,
          lead.area,
          lead.budget,
          lead.style,
          lead.assignedTo,
          lead.expectedDate,
          lead.message,
          lead.fileName,
          lead.status,
          lead.source,
          lead.createdAt,
          lead.updatedAt,
        ],
      );
      if (!result.rows[0]) {
        const existing = await client.query(
          "SELECT * FROM leads WHERE request_code=$1",
          [lead.requestCode],
        );
        await client.query("COMMIT");
        return { lead: rowToLead(existing.rows[0]), created: false };
      }
      for (const job of jobs) {
        await client.query(
          `INSERT INTO outbox_jobs
            (id, lead_id, job_type, payload, status, attempts, next_run_at, created_at, updated_at)
           VALUES ($1,$2,$3,$4,'pending',0,$5,$5,$5)`,
          [job.id, job.leadId, job.type, JSON.stringify(job.payload), job.now],
        );
      }
      await client.query(
        `INSERT INTO lead_events
          (id, lead_id, event_type, to_status, actor, metadata, created_at)
         VALUES ($1,$2,'lead.created',$3,'system',$4,$5)`,
        [randomUUID(), lead.id, lead.status, JSON.stringify({ source: lead.source }), lead.createdAt],
      );
      await client.query("COMMIT");
      return { lead: rowToLead(result.rows[0]), created: true };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  sqlite.exec("BEGIN IMMEDIATE");
  try {
    if (!lead.requestCode) {
      lead.requestCode = nextSqliteCode();
      lead.code = lead.requestCode;
    }
    const result = sqlite
      .prepare(
        `INSERT OR IGNORE INTO leads
          (id, request_code, name, phone, email, address, project_code, project, area, budget, style, assigned_to, expected_date, message, file_name, status, source, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .run(
        lead.id,
        lead.requestCode,
        lead.name,
        lead.phone,
        lead.email,
        lead.address,
        lead.projectCode,
        lead.project,
        lead.area,
        lead.budget,
        lead.style,
        lead.assignedTo,
        lead.expectedDate,
        lead.message,
        lead.fileName,
        lead.status,
        lead.source,
        lead.createdAt,
        lead.updatedAt,
      );
    if (!result.changes) {
      const existing = sqlite
        .prepare("SELECT * FROM leads WHERE request_code=?")
        .get(lead.requestCode);
      sqlite.exec("COMMIT");
      return { lead: rowToLead(existing), created: false };
    }
    const insertJob = sqlite.prepare(
      `INSERT INTO outbox_jobs
        (id, lead_id, job_type, payload, status, attempts, next_run_at, created_at, updated_at)
       VALUES (?,?,?,?,'pending',0,?,?,?)`,
    );
    for (const job of jobs) {
      insertJob.run(
        job.id,
        job.leadId,
        job.type,
        JSON.stringify(job.payload),
        job.now,
        job.now,
        job.now,
      );
    }
    sqlite
      .prepare(
        `INSERT INTO lead_events
          (id, lead_id, event_type, to_status, actor, metadata, created_at)
         VALUES (?,?,'lead.created',?,'system',?,?)`,
      )
      .run(
        randomUUID(),
        lead.id,
        lead.status,
        JSON.stringify({ source: lead.source }),
        lead.createdAt,
      );
    sqlite.exec("COMMIT");
    return { lead: rowToLead(sqlite.prepare("SELECT * FROM leads WHERE id=?").get(lead.id)), created: true };
  } catch (error) {
    sqlite.exec("ROLLBACK");
    throw error;
  }
}

async function createOutboxJob(lead, type) {
  const id = randomUUID();
  const now = new Date().toISOString();
  if (config.dbDriver === "postgres") {
    await pgPool.query(
      `INSERT INTO outbox_jobs
        (id, lead_id, job_type, payload, status, attempts, next_run_at, created_at, updated_at)
       VALUES ($1,$2,$3,$4,'pending',0,$5,$5,$5)
       ON CONFLICT (lead_id, job_type) DO NOTHING`,
      [id, lead.id, type, JSON.stringify(lead), now],
    );
    return;
  }
  sqlite
    .prepare(
      `INSERT OR IGNORE INTO outbox_jobs
        (id, lead_id, job_type, payload, status, attempts, next_run_at, created_at, updated_at)
       VALUES (?,?,?,?,'pending',0,?,?,?)`,
    )
    .run(id, lead.id, type, JSON.stringify(lead), now, now, now);
}

async function updateLeadStatus(code, status, actor = "admin") {
  const now = new Date().toISOString();
  if (config.dbDriver === "postgres") {
    const client = await pgPool.connect();
    try {
      await client.query("BEGIN");
      const before = await client.query(
        "SELECT status FROM leads WHERE request_code=$1 FOR UPDATE",
        [code],
      );
      const result = await client.query(
        `UPDATE leads SET status=$2, updated_at=$3
         WHERE request_code=$1 AND status<>$2 RETURNING *`,
        [code, status, now],
      );
      const lead = result.rows[0] ? rowToLead(result.rows[0]) : null;
      if (lead) {
        await client.query(
          `INSERT INTO outbox_jobs
            (id, lead_id, job_type, payload, status, attempts, next_run_at, created_at, updated_at)
           VALUES ($1,$2,$3,$4,'pending',0,$5,$5,$5)
           ON CONFLICT (lead_id, job_type) DO NOTHING`,
          [
            randomUUID(),
            lead.id,
            `email.status.${status}`,
            JSON.stringify(lead),
            now,
          ],
        );
        await client.query(
          `INSERT INTO lead_events
            (id, lead_id, event_type, from_status, to_status, actor, metadata, created_at)
           VALUES ($1,$2,'status.changed',$3,$4,$5,'{}'::jsonb,$6)`,
          [
            randomUUID(),
            lead.id,
            before.rows[0]?.status || "",
            status,
            actor,
            now,
          ],
        );
      }
      await client.query("COMMIT");
      return lead || getLeadByCode(code);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  sqlite.exec("BEGIN IMMEDIATE");
  try {
    const current = sqlite
      .prepare("SELECT * FROM leads WHERE request_code=?")
      .get(code);
    if (!current) {
      sqlite.exec("COMMIT");
      return null;
    }
    if (current.status === status) {
      sqlite.exec("COMMIT");
      return rowToLead(current);
    }
    sqlite
      .prepare("UPDATE leads SET status=?, updated_at=? WHERE request_code=?")
      .run(status, now, code);
    const row = sqlite.prepare("SELECT * FROM leads WHERE request_code=?").get(code);
    const lead = rowToLead(row);
    sqlite
      .prepare(
        `INSERT OR IGNORE INTO outbox_jobs
          (id, lead_id, job_type, payload, status, attempts, next_run_at, created_at, updated_at)
         VALUES (?,?,?,?,'pending',0,?,?,?)`,
      )
      .run(
        randomUUID(),
        lead.id,
        `email.status.${status}`,
        JSON.stringify(lead),
        now,
        now,
        now,
      );
    sqlite
      .prepare(
        `INSERT INTO lead_events
          (id, lead_id, event_type, from_status, to_status, actor, metadata, created_at)
         VALUES (?,?,'status.changed',?,?,?,'{}',?)`,
      )
      .run(randomUUID(), lead.id, current.status, status, actor, now);
    sqlite.exec("COMMIT");
    return lead;
  } catch (error) {
    sqlite.exec("ROLLBACK");
    throw error;
  }
}

async function updateLeadAssignment(code, assignedTo, expectedDate, actor = "admin") {
  const now = new Date().toISOString();
  if (config.dbDriver === "postgres") {
    const result = await pgPool.query(
      `UPDATE leads SET assigned_to=$2, expected_date=NULLIF($3,''), updated_at=$4
       WHERE request_code=$1 RETURNING *`,
      [code, assignedTo || "", expectedDate || "", now],
    );
    const lead = rowToLead(result.rows[0]);
    if (lead) {
      await pgPool.query(
        `INSERT INTO lead_events
          (id, lead_id, event_type, actor, metadata, created_at)
         VALUES ($1,$2,'assignment.changed',$3,$4,$5)`,
        [
          randomUUID(),
          lead.id,
          actor,
          JSON.stringify({ assignedTo: lead.assignedTo, expectedDate: lead.expectedDate }),
          now,
        ],
      );
    }
    return lead;
  }
  sqlite
    .prepare(
      "UPDATE leads SET assigned_to=?, expected_date=?, updated_at=? WHERE request_code=?",
    )
    .run(assignedTo || "", expectedDate || "", now, code);
  const lead = rowToLead(
    sqlite.prepare("SELECT * FROM leads WHERE request_code=?").get(code),
  );
  if (lead) {
    sqlite
      .prepare(
        `INSERT INTO lead_events
          (id, lead_id, event_type, actor, metadata, created_at)
         VALUES (?,?,'assignment.changed',?,?,?)`,
      )
      .run(
        randomUUID(),
        lead.id,
        actor,
        JSON.stringify({ assignedTo: lead.assignedTo, expectedDate: lead.expectedDate }),
        now,
      );
  }
  return lead;
}

async function getLeadByCode(code) {
  if (config.dbDriver === "postgres") {
    const result = await pgPool.query(
      "SELECT * FROM leads WHERE request_code=$1",
      [code],
    );
    return rowToLead(result.rows[0]);
  }
  return rowToLead(
    sqlite.prepare("SELECT * FROM leads WHERE request_code=?").get(code),
  );
}

async function listLeads(filters = {}) {
  const safeLimit = Math.min(Math.max(Number(filters.limit) || 100, 1), 500);
  const clauses = [];
  const values = [];
  const add = (sql, value) => {
    values.push(value);
    clauses.push(sql.replace("?", `$${values.length}`));
  };
  if (filters.status) add("status=?", filters.status);
  if (filters.assignedTo) add("assigned_to=?", filters.assignedTo);
  if (filters.dateFrom) add("created_at>=?", filters.dateFrom);
  if (filters.dateTo) add("created_at<=?", filters.dateTo);
  if (filters.search) {
    values.push(`%${filters.search}%`);
    clauses.push(
      `(request_code ILIKE $${values.length} OR name ILIKE $${values.length} OR phone ILIKE $${values.length})`,
    );
  }
  if (config.dbDriver === "postgres") {
    values.push(safeLimit);
    const result = await pgPool.query(
      `SELECT * FROM leads ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""}
       ORDER BY created_at DESC LIMIT $${values.length}`,
      values,
    );
    return result.rows.map(rowToLead);
  }

  const sqliteClauses = [];
  const sqliteValues = [];
  if (filters.status) {
    sqliteClauses.push("status=?");
    sqliteValues.push(filters.status);
  }
  if (filters.assignedTo) {
    sqliteClauses.push("assigned_to=?");
    sqliteValues.push(filters.assignedTo);
  }
  if (filters.dateFrom) {
    sqliteClauses.push("created_at>=?");
    sqliteValues.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    sqliteClauses.push("created_at<=?");
    sqliteValues.push(filters.dateTo);
  }
  if (filters.search) {
    sqliteClauses.push("(request_code LIKE ? OR name LIKE ? OR phone LIKE ?)");
    const search = `%${filters.search}%`;
    sqliteValues.push(search, search, search);
  }
  sqliteValues.push(safeLimit);
  return sqlite
    .prepare(
      `SELECT * FROM leads ${sqliteClauses.length ? `WHERE ${sqliteClauses.join(" AND ")}` : ""}
       ORDER BY created_at DESC LIMIT ?`,
    )
    .all(...sqliteValues)
    .map(rowToLead);
}

async function listLeadsByPhone(phone) {
  const normalized = String(phone).replace(/\D/g, "").replace(/^84/, "0");
  if (config.dbDriver === "postgres") {
    const result = await pgPool.query(
      "SELECT * FROM leads WHERE phone=$1 ORDER BY created_at DESC LIMIT 50",
      [normalized],
    );
    return result.rows.map(rowToLead);
  }
  return sqlite
    .prepare("SELECT * FROM leads WHERE phone=? ORDER BY created_at DESC LIMIT 50")
    .all(normalized)
    .map(rowToLead);
}

async function getPendingOutbox(limit = 20) {
  const now = new Date().toISOString();
  if (config.dbDriver === "postgres") {
    const result = await pgPool.query(
      `SELECT * FROM outbox_jobs
       WHERE status IN ('pending','retry') AND next_run_at <= NOW()
       ORDER BY created_at ASC LIMIT $1`,
      [limit],
    );
    return result.rows.map((row) => ({ ...row, payload: row.payload }));
  }
  return sqlite
    .prepare(
      `SELECT * FROM outbox_jobs
       WHERE status IN ('pending','retry') AND next_run_at <= ?
       ORDER BY created_at ASC LIMIT ?`,
    )
    .all(now, limit)
    .map((row) => ({ ...row, payload: JSON.parse(row.payload) }));
}

async function updateOutbox(id, status, error = "") {
  const now = new Date();
  const next = new Date(now.getTime() + 60_000).toISOString();
  if (config.dbDriver === "postgres") {
    await pgPool.query(
      `UPDATE outbox_jobs SET status=$2,
       attempts=attempts + CASE WHEN $2='retry' THEN 1 ELSE 0 END,
       next_run_at=$3, last_error=$4, updated_at=$5 WHERE id=$1`,
      [id, status, next, String(error).slice(0, 1000), now.toISOString()],
    );
    return;
  }
  sqlite
    .prepare(
      `UPDATE outbox_jobs SET status=?,
       attempts=attempts + CASE WHEN ?='retry' THEN 1 ELSE 0 END,
       next_run_at=?, last_error=?, updated_at=? WHERE id=?`,
    )
    .run(
      status,
      status,
      next,
      String(error).slice(0, 1000),
      now.toISOString(),
      id,
    );
}

async function closeDatabase() {
  if (pgPool) await pgPool.end();
  if (sqlite) sqlite.close();
}

module.exports = {
  initDatabase,
  createLeadWithOutbox,
  getLeadByCode,
  listLeads,
  listLeadsByPhone,
  getPendingOutbox,
  updateOutbox,
  createOutboxJob,
  updateLeadStatus,
  updateLeadAssignment,
  closeDatabase,
};

const { config } = require("./config");
const { getPendingOutbox, updateOutbox, createOutboxJob } = require("./db");
const { processJob } = require("./jobs");

let redis;
let queue;
let timer;
let dispatching = false;

function getRedis() {
  if (!redis) {
    const Redis = require("ioredis");
    redis = new Redis(config.redisUrl, { maxRetriesPerRequest: null });
  }
  return redis;
}

function getQueue() {
  if (!queue) {
    const { Queue } = require("bullmq");
    queue = new Queue("khangcat-leads", { connection: getRedis() });
  }
  return queue;
}

async function dispatchInline(job) {
  await updateOutbox(job.id, "processing");
  try {
    await processJob(job.job_type, job.payload);
    await updateOutbox(job.id, "delivered");
    if (job.job_type === "email.admin") {
      await createOutboxJob(job.payload, "email.customer");
    }
  } catch (error) {
    await updateOutbox(job.id, "retry", error.message);
    console.error(`[job:${job.job_type}]`, error.message);
  }
}

async function dispatchRedis(job) {
  await getQueue().add(
    job.job_type,
    { outboxId: job.id, lead: job.payload },
    {
      jobId: job.id,
      attempts: 5,
      backoff: { type: "exponential", delay: 5_000 },
      removeOnComplete: { age: 86_400, count: 5_000 },
      removeOnFail: { age: 604_800, count: 10_000 },
    },
  );
  await updateOutbox(job.id, "dispatched");
}

async function dispatchPending() {
  if (dispatching) return;
  dispatching = true;
  try {
    const jobs = await getPendingOutbox(25);
    for (const job of jobs) {
      if (config.queueDriver === "redis") await dispatchRedis(job);
      else await dispatchInline(job);
    }
  } finally {
    dispatching = false;
  }
}

function startDispatcher() {
  dispatchPending().catch((error) => console.error("Outbox:", error.message));
  timer = setInterval(
    () => dispatchPending().catch((error) => console.error("Outbox:", error.message)),
    1_000,
  );
  timer.unref();
}

async function stopQueue() {
  if (timer) clearInterval(timer);
  if (queue) await queue.close();
  if (redis) await redis.quit();
}

module.exports = { startDispatcher, stopQueue, getRedis };

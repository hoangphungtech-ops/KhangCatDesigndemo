const { Worker } = require("bullmq");
const { config } = require("./config");
const {
  initDatabase,
  updateOutbox,
  createOutboxJob,
  closeDatabase,
} = require("./db");
const { processJob } = require("./jobs");
const { getRedis } = require("./queue");

async function main() {
  if (config.queueDriver !== "redis") {
    throw new Error("Worker riêng yêu cầu QUEUE_DRIVER=redis.");
  }
  await initDatabase();
  const worker = new Worker(
    "khangcat-leads",
    async (job) => {
      const { outboxId, lead } = job.data;
      try {
        const result = await processJob(job.name, lead);
        await updateOutbox(outboxId, "delivered");
        if (job.name === "email.admin") {
          await createOutboxJob(lead, "email.customer");
        }
        return result;
      } catch (error) {
        const finalAttempt = job.attemptsMade + 1 >= (job.opts.attempts || 1);
        if (finalAttempt) await updateOutbox(outboxId, "retry", error.message);
        throw error;
      }
    },
    { connection: getRedis(), concurrency: config.workerConcurrency },
  );

  worker.on("completed", (job) => console.log(`[worker] completed ${job.id}`));
  worker.on("failed", (job, error) =>
    console.error(`[worker] failed ${job?.id}: ${error.message}`),
  );

  const shutdown = async () => {
    await worker.close();
    await closeDatabase();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  console.log(`KHANGCAT worker: ${config.workerConcurrency} luồng xử lý`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

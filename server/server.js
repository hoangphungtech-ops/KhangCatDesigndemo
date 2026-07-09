const { config } = require("./src/config");
const { createApp, shutdown } = require("./src/app");

async function main() {
  const app = await createApp();
  const server = app.listen(config.port, () => {
    console.log(`KHANGCAT platform: http://localhost:${config.port}`);
    console.log(
      `DB=${config.dbDriver} Queue=${config.queueDriver} Email=${config.emailProvider}`,
    );
  });

  const stop = async () => {
    server.close(async () => {
      await shutdown();
      process.exit(0);
    });
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

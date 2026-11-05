import { runDailyTvGenerator } from "./generate-daily-tv";

runDailyTvGenerator()
  .then((res) => {
    console.log("✅ GitHub Action TV Generator finished:", res);
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Fatal Error:", err);
    process.exit(1);
  });

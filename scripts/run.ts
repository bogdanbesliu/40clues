import { runDailyGenerator } from "./generate-daily";

runDailyGenerator()
    .then((res) => {
        console.log("✅ GitHub Action Generator finished:", res);
        process.exit(0);
    })
    .catch((err) => {
        console.error("❌ Fatal Error:", err);
        process.exit(1);
    });
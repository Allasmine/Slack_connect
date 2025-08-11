import ngrok from "ngrok";
import fs from "fs";

(async function() {
  const url = await ngrok.connect({ addr: 5000 });
  console.log(`🚀 NGROK running at: ${url}`);

  // Update BASE_URL in .env
  let envFile = fs.readFileSync(".env", "utf8");
  envFile = envFile.replace(/BASE_URL=.*/g, `BASE_URL=${url}`);
  fs.writeFileSync(".env", envFile);
})();

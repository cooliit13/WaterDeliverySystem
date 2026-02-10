import { authorize, saveCredentials } from "./auth.js";

const code = process.argv[2];

if (!code) {
  console.error("❌ Provide the code: node google/save_token.js <CODE>");
  process.exit(1);
}

const main = async () => {
  const client = await authorize();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  await saveCredentials(client);
  console.log("✔ Token saved to google/token.json");
};

main();

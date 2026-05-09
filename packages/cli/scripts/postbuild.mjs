import { readFileSync, writeFileSync, chmodSync } from "node:fs";

const path = "./dist/rulestatus.js";
let content = readFileSync(path, "utf-8");

// Strip bun shebang and @bun marker added by bun build
content = content.replace(/^#![^\n]*\n(\/\/ @bun\n)?/, "");

writeFileSync(path, "#!/usr/bin/env node\n" + content);
chmodSync(path, 0o755);

console.log("  shebang patched → #!/usr/bin/env node");

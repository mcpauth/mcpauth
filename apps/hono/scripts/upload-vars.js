import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const projectRoot = process.cwd();
const devVarsPath = path.join(projectRoot, '.dev.vars');

/**
 * Parses the content of a .dev.vars file into a JavaScript object.
 * This function mimics the behavior of a robust awk script.
 * @param {string} fileContent
 * @returns {Record<string, string>}
 */
function parseDevVars(fileContent) {
  const vars = {};
  // Split content into blocks separated by one or more blank lines
  const blocks = fileContent.split(/\n\s*\n/);

  for (const block of blocks) {
    const trimmedBlock = block.trim();
    // Ignore empty blocks or blocks that are only comments
    if (!trimmedBlock || trimmedBlock.startsWith('#')) {
      continue;
    }

    // Find the first equals sign to separate key and value
    const eqIndex = trimmedBlock.indexOf('=');
    if (eqIndex === -1) {
      continue; // Not a valid key-value pair
    }

    const key = trimmedBlock.substring(0, eqIndex).trim();
    let value = trimmedBlock.substring(eqIndex + 1).trim();

    // If the value is wrapped in quotes, unwrap it.
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }

    vars[key] = value;
  }
  return vars;
}

function main() {
  try {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    const ignoreArg = args.find((arg) => arg.startsWith('--ignore='));

    const userIgnoreKeys = ignoreArg ? ignoreArg.split('=')[1].split(',') : [];
    const ignoreKeys = new Set([userIgnoreKeys]);

    console.log(`Reading variables from ${devVarsPath}...`);
    if (!fs.existsSync(devVarsPath)) {
      console.error(`Error: ${devVarsPath} not found.`);
      process.exit(1);
    }
    const devVarsContent = fs.readFileSync(devVarsPath, 'utf8');
    const newVars = parseDevVars(devVarsContent);

    if (Object.keys(newVars).length === 0) {
      console.log('No variables found in .dev.vars to upload.');
      process.exit(0);
    }

    if (dryRun) {
      console.log('DRY RUN MODE: No secrets will be uploaded.');
    }

    console.log('Uploading secrets to Cloudflare...');

    for (const [key, value] of Object.entries(newVars)) {
      if (ignoreKeys.has(key)) {
        console.log(`Skipping ignored key: ${key}`);
        continue;
      }

      if (dryRun) {
        console.log(`[DRY RUN] Would upload secret for key: ${key}`);
      } else {
        try {
          console.log(`Uploading secret for ${key}...`);
          execSync(`npx wrangler secret put ${key}`,
            {
              input: value,
              stdio: ['pipe', 'inherit', 'inherit'],
            });
          console.log(`✅ Successfully uploaded secret for ${key}.`);
        } catch (error) {
          console.error(`❌ Failed to upload secret for ${key}.`);
          // Continue with next secret
        }
      }
    }

    console.log('✅ Secret upload process finished.');
  } catch (error) {
    console.error('❌ An error occurred:', error.message);
    process.exit(1);
  }
}

main();


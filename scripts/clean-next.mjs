/**
 * Removes .next before Next.js gets a chance to.
 *
 * Why this exists: on OneDrive-synced folders, Files On-Demand stores entries
 * as cloud reparse points. Next's own recursiveDelete calls fs.readlink on
 * each entry, which throws EINVAL on a reparse point (it is not a symlink), so
 * `next dev` dies on startup with:
 *
 *   EINVAL: invalid argument, readlink '...\.next\server\app-paths-manifest.json'
 *
 * Deleting the directory ourselves with force+recursive sidesteps readlink
 * entirely. It only runs where the problem exists - Windows, inside a synced
 * folder - so moving the project out of OneDrive silently disables it and you
 * get incremental builds back.
 */
import { rmSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const dist = resolve(root, ".next");

const onSyncedWindows =
  process.platform === "win32" && /OneDrive|Dropbox|Google Drive/i.test(root);

if (!onSyncedWindows) process.exit(0);
if (!existsSync(dist)) process.exit(0);

try {
  rmSync(dist, { recursive: true, force: true, maxRetries: 5, retryDelay: 120 });
  console.log("[clean-next] removed .next (OneDrive reparse-point workaround)");
} catch (error) {
  console.warn(
    `[clean-next] could not remove .next: ${error.message}\n` +
      "  Close any running dev server and delete the folder manually.",
  );
}

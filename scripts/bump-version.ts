import { readFileSync, writeFileSync, copyFileSync } from "fs";
import semver from "semver";

const targetVersion = process.env.npm_package_version;

if (!targetVersion || !semver.valid(targetVersion)) {
	throw new Error(`Invalid version format: ${targetVersion}`);
}

function updateVersionFile(filePath: string, updater: (data: any) => any) {
	const backupPath = `${filePath}.backup`;
	copyFileSync(filePath, backupPath);
	
	try {
		const data = JSON.parse(readFileSync(filePath, "utf8"));
		const updated = updater(data);
		writeFileSync(filePath, JSON.stringify(updated, null, "\t"));
		return updated;
	} catch (error) {
		copyFileSync(backupPath, filePath);
		throw error;
	}
}

const manifest = updateVersionFile("manifest.json", (manifest) => {
	manifest.version = targetVersion;
	return manifest;
});

updateVersionFile("manifest-beta.json", (manifest) => {
	manifest.version = targetVersion;
	return manifest;
});

updateVersionFile("versions.json", (versions) => {
	versions[targetVersion] = manifest.minAppVersion;
	return versions;
});

console.log(`Successfully bumped version to ${targetVersion} 🦍`);

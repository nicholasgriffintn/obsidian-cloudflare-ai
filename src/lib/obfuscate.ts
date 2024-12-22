export function obfuscate(str: string): string {
	return str.length > 0 ? str.replace(/^(.{3})(.*)(.{4})$/, "$1****$3") : "";
}

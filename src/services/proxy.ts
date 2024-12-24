import { fetchWithRequestUrl } from "../lib/fetch";
import type { Logger } from "../lib/logger";

export class ProxyService {
	constructor(private readonly logger: Logger) {}

	async fetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
		try {
			return await fetchWithRequestUrl(input, init);
		} catch (error) {
			this.logger.error("Proxy request failed:", {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			});
			throw error;
		}
	}
}

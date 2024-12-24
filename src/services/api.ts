import type { Logger } from "../lib/logger";
import { ProxyService } from "./proxy";

export class ApiService {
	private readonly proxyService: ProxyService;

	constructor(private readonly logger: Logger) {
		this.proxyService = new ProxyService(logger);
	}

	private sanitizeStreamingResponse(chunk: string, response: Response): string {
		if (response.status >= 300) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		const lines = chunk.split("\n");
		let result = "";

		for (const line of lines) {
			const cleanLine = line.replace(/^data: /, "").trim();
			if (!cleanLine || cleanLine === "[DONE]") continue;

			try {
				const parsed = JSON.parse(cleanLine);
				if (parsed.response) {
					result += parsed.response;
				}
			} catch {
				if (cleanLine !== "[DONE]") {
					result += cleanLine;
				}
			}
		}

		return result;
	}

	private sanitizeResponse(data: any, response: Response): any[] {
		if (response.status >= 300) {
			const errorMessage = data?.error?.message || JSON.stringify(data);
			throw new Error(errorMessage);
		}

		return data.result;
	}

	async post<T>(
		url: string,
		body: any,
		headers?: Record<string, string>,
		options?: Record<string, any>,
	): Promise<T> {
		try {
			this.logger.debug("Starting API request", { url, body });
			const response = await this.proxyService.fetch(url, {
				method: "POST",
				headers: {
					...headers,
					Accept: "text/event-stream",
					"Content-Type": "application/json",
				},
				body: JSON.stringify(body),
			});

			this.logger.debug("API request completed", { response });

			if (!response.ok) {
				const resText = await response.text();
				const resJson = this.parseResponse(resText);
				throw JSON.stringify(resJson);
			}

			if (options?.stream) {
				return this.handleStreamingResponse(response, options) as Promise<T>;
			}

			const resText = await response.text();
			const resJson = this.parseResponse(resText);
			return this.sanitizeResponse(resJson, response) as T;
		} catch (error) {
			this.logger.error("API request failed:", {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			});
			throw error;
		}
	}

	private parseResponse(resText: string): any {
		try {
			return JSON.parse(resText);
		} catch {
			return resText;
		}
	}

	private async handleStreamingResponse(
		response: Response,
		options: Record<string, any>,
	): Promise<string> {
		if (!response.body) throw new Error("No body in response");

		const reader = response.body.getReader();
		const decoder = new TextDecoder();
		let isFirst = true;
		let text = "";

		try {
			while (true) {
				const { value, done } = await reader.read();
				this.logger.debug("Streaming response", { value, done });
				if (done) break;

				const chunk = decoder.decode(value, { stream: true });
				const chunkValue = this.sanitizeStreamingResponse(chunk, response);

				if (chunkValue) {
					text += chunkValue;
					options?.onToken?.(chunkValue, isFirst);
					isFirst = false;
				}
			}
		} finally {
			reader.releaseLock();
		}

		return text;
	}
}

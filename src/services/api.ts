import type { Logger } from "../lib/logger";
import { ProxyService } from "./proxy";
import { ApiError } from "../lib/errors";

export interface StreamingOptions {
	onToken?: (chunk: string, isFirst: boolean) => void;
	stream?: boolean;
}

export interface ApiResponse<T> {
	result: T;
	error?: {
		message: string;
	};
}

export class ApiService {
	private readonly proxyService: ProxyService;
	private readonly decoder = new TextDecoder();

	constructor(private readonly logger: Logger) {
		this.proxyService = new ProxyService(logger);
	}

	/**
	 * Handles HTTP POST requests with support for both regular and streaming responses
	 * @param url - The endpoint URL
	 * @param body - Request payload
	 * @param headers - Optional custom headers
	 * @param options - Optional streaming configuration
	 * @returns Promise resolving to the response data
	 * @throws ApiError if the request fails
	 */
	async post<T>(
		url: string,
		body: unknown,
		headers?: Record<string, string>,
		options?: StreamingOptions,
	): Promise<T> {
		try {
			this.logger.debug("Starting API request", { url, body });

			const response = await this.makeRequest(url, body, headers);

			if (!response.ok) {
				await this.handleErrorResponse(response);
			}

			return options?.stream
				? ((await this.handleStreamingResponse(response, options)) as T)
				: await this.handleRegularResponse<T>(response);
		} catch (error) {
			this.handleError(error);
			throw error;
		}
	}

	private async makeRequest(
		url: string,
		body: unknown,
		headers?: Record<string, string>,
	): Promise<Response> {
		return this.proxyService.fetch(url, {
			method: "POST",
			headers: {
				Accept: "text/event-stream",
				"Content-Type": "application/json",
				...headers,
			},
			body: JSON.stringify(body),
		});
	}

	private async handleErrorResponse(response: Response): Promise<never> {
		const text = await response.text();
		const data = this.safeParseJson(text);
		const message =
			data?.error?.message || `HTTP ${response.status}: ${response.statusText}`;
		throw new ApiError(response.status, message, data);
	}

	private async handleRegularResponse<T>(response: Response): Promise<T> {
		const text = await response.text();
		const data = this.safeParseJson(text) as ApiResponse<T>;

		if (!data.result) {
			throw new ApiError(
				response.status,
				"Invalid response format: missing 'result' field",
				data,
			);
		}

		return data.result;
	}

	private async handleStreamingResponse(
		response: Response,
		options: StreamingOptions,
	): Promise<string> {
		if (!response.body) {
			throw new ApiError(response.status, "No response body available");
		}

		const reader = response.body.getReader();
		let isFirst = true;
		let accumulatedText = "";

		try {
			while (true) {
				const { value, done } = await reader.read();

				if (done) break;

				this.logger.debug("Streaming chunk", { chunk: value });

				const chunk = this.decoder.decode(value, { stream: true });
				const processedChunk = this.processStreamingChunk(chunk);

				if (processedChunk) {
					accumulatedText += processedChunk;
					options.onToken?.(processedChunk, isFirst);
					isFirst = false;
				}
			}

			return accumulatedText;
		} finally {
			reader.releaseLock();
		}
	}

	private processStreamingChunk(chunk: string): string {
		const lines = chunk.split("\n");
		let result = '';
		
		for (const line of lines) {
			const processed = this.processStreamingLine(line);
			if (processed) {
				result += processed;
			}
		}
		return result;
	}

	private processStreamingLine(line: string): string {
		const cleanLine = line.replace(/^data: /, "").trim();

		if (!cleanLine || cleanLine === "[DONE]") {
			return "";
		}

		try {
			const parsed = this.safeParseJson(cleanLine);
			return parsed?.response ?? "";
		} catch {
			return "";
		}
	}

	private safeParseJson(text: string): any {
		try {
			return JSON.parse(text);
		} catch {
			return null;
		}
	}

	private handleError(error: unknown): void {
		this.logger.error("API request failed:", {
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
			type: error instanceof ApiError ? "ApiError" : "UnknownError",
		});
	}
}

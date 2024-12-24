import { fetchWithRequestUrl } from "../lib/fetch";
import type { Logger } from "../lib/logger";
import { ProxyError } from "../lib/errors";

export interface ProxyConfig {
	maxRetries?: number;
	timeout?: number;
	retryDelay?: number;
	defaultHeaders?: Record<string, string>;
}

export class ProxyService {
	private readonly config: Required<ProxyConfig> = {
		maxRetries: 1,
		timeout: 30000,
		retryDelay: 1000,
		defaultHeaders: {},
	};

	constructor(private readonly logger: Logger, config?: ProxyConfig) {
		if (config) {
			this.config = { ...this.config, ...config };
		}
	}

	async fetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
		let lastError: Error | undefined;

		for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
			try {
				if (attempt > 0) {
					this.logger.info("Retrying proxy request", {
						attempt,
						url: typeof input === "string" ? input : input.url,
					});
				}

				const enhancedInit = this.enhanceRequestInit(init);

				const controller = new AbortController();
				const timeoutId = setTimeout(() => {
					controller.abort();
				}, this.config.timeout);

				try {
					const response = await fetchWithRequestUrl(input, {
						...enhancedInit,
						signal: controller.signal,
					});

					if (
						this.shouldRetry(response) &&
						attempt < this.config.maxRetries - 1
					) {
						lastError = new ProxyError(
							`Received status ${response.status}`,
							undefined,
							input,
						);
						await this.delay(this.getRetryDelay(attempt));
						continue;
					}

					return response;
				} finally {
					clearTimeout(timeoutId);
				}
			} catch (error) {
				lastError = this.normalizeError(error, input);

				if (
					(error instanceof DOMException && error.name === "AbortError") ||
					attempt === this.config.maxRetries - 1
				) {
					this.logError(lastError, attempt);
					throw lastError;
				}

				await this.delay(this.getRetryDelay(attempt));
			}
		}

		throw (
			lastError || new ProxyError("Maximum retries exceeded", undefined, input)
		);
	}

	private shouldRetry(response: Response): boolean {
		return [429, 503, 504].includes(response.status);
	}

	private enhanceRequestInit(init?: RequestInit): RequestInit {
		return {
			...init,
			headers: {
				...this.config.defaultHeaders,
				...init?.headers,
			},
		};
	}

	private getRetryDelay(attempt: number): number {
		return Math.min(
			this.config.retryDelay * Math.pow(2, attempt),
			10000,
		);
	}

	private normalizeError(error: unknown, request: RequestInfo): ProxyError {
		if (error instanceof Error) {
			return new ProxyError(error.message, error, request);
		}
		return new ProxyError(String(error), undefined, request);
	}

	private logError(error: Error, attempt: number): void {
		this.logger.error("Proxy request failed:", {
			error: error.message,
			stack: error.stack,
			attempt: attempt + 1,
			maxRetries: this.config.maxRetries,
		});
	}

	private delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}

import { Notice, request } from "obsidian";

import type {
	Vector,
	VectorQuery,
	VectorSearchResult,
	CloudflareResponse,
	FilterOperator,
	VectorizeFilter,
	VectorizeMetadataField,
} from "../types";
import type { Logger } from "./logger";

const BASE_CLOUDFLARE_API_URL =
	"https://api.cloudflare.com/client/v4/accounts/";

type RequestType = "ndjson" | "json";

export class CloudflareVectorize {
	private static readonly RETRY_DELAY_MS = 1000;
	private static readonly UPSTREAM_TIMEOUT_ERROR = "vectorize.upstream_timeout";

	constructor(
		private readonly logger: Logger,
		private readonly accountId: string,
		private readonly apiKey: string,
		private readonly indexName: string,
	) {}

	private validateConfig(): void {
		if (!this.accountId) {
			throw new Error("Account ID is required");
		}
		if (!this.apiKey) {
			throw new Error("API key is required");
		}
		if (!this.indexName) {
			throw new Error("Index name is required");
		}
	}

	private getEndpointUrl(endpoint: string): string {
		return `${BASE_CLOUDFLARE_API_URL}${this.accountId}/vectorize/v2/${endpoint}`;
	}

	private getContentType(type: RequestType): string {
		return type === "json" ? "application/json" : "application/x-ndjson";
	}

	private formatRequestBody(body: any, type: RequestType): string {
		if (type === "json") {
			return JSON.stringify(body);
		}
		return body.map((item: any) => JSON.stringify(item)).join("\n");
	}

	private async delay(attempt: number): Promise<void> {
		await new Promise((resolve) =>
			setTimeout(resolve, attempt * CloudflareVectorize.RETRY_DELAY_MS),
		);
	}

	private displayError(error: unknown): void {
		const errorMessage = error instanceof Error ? error.message : String(error);
		this.logger.error("Vectorize API error:", {
			error: errorMessage,
			stack: error instanceof Error ? error.stack : undefined,
		});
		new Notice(`Vectorize API error: ${errorMessage}`, 5000);
	}

	private async makeRequest<T>(
		endpoint: string,
		method: string,
		body: any,
		retries = 3,
		type: RequestType,
	): Promise<T | null> {
		for (let attempt = 1; attempt <= retries; attempt++) {
			try {
				const formattedBody = this.formatRequestBody(body, type);
				const contentType = this.getContentType(type);

				const response = await request({
					url: this.getEndpointUrl(endpoint),
					method,
					headers: {
						Authorization: `Bearer ${this.apiKey}`,
						"Content-Type": contentType,
					},
					body: formattedBody,
					throw: false,
				});

				let data: CloudflareResponse<T>;
				try {
					data = JSON.parse(response);
				} catch (error) {
					throw new Error("Invalid JSON response from Vectorize API");
				}

				if (!data.success) {
					const firstError = data.errors?.[0];
					if (
						firstError?.message ===
							CloudflareVectorize.UPSTREAM_TIMEOUT_ERROR &&
						attempt < retries
					) {
						await this.delay(attempt);
						continue;
					}
					throw new Error(
						data.errors?.map((error) => error.message).join(", ") ??
							"Unknown error",
					);
				}

				return (data.result as T) ?? null;
			} catch (error) {
				const isLastAttempt = attempt === retries;
				if (isLastAttempt) {
					this.displayError(
						error instanceof Error ? error.message : String(error),
					);
					throw error;
				}
				await this.delay(attempt);
			}
		}
		return null;
	}

	async upsertVectors(vectors: Vector[]): Promise<boolean> {
		try {
			this.validateConfig();

			const formattedVectors = vectors.map((vector) => ({
				...vector,
				values: Array.isArray(vector.values[0])
					? vector.values[0]
					: vector.values,
			}));

			this.logger.debug("Formatted vectors:", formattedVectors);

			const result = await this.makeRequest<{ mutationId: string }>(
				`indexes/${this.indexName}/upsert`,
				"POST",
				formattedVectors,
				3,
				"ndjson",
			);

			return Boolean(result?.mutationId);
		} catch (error) {
			this.displayError(`Failed to upsert vectors: ${error}`);
			return false;
		}
	}

	async queryVectors(query: VectorQuery): Promise<VectorSearchResult | null> {
		try {
			this.validateConfig();
			this.validateFilter(query.filter);

			return await this.makeRequest<VectorSearchResult>(
				`indexes/${this.indexName}/query`,
				"POST",
				query,
				1,
				"json",
			);
		} catch (error) {
			this.displayError(`Failed to query vectors: ${error}`);
			return null;
		}
	}

	private validateFilter(filter?: VectorizeFilter): void {
		if (!filter) {
			return;
		}

		const allowedFields: VectorizeMetadataField[] = [
			"type",
			"createdMonth",
			"createdYear",
			"modifiedMonth",
			"modifiedYear",
			"extension",
		];

		const allowedOperators: FilterOperator[] = [
			"$eq",
			"$ne",
			"$in",
			"$nin",
			"$lt",
			"$lte",
			"$gt",
			"$gte",
		];

		for (const [field, condition] of Object.entries(filter)) {
			if (!allowedFields.includes(field as VectorizeMetadataField)) {
				throw new Error(`Invalid filter field: ${field}`);
			}

			if (typeof condition === "object" && condition !== null) {
				const operators = Object.keys(condition) as FilterOperator[];
				for (const op of operators) {
					if (!allowedOperators.includes(op)) {
						throw new Error(`Invalid operator: ${op}`);
					}
				}

				const hasRangeQuery = operators.some((op) =>
					["$lt", "$lte", "$gt", "$gte"].includes(op),
				);
				if (hasRangeQuery) {
					const invalidCombination = operators.some((op) =>
						["$eq", "$ne", "$in", "$nin"].includes(op),
					);
					if (invalidCombination) {
						throw new Error(
							"Range queries cannot be combined with other operators",
						);
					}
				}
			}
		}
	}

	async deleteVectorsByIds(ids: string[]): Promise<boolean> {
		try {
			this.validateConfig();

			const result = await this.makeRequest<{ mutationId: string }>(
				`indexes/${this.indexName}/delete_by_ids`,
				"POST",
				{ ids },
				3,
				"json",
			);

			return Boolean(result?.mutationId);
		} catch (error) {
			this.displayError(`Failed to delete vectors: ${error}`);
			return false;
		}
	}
}

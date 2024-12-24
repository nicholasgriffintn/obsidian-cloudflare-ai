// Original: https://github.com/nhaouari/obsidian-textgenerator-plugin
// Credit: https://github.com/haouarihk

import { requestUrl } from "obsidian";
import type { RequestUrlParam, RequestUrlResponse } from "obsidian";

const STATUS_TEXTS: Readonly<Record<number, string>> = {
	200: "OK",
	201: "Created",
	202: "Accepted",
	204: "No Content",
	300: "Multiple Choices",
	301: "Moved Permanently",
	302: "Found",
	304: "Not Modified",
	400: "Bad Request",
	401: "Unauthorized",
	403: "Forbidden",
	404: "Not Found",
	408: "Request Timeout",
	409: "Conflict",
	429: "Too Many Requests",
	500: "Internal Server Error",
	502: "Bad Gateway",
	503: "Service Unavailable",
	504: "Gateway Timeout",
} as const;

export async function fetchWithRequestUrl(
	input: RequestInfo,
	init?: RequestInit & { throw?: boolean },
): Promise<Response> {
	const url = typeof input === "string" ? input : input.url;
	const options =
		typeof input === "object"
			? { ...init, ...(await requestToObject(input)) }
			: init || {};

	const params: RequestUrlParam = {
		url,
		method: options.method || "GET",
		headers: options.headers as Record<string, string>,
		body: options.body as string | ArrayBuffer,
		throw: false,
	};

	const headers = options.headers as Record<string, string>;

	const contentType = headers["Content-Type"];
	if (contentType) {
		params.contentType = contentType;
	}

	const isStreaming = headers["Accept"] === "text/event-stream";

	try {
		const response = await requestUrl(params);
		return createFetchResponse(response, url, isStreaming, options.throw);
	} catch (error) {
		throw new Error(
			`Fetch request failed: ${
				error instanceof Error ? error.message : String(error)
			}`,
		);
	}
}

function createFetchResponse(
	response: RequestUrlResponse,
	url: string,
	isStreaming: boolean,
	throwOnError?: boolean,
): Response {
	const ok = response.status >= 200 && response.status < 300;

	if (!ok && throwOnError !== false) {
		throw new Error(`HTTP error! status: ${response.status}`);
	}

	const baseResponse = {
		ok,
		status: response.status,
		statusText: STATUS_TEXTS[response.status] || "",
		headers: new Headers(response.headers),
		url,
		type: "basic" as ResponseType,
		redirected: false,
		bodyUsed: false,
		arrayBuffer: () => Promise.resolve(response.arrayBuffer),
		text: () => Promise.resolve(response.text),
		json: () => Promise.resolve(response.json),
		blob: () => Promise.reject(new Error("Blob responses not supported")),
		formData: () => Promise.reject(new Error("FormData responses not supported")),
		clone: () => { throw new Error("Response cloning not supported"); }
	};

	if (isStreaming) {
		const lines = response.text.split('\n');
		let lineIndex = 0;
		const encoder = new TextEncoder();

		const stream = new ReadableStream({
			start(controller) {
				function pushChunk() {
					if (lineIndex < lines.length) {
						const line = lines[lineIndex] + '\n';
						controller.enqueue(encoder.encode(line));
						lineIndex++;
						setTimeout(pushChunk, 1);
					} else {
						controller.close();
					}
				}
				pushChunk();
			}
		});

		return {
			...baseResponse,
			body: stream
		};
	}

	return {
		...baseResponse,
		body: null
	};
}

async function requestToObject(request: Request): Promise<Record<string, any>> {
	const contentType = request.headers.get("content-type")?.toLowerCase();
	const body = contentType
		? await getRequestBody(request, contentType)
		: undefined;

	return {
		url: request.url,
		method: request.method,
		headers: Object.fromEntries(request.headers),
		...(body && { body }),
	};
}

async function getRequestBody(
	request: Request,
	contentType: string,
): Promise<any> {
	if (contentType.includes("application/json")) {
		return JSON.stringify(await request.json());
	}
	if (contentType.includes("form")) {
		return request.formData();
	}
	return request.text();
}

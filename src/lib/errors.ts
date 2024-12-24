export class ApiError extends Error {
	constructor(
		public readonly status: number,
		message: string,
		public readonly response?: any,
	) {
		super(message);
		this.name = "ApiError";
	}
}

export class ProxyError extends Error {
	constructor(
		message: string,
		public readonly cause?: Error,
		public readonly request?: RequestInfo,
	) {
		super(message);
		this.name = "ProxyError";
	}
}

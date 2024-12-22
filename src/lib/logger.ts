export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}

export class Logger {
    private readonly logLevel: LogLevel;

    constructor(logLevel?: string) {
        if (!logLevel) {
            logLevel = "error";
        }
        this.logLevel = this.parseLogLevel(logLevel);
    }

    private parseLogLevel(level: string): LogLevel {
        switch (level?.toLowerCase()) {
            case 'debug':
                return LogLevel.DEBUG;
            case 'info':
                return LogLevel.INFO;
            case 'warn':
                return LogLevel.WARN;
            case 'error':
                return LogLevel.ERROR;
            default:
                return LogLevel.ERROR;
        }
    }

    public debug(...args: any[]) {
        if (this.logLevel <= LogLevel.DEBUG) {
            console.log(...args);
        }
    }

    public info(...args: any[]) {
        if (this.logLevel <= LogLevel.INFO) {
            console.log(...args);
        }
    }

    public warn(...args: any[]) {
        if (this.logLevel <= LogLevel.WARN) {
            console.warn(...args);
        }
    }

    public error(...args: any[]) {
        if (this.logLevel <= LogLevel.ERROR) {
            console.error(...args);
        }
    }
}
import { getLoggerConfig, loggerConfig } from './logger-config';
import type { LoggerConfig, LogLevelType, LogOutput } from '../types';
import { LogLevel } from '../types';

export class Logger {
    private logLevel: LogLevel;
    private readonly useTimestamp: boolean;
    private readonly output: LogOutput;
    private readonly serviceName?: string;

    constructor(config: Partial<LoggerConfig> = {}) {
        const globalConfig = getLoggerConfig();
        const mergedConfig = { ...globalConfig, ...config };
        
        this.logLevel = this.parseLogLevel(mergedConfig.level || 'error');
        this.useTimestamp = mergedConfig.useTimestamp ?? true;
        this.output = mergedConfig.output || console;
        this.serviceName = mergedConfig.serviceName;

        loggerConfig.addListener((newConfig) => {
            this.logLevel = this.parseLogLevel(newConfig.level || 'error');
        });
    }

    private parseLogLevel(level: string): LogLevel {
        const normalizedLevel = level.toLowerCase() as LogLevelType;
        const levelMap: Record<LogLevelType, LogLevel> = {
            debug: LogLevel.DEBUG,
            info: LogLevel.INFO,
            warn: LogLevel.WARN,
            error: LogLevel.ERROR,
        };

        if (!(normalizedLevel in levelMap)) {
            throw new Error(`Invalid log level: ${level}`);
        }

        return levelMap[normalizedLevel];
    }

    private formatLogMessage(level: string, message: string, metadata?: Record<string, any>): string {
        const timestamp = this.useTimestamp ? new Date().toISOString() : '';
        const prefix = [timestamp, this.serviceName, level].filter(Boolean).join(' | ');
        const metadataStr = metadata ? ` ${JSON.stringify(metadata)}` : '';
        return `${prefix}: ${message}${metadataStr}`;
    }

    public setLogLevel(level: LogLevelType): void {
        this.logLevel = this.parseLogLevel(level);
    }

    public getLogLevel(): LogLevelType {
        return LogLevel[this.logLevel].toLowerCase() as LogLevelType;
    }

    public isLevelEnabled(level: LogLevelType): boolean {
        return this.parseLogLevel(level) >= this.logLevel;
    }

    public debug(message: string, metadata?: Record<string, any>): void {
        if (this.logLevel <= LogLevel.DEBUG) {
            const formattedMessage = this.formatLogMessage('debug', message, metadata);
            this.output.debug(formattedMessage);
        }
    }

    public info(message: string, metadata?: Record<string, any>): void {
        if (this.logLevel <= LogLevel.INFO) {
            const formattedMessage = this.formatLogMessage('info', message, metadata);
            this.output.info(formattedMessage);
        }
    }

    public warn(message: string, metadata?: Record<string, any>): void {
        if (this.logLevel <= LogLevel.WARN) {
            const formattedMessage = this.formatLogMessage('warn', message, metadata);
            this.output.warn(formattedMessage);
        }
    }

    public error(message: string, metadata?: Record<string, any>): void {
        if (this.logLevel <= LogLevel.ERROR) {
            const formattedMessage = this.formatLogMessage('error', message, metadata);
            this.output.error(formattedMessage);
        }
    }

    destroy() {
        loggerConfig.removeListener(this.onConfigChange);
    }

    private onConfigChange = (newConfig: LoggerConfig) => {
        this.logLevel = this.parseLogLevel(newConfig.level || 'error');
    };
}
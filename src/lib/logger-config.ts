import type { LoggerConfig, LogLevelType } from '../types';
import { PLUGIN_NAME } from '../constants';

export type LogOutput = {
    log: (message: string) => void;
    error: (message: string) => void;
    warn: (message: string) => void;
    info: (message: string) => void;
    debug: (message: string) => void;
};

export const DEFAULT_LOGGER_CONFIG: LoggerConfig = {
    level: 'error',
    useTimestamp: true,
    output: console as LogOutput,
    serviceName: PLUGIN_NAME
};

class LoggerConfigManager {
    private config: LoggerConfig = { ...DEFAULT_LOGGER_CONFIG };
    private listeners: Set<(config: LoggerConfig) => void> = new Set();

    setConfig(newConfig: Partial<LoggerConfig>) {
        this.config = { ...this.config, ...newConfig };
        this.notifyListeners();
    }

    getConfig(): LoggerConfig {
        return this.config;
    }

    addListener(listener: (config: LoggerConfig) => void) {
        this.listeners.add(listener);
    }

    removeListener(listener: (config: LoggerConfig) => void) {
        this.listeners.delete(listener);
    }

    private notifyListeners() {
        this.listeners.forEach(listener => listener(this.config));
    }
}

export const loggerConfig = new LoggerConfigManager();

export const setGlobalLoggerConfig = (config: Partial<LoggerConfig>) => {
    loggerConfig.setConfig(config);
};

export const getLoggerConfig = () => loggerConfig.getConfig();
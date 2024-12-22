// @ts-ignore
export const safeStorage = window.electron?.remote?.safeStorage ?? {
	isEncryptionAvailable: () => false,
	encryptString: (text: string) => Buffer.from(text),
	decryptString: (buffer: Buffer) => buffer.toString(),
};

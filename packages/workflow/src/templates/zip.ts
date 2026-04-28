import { inflateRawSync } from 'node:zlib';

export type ZipEntry = {
    name: string;
    data: Buffer;
};

function readUInt16(buffer: Buffer, offset: number): number {
    if (offset + 2 > buffer.length)
        throw new Error('Corrupt ZIP: unexpected EOF');
    return buffer.readUInt16LE(offset);
}

function readUInt32(buffer: Buffer, offset: number): number {
    if (offset + 4 > buffer.length)
        throw new Error('Corrupt ZIP: unexpected EOF');
    return buffer.readUInt32LE(offset);
}

function isUnsafeEntry(name: string): boolean {
    return name.startsWith('/') || name.startsWith('\\') || name.includes('..') || name.includes('\\');
}

function readLocalZipEntries(buffer: Buffer): ZipEntry[] {
    const entries: ZipEntry[] = [];
    let cursor = 0;
    while (cursor + 30 <= buffer.length) {
        if (buffer.readUInt32LE(cursor) !== 0x04034b50)
            break;
        const method = readUInt16(buffer, cursor + 8);
        const compressedSize = readUInt32(buffer, cursor + 18);
        const uncompressedSize = readUInt32(buffer, cursor + 22);
        const nameLength = readUInt16(buffer, cursor + 26);
        const extraLength = readUInt16(buffer, cursor + 28);
        const nameStart = cursor + 30;
        const name = buffer.subarray(nameStart, nameStart + nameLength).toString('utf-8');
        if (isUnsafeEntry(name))
            throw new Error(`Unsafe archive entry path traversal rejected: ${name}`);
        const dataStart = nameStart + nameLength + extraLength;
        const compressed = buffer.subarray(dataStart, dataStart + compressedSize);
        let data: Buffer;
        if (method === 0)
            data = Buffer.from(compressed);
        else if (method === 8)
            data = inflateRawSync(compressed);
        else
            throw new Error(`Unsupported ZIP compression method ${method} for ${name}`);
        if (data.length !== uncompressedSize)
            throw new Error(`Corrupt ZIP entry size mismatch: ${name}`);
        entries.push({ name, data });
        cursor = dataStart + compressedSize;
    }
    if (entries.length === 0)
        throw new Error('Corrupt ZIP: end of central directory not found');
    return entries;
}

export function readZipEntries(buffer: Buffer): ZipEntry[] {
    if (buffer.length > 25 * 1024 * 1024)
        throw new Error('ZIP exceeds template extraction resource limit');
    let eocdOffset = -1;
    for (let offset = buffer.length - 22; offset >= Math.max(0, buffer.length - 65557); offset -= 1) {
        if (buffer.readUInt32LE(offset) === 0x06054b50) {
            eocdOffset = offset;
            break;
        }
    }
    if (eocdOffset < 0)
        return readLocalZipEntries(buffer);
    const entryCount = readUInt16(buffer, eocdOffset + 10);
    const centralDirOffset = readUInt32(buffer, eocdOffset + 16);
    const entries: ZipEntry[] = [];
    let cursor = centralDirOffset;
    for (let index = 0; index < entryCount; index += 1) {
        if (readUInt32(buffer, cursor) !== 0x02014b50)
            throw new Error('Corrupt ZIP: invalid central directory');
        const method = readUInt16(buffer, cursor + 10);
        const compressedSize = readUInt32(buffer, cursor + 20);
        const uncompressedSize = readUInt32(buffer, cursor + 24);
        const nameLength = readUInt16(buffer, cursor + 28);
        const extraLength = readUInt16(buffer, cursor + 30);
        const commentLength = readUInt16(buffer, cursor + 32);
        const localHeaderOffset = readUInt32(buffer, cursor + 42);
        const name = buffer.subarray(cursor + 46, cursor + 46 + nameLength).toString('utf-8');
        if (isUnsafeEntry(name))
            throw new Error(`Unsafe archive entry path traversal rejected: ${name}`);
        if (readUInt32(buffer, localHeaderOffset) !== 0x04034b50)
            throw new Error('Corrupt ZIP: invalid local header');
        const localNameLength = readUInt16(buffer, localHeaderOffset + 26);
        const localExtraLength = readUInt16(buffer, localHeaderOffset + 28);
        const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
        const compressed = buffer.subarray(dataStart, dataStart + compressedSize);
        let data: Buffer;
        if (method === 0)
            data = Buffer.from(compressed);
        else if (method === 8)
            data = inflateRawSync(compressed);
        else
            throw new Error(`Unsupported ZIP compression method ${method} for ${name}`);
        if (data.length !== uncompressedSize)
            throw new Error(`Corrupt ZIP entry size mismatch: ${name}`);
        entries.push({ name, data });
        cursor += 46 + nameLength + extraLength + commentLength;
    }
    return entries;
}

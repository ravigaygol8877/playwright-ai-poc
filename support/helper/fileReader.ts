import fs from 'fs';
import path from 'path';

export function readJson(fileName: string) {
    const filePath = path.join('support', 'data', `${fileName}.json`);
    if (!fs.existsSync(filePath)) {
        throw new Error(`JSON file not found: ${filePath}`);
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

export function loadCSV(filePath: string): string[] {
    return fs.readFileSync(filePath, 'utf-8')
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0);
}

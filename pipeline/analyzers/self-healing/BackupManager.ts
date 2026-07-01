import fs from "fs";
import path from "path";
import crypto from "crypto";

interface BackupMetadata {
  timestamp: string;
  hash: string;
  fileName: string;
  originalPath: string;
  description: string | undefined;
}

export class BackupManager {
  private readonly backupDir = "pipeline/backups/pom-healing";

  constructor() {
    this.ensureBackupDir();
  }

  /**
   * Creates a backup of a POM file before modification.
   * Returns backup metadata including version identifier.
   */
  createBackup(
    pomFilePath: string,
    description?: string
  ): { backupVersion: string; backupPath: string } {
    const content = fs.readFileSync(pomFilePath, "utf-8");
    const hash = this.calculateHash(content);

    // Check if this exact content already exists in backups
    const existingBackup = this.findBackupByHash(hash);
    if (existingBackup) {
      return {
        backupVersion: existingBackup.hash.substring(0, 8),
        backupPath: path.join(this.backupDir, existingBackup.fileName),
      };
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `${path.basename(pomFilePath)}.${hash.substring(0, 8)}.${timestamp}.backup`;
    const backupPath = path.join(this.backupDir, fileName);

    fs.writeFileSync(backupPath, content, "utf-8");

    // Write metadata
    const metadata: BackupMetadata = {
      timestamp,
      hash,
      fileName,
      originalPath: pomFilePath,
      description,
    };

    this.writeBackupMetadata(fileName, metadata);

    return {
      backupVersion: hash.substring(0, 8),
      backupPath,
    };
  }

  /**
   * Restores a POM file from a backup.
   */
  restoreFromBackup(pomFilePath: string, backupVersion: string): boolean {
    const backupPath = this.findBackupFile(pomFilePath, backupVersion);
    if (!backupPath) {
      console.error(`Backup not found for ${pomFilePath} version ${backupVersion}`);
      return false;
    }

    try {
      const backupContent = fs.readFileSync(backupPath, "utf-8");
      fs.writeFileSync(pomFilePath, backupContent, "utf-8");
      console.log(`Restored ${pomFilePath} from backup ${backupVersion}`);
      return true;
    } catch (error) {
      console.error(`Failed to restore backup: ${error}`);
      return false;
    }
  }

  /**
   * Lists all available backups for a specific POM file.
   */
  listBackups(pomFilePath: string): Array<{
    version: string;
    timestamp: string;
    path: string;
  }> {
    if (!fs.existsSync(this.backupDir)) {
      return [];
    }

    const baseName = path.basename(pomFilePath);
    const backups = fs
      .readdirSync(this.backupDir)
      .filter((f) => f.startsWith(baseName))
      .map((fileName) => {
        const metadataPath = path.join(
          this.backupDir,
          `${fileName}.metadata.json`
        );
        let metadata: BackupMetadata | null = null;

        if (fs.existsSync(metadataPath)) {
          const metadataContent = fs.readFileSync(metadataPath, "utf-8");
          metadata = JSON.parse(metadataContent);
        }

        const versionStr = fileName.split(".")[1] ?? "unknown";
        return {
          version: versionStr,
          timestamp: metadata?.timestamp || "unknown",
          path: path.join(this.backupDir, fileName),
        };
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return backups;
  }

  /**
   * Deletes old backups, keeping only the most recent N versions per file.
   */
  pruneOldBackups(maxBackupsPerFile: number = 5): number {
    if (!fs.existsSync(this.backupDir)) {
      return 0;
    }

    const files = fs.readdirSync(this.backupDir);
    const backupsByFile = new Map<string, string[]>();

    // Group backups by original file
    for (const file of files) {
      if (file.endsWith(".backup")) {
        const baseName = file.split(".")[0];
        if (baseName && !backupsByFile.has(baseName)) {
          backupsByFile.set(baseName, []);
        }
        if (baseName) {
          backupsByFile.get(baseName)?.push(file);
        }
      }
    }

    let deletedCount = 0;

    // Delete oldest backups for each file, keeping only maxBackupsPerFile
    for (const [, backups] of backupsByFile) {
      if (backups.length > maxBackupsPerFile) {
        const toDelete = backups.slice(maxBackupsPerFile);
        for (const file of toDelete) {
          const backupPath = path.join(this.backupDir, file);
          const metadataPath = `${backupPath}.metadata.json`;

          fs.unlinkSync(backupPath);
          if (fs.existsSync(metadataPath)) {
            fs.unlinkSync(metadataPath);
          }

          deletedCount++;
        }
      }
    }

    return deletedCount;
  }

  /**
   * Calculates SHA-256 hash of content.
   */
  private calculateHash(content: string): string {
    return crypto.createHash("sha256").update(content).digest("hex");
  }

  /**
   * Finds a backup file by version hash and POM file path.
   */
  private findBackupFile(pomFilePath: string, versionHash: string | null): string | null {
    if (!fs.existsSync(this.backupDir) || !versionHash) {
      return null;
    }

    const baseName = path.basename(pomFilePath);
    const pattern = `${baseName}.${versionHash}`;

    const files = fs.readdirSync(this.backupDir);
    for (const file of files) {
      if (file.startsWith(pattern) && file.endsWith(".backup")) {
        return path.join(this.backupDir, file);
      }
    }

    return null;
  }

  /**
   * Finds an existing backup by content hash (deduplication).
   */
  private findBackupByHash(hash: string): BackupMetadata | null {
    if (!fs.existsSync(this.backupDir)) {
      return null;
    }

    const files = fs.readdirSync(this.backupDir);
    for (const file of files) {
      if (file.includes(`.${hash.substring(0, 8)}.`)) {
        const metadataPath = path.join(
          this.backupDir,
          `${file}.metadata.json`
        );
        if (fs.existsSync(metadataPath)) {
          const content = fs.readFileSync(metadataPath, "utf-8");
          return JSON.parse(content) as BackupMetadata;
        }
      }
    }

    return null;
  }

  /**
   * Writes backup metadata to disk.
   */
  private writeBackupMetadata(fileName: string, metadata: BackupMetadata): void {
    const metadataPath = path.join(this.backupDir, `${fileName}.metadata.json`);
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), "utf-8");
  }

  /**
   * Ensures backup directory exists.
   */
  private ensureBackupDir(): void {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }
}

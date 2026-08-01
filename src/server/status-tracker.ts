import type { ValidationError } from '../core/validator.js';

export interface FileStatus {
  filePath: string;
  collectionName: string;
  valid: boolean;
  errors: ValidationError[];
  lastChecked: number;
}

export interface CollectionStatus {
  name: string;
  recordCount: number;
  errorCount: number;
  files: FileStatus[];
}

export interface ServerStatus {
  collections: CollectionStatus[];
  totalRecords: number;
  totalErrors: number;
}

/**
 * Tracks validation state for all indexed files.
 * Updated by the server on initial scan and on file changes.
 */
export class StatusTracker {
  private fileStatuses = new Map<string, FileStatus>();
  private collectionRecordCounts = new Map<string, number>();

  setFileStatus(filePath: string, collectionName: string, valid: boolean, errors: ValidationError[]): void {
    this.fileStatuses.set(filePath, {
      filePath,
      collectionName,
      valid,
      errors,
      lastChecked: Date.now(),
    });
  }

  removeFile(filePath: string): void {
    this.fileStatuses.delete(filePath);
  }

  setRecordCount(collectionName: string, count: number): void {
    this.collectionRecordCounts.set(collectionName, count);
  }

  getStatus(): ServerStatus {
    const collectionMap = new Map<string, FileStatus[]>();

    for (const status of this.fileStatuses.values()) {
      const list = collectionMap.get(status.collectionName) || [];
      list.push(status);
      collectionMap.set(status.collectionName, list);
    }

    const collections: CollectionStatus[] = [];
    for (const [name, files] of collectionMap) {
      const errorFiles = files.filter(f => !f.valid);
      collections.push({
        name,
        recordCount: this.collectionRecordCounts.get(name) || 0,
        errorCount: errorFiles.length,
        files: errorFiles,
      });
    }

    return {
      collections,
      totalRecords: [...this.collectionRecordCounts.values()].reduce((a, b) => a + b, 0),
      totalErrors: [...this.fileStatuses.values()].filter(f => !f.valid).length,
    };
  }
}

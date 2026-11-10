import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Projects persisted as one JSON file (atomic write: temp file then rename). A project holds
 * its donations, stages, submissions and its hash-chained audit log, so one file is the whole
 * truth. Fine for a demo-sized deployment; swap for a database behind the same four methods.
 */
export class Store {
  constructor(file) {
    this.file = file;
    this.projects = new Map();
    if (existsSync(file)) {
      for (const p of JSON.parse(readFileSync(file, 'utf8')).projects) this.projects.set(p.id, p);
    }
  }

  get(id) {
    return this.projects.get(id) ?? null;
  }

  list() {
    return [...this.projects.values()];
  }

  put(project) {
    this.projects.set(project.id, project);
    mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    writeFileSync(tmp, JSON.stringify({ projects: this.list() }, null, 2));
    renameSync(tmp, this.file);
  }
}

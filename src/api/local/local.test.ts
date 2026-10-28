import { describe, expect, it } from 'vitest';
import { newTree } from '../../core';
import { AuthError } from '../types';
import { createLocalAuthApi } from './localAuthApi';
import { createLocalTreeRepository } from './localTreeRepository';

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() {
    return this.data.size;
  }
  clear() {
    this.data.clear();
  }
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  key(i: number) {
    return [...this.data.keys()][i] ?? null;
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
}

describe('local auth', () => {
  const auth = createLocalAuthApi({ username: 'u', password: 'p', displayName: 'U' });
  it('accepts the configured credentials and rejects others', async () => {
    await expect(auth.login('u', 'nope')).rejects.toBeInstanceOf(AuthError);
    await expect(auth.login('u', 'p')).resolves.toMatchObject({ user: { username: 'u' } });
  });
});

describe('local tree repository', () => {
  it('saves, lists, loads and removes trees', async () => {
    const storage = new MemoryStorage();
    const repo = createLocalTreeRepository(() => storage);
    const a = newTree('A');
    const b = newTree('B');
    const savedA = await repo.save(a);
    expect(savedA.updatedAt).toBeTruthy();
    await repo.save(b);
    expect((await repo.list()).map((t) => t.title)).toEqual(['B', 'A']);
    expect((await repo.load(a.id))?.title).toBe('A');
    await repo.save({ ...a, title: 'A2' });
    expect((await repo.list()).map((t) => t.title)).toEqual(['A2', 'B']);
    await repo.remove(b.id);
    expect(await repo.load(b.id)).toBeNull();
    expect(await repo.list()).toHaveLength(1);
  });
  it('treats a corrupted entry as missing', async () => {
    const storage = new MemoryStorage();
    storage.setItem('treedom:tree:x', '{not json');
    expect(await createLocalTreeRepository(() => storage).load('x')).toBeNull();
  });
});

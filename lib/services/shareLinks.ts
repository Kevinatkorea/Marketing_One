/**
 * 공유 링크 관리 서비스
 *
 * Redis 개별 키(share:{token})로 저장. TTL 90일.
 * Redis 미사용 시 인메모리 Map으로 폴백 (로컬 개발용).
 */
import { Redis } from '@upstash/redis';
import { randomUUID } from 'node:crypto';

const USE_REDIS = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
const TTL_SECONDS = 90 * 24 * 60 * 60; // 90일

let redis: Redis | null = null;
function getRedis(): Redis {
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return redis;
}

// 로컬 개발용 인메모리 폴백
const memoryStore = new Map<string, ShareLink>();

export interface ShareLink {
  token: string;
  projectId: string;
  clientName: string;
  brandColor?: string;
  createdAt: string;
  expiresAt: string;
}

function redisKey(token: string): string {
  return `share:${token}`;
}

/** 프로젝트의 공유 링크 목록 인덱스 키 */
function projectIndexKey(projectId: string): string {
  return `share-index:${projectId}`;
}

export async function createShareLink(
  projectId: string,
  clientName: string,
  brandColor?: string,
): Promise<ShareLink> {
  const token = randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TTL_SECONDS * 1000);

  const link: ShareLink = {
    token,
    projectId,
    clientName,
    brandColor,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  if (USE_REDIS) {
    const r = getRedis();
    await r.set(redisKey(token), JSON.stringify(link), { ex: TTL_SECONDS });
    // 프로젝트별 인덱스에 토큰 추가
    await r.sadd(projectIndexKey(projectId), token);
  } else {
    memoryStore.set(token, link);
  }

  return link;
}

export async function getShareLink(token: string): Promise<ShareLink | null> {
  if (USE_REDIS) {
    const r = getRedis();
    const raw = await r.get<string>(redisKey(token));
    if (!raw) return null;
    if (typeof raw === 'string') return JSON.parse(raw) as ShareLink;
    if (typeof raw === 'object') return raw as unknown as ShareLink;
    return null;
  }
  const link = memoryStore.get(token);
  if (!link) return null;
  // 만료 체크
  if (new Date(link.expiresAt) < new Date()) {
    memoryStore.delete(token);
    return null;
  }
  return link;
}

export async function deleteShareLink(token: string): Promise<boolean> {
  if (USE_REDIS) {
    const r = getRedis();
    const raw = await r.get<string>(redisKey(token));
    if (!raw) return false;
    const link = typeof raw === 'string' ? JSON.parse(raw) as ShareLink : raw as unknown as ShareLink;
    await r.del(redisKey(token));
    await r.srem(projectIndexKey(link.projectId), token);
    return true;
  }
  return memoryStore.delete(token);
}

export async function listShareLinks(projectId: string): Promise<ShareLink[]> {
  if (USE_REDIS) {
    const r = getRedis();
    const tokens = await r.smembers(projectIndexKey(projectId));
    if (!tokens || tokens.length === 0) return [];

    const links: ShareLink[] = [];
    for (const token of tokens) {
      const raw = await r.get<string>(redisKey(token as string));
      if (raw) {
        const link = typeof raw === 'string' ? JSON.parse(raw) as ShareLink : raw as unknown as ShareLink;
        links.push(link);
      } else {
        // 만료된 토큰은 인덱스에서 제거
        await r.srem(projectIndexKey(projectId), token);
      }
    }
    return links.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  // 인메모리 폴백
  return Array.from(memoryStore.values())
    .filter((l) => l.projectId === projectId && new Date(l.expiresAt) > new Date())
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

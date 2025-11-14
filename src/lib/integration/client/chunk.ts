export interface ChunkData {
  content: string;
  metadata: {
    filename: string,
    chunk_index: number
  };
  file_url: string;
}

const BaseAPIPath = '/api/be/api/v1/chunk';
const CACHE_PREFIX = 'chunk_cache_';
const CACHE_EXPIRY_TIME = 86400000; // 1 day in milliseconds

export interface ChunkData {
  content: string;
  filename: string;
  fileurl: string;
}

interface CachedChunkData {
  data: ChunkData;
  timestamp: number;
}

/**
 * Get cached chunk data from localStorage
 * @param id - The chunk ID
 * @param expiryTime - Time limit in milliseconds (default: 1 day = 86400000ms)
 * @returns The cached chunk data if valid, otherwise null
 */
const getCachedChunkData = (id: string): ChunkData | null => {
  try {
    const cached = localStorage.getItem(`${CACHE_PREFIX}${id}`);
    if (!cached) return null;

    const { data } = JSON.parse(cached) as CachedChunkData;

    return data;
  } catch (error) {
    console.error('Error reading cache:', error);
    return null;
  }
};

/**
 * Set chunk data cache in localStorage
 * @param id - The chunk ID
 * @param data - The chunk data to cache
 */
const setCachedChunkData = (id: string, data: ChunkData): void => {
  try {
    const cacheData: CachedChunkData = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(`${CACHE_PREFIX}${id}`, JSON.stringify(cacheData));
  } catch (error) {
    console.error('Error setting cache:', error);
  }
};


export const getChunkData = async (id: string): Promise<ChunkData> => {
  const cachedData = getCachedChunkData(id);
  if (cachedData) {
    return cachedData;
  }

  // Fetch from API if not in cache
  const res = await fetch(`${BaseAPIPath}/${id}`);
  if (!res.ok) {
    throw new Error('Failed to fetch chunk data');
  }

  const data = await res.json() as ChunkData;

  // Cache the result
  setCachedChunkData(id, data);
  return data;
}


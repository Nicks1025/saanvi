const { getClient, isReady } = require('./redisClient');

const serialize = (value) => {
  if (value === undefined) return null;
  return JSON.stringify(value);
};

const deserialize = (value) => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch (e) {
    return value; // fallback for plain strings
  }
};

const execute = async (operation, fallback = null) => {
  if (!isReady()) return fallback;
  try {
    return await operation(getClient());
  } catch (err) {
    console.error(`[RedisHelper Error] ${err.message}`);
    return fallback;
  }
};

class RedisHelper {
  static async get(key) {
    const res = await execute((client) => client.get(key));
    return deserialize(res);
  }

  static async set(key, value, ttlSeconds = null) {
    const serialized = serialize(value);
    return await execute(async (client) => {
      if (ttlSeconds) {
        return await client.set(key, serialized, { EX: ttlSeconds });
      }
      return await client.set(key, serialized);
    }, false);
  }

  static async delete(key) {
    return await execute((client) => client.del(key), 0);
  }

  static async exists(key) {
    const res = await execute((client) => client.exists(key), 0);
    return res > 0;
  }

  static async expire(key, ttlSeconds) {
    return await execute((client) => client.expire(key, ttlSeconds), false);
  }

  static async ttl(key) {
    return await execute((client) => client.ttl(key), -2);
  }

  static async increment(key) {
    return await execute((client) => client.incr(key), null);
  }

  static async decrement(key) {
    return await execute((client) => client.decr(key), null);
  }

  static async ping() {
    return await execute((client) => client.ping(), 'FAILED');
  }

  // Hash Operations
  static async hashSet(key, field, value) {
    const serialized = serialize(value);
    return await execute((client) => client.hSet(key, field, serialized), false);
  }

  static async hashGet(key, field) {
    const res = await execute((client) => client.hGet(key, field));
    return deserialize(res);
  }

  static async hashGetAll(key) {
    const res = await execute((client) => client.hGetAll(key), null);
    if (!res) return null;
    const parsed = {};
    for (const [k, v] of Object.entries(res)) {
      parsed[k] = deserialize(v);
    }
    return parsed;
  }

  static async hashDelete(key, field) {
    return await execute((client) => client.hDel(key, field), 0);
  }

  static async hashExists(key, field) {
    return await execute((client) => client.hExists(key, field), false);
  }

  // Set Operations
  static async setAdd(key, value) {
    const serialized = serialize(value);
    return await execute((client) => client.sAdd(key, serialized), 0);
  }

  static async setRemove(key, value) {
    const serialized = serialize(value);
    return await execute((client) => client.sRem(key, serialized), 0);
  }

  static async setMembers(key) {
    const res = await execute((client) => client.sMembers(key), []);
    return res.map(deserialize);
  }

  static async setHas(key, value) {
    const serialized = serialize(value);
    return await execute((client) => client.sIsMember(key, serialized), false);
  }
}

module.exports = RedisHelper;

import mongoose from 'mongoose';
import { promises as dnsPromises } from 'dns';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.warn('Please define the MONGODB_URI environment variable inside .env.local');
}

/**
 * Resolves mongodb+srv:// URIs using Google/Cloudflare public DNS
 * to bypass Windows / ISP DNS servers that fail or refuse DNS SRV lookups (querySrv ECONNREFUSED).
 */
async function resolveMongoUri(uri: string): Promise<string> {
  if (!uri.startsWith('mongodb+srv://')) {
    return uri;
  }

  try {
    const resolver = new dnsPromises.Resolver();
    resolver.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

    const match = uri.match(/^mongodb\+srv:\/\/([^@]+@)?([^/?]+)(\/[^?]*)?(\?.*)?$/);
    if (!match) return uri;

    const auth = match[1] || '';
    const host = match[2];
    const path = match[3] || '/';
    const queryStr = match[4] || '';

    const srvRecords = await resolver.resolveSrv(`_mongodb._tcp.${host}`);
    if (!srvRecords || srvRecords.length === 0) return uri;

    const hosts = srvRecords.map((r) => `${r.name}:${r.port}`).join(',');

    let txtParams = '';
    try {
      const txt = await resolver.resolveTxt(host);
      if (txt && txt.length > 0) {
        txtParams = txt.flat().join('&');
      }
    } catch {
      // Ignore TXT lookup errors
    }

    const finalParams = new URLSearchParams(
      (queryStr ? `${queryStr.slice(1)}&` : '') + txtParams
    );

    if (!finalParams.has('ssl') && !finalParams.has('tls')) {
      finalParams.set('ssl', 'true');
    }
    if (!finalParams.has('authSource')) {
      finalParams.set('authSource', 'admin');
    }

    return `mongodb://${auth}${hosts}${path}?${finalParams.toString()}`;
  } catch (err) {
    console.warn('DNS SRV auto-resolution fallback skipped, connecting with original URI:', err);
    return uri;
  }
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not configured. Add it to .env.local before using the database.');
  }
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000,
    };

    cached.promise = resolveMongoUri(MONGODB_URI).then((resolvedUri) => {
      return mongoose.connect(resolvedUri, opts).then((m) => m);
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;

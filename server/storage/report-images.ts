import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { getReportStorageEnv } from '@/lib/env';
import { ReportStorageError } from '@/server/reports/errors';
import type { ReportImageStorage } from '@/server/reports/types';
import type { ReportImageReader } from '@/server/whatsapp/types';

const globalForStorage = globalThis as typeof globalThis & {
  liveVaultStorageClient?: SupabaseClient;
};

function getStorageClient() {
  if (globalForStorage.liveVaultStorageClient) {
    return globalForStorage.liveVaultStorageClient;
  }
  const env = getReportStorageEnv();
  const client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  if (process.env.NODE_ENV !== 'production') {
    globalForStorage.liveVaultStorageClient = client;
  }
  return client;
}

export const reportImageStorage: ReportImageStorage & ReportImageReader = {
  async upload({ path, bytes, contentType }) {
    try {
      const env = getReportStorageEnv();
      const { error } = await getStorageClient()
        .storage.from(env.SUPABASE_REPORT_SCREENSHOTS_BUCKET)
        .upload(path, bytes, { contentType, upsert: false });
      if (error) throw new ReportStorageError();
    } catch (error) {
      if (error instanceof ReportStorageError) throw error;
      throw new ReportStorageError();
    }
  },

  async remove(path) {
    try {
      const env = getReportStorageEnv();
      const { error } = await getStorageClient()
        .storage.from(env.SUPABASE_REPORT_SCREENSHOTS_BUCKET)
        .remove([path]);
      if (error) throw new ReportStorageError();
    } catch (error) {
      if (error instanceof ReportStorageError) throw error;
      throw new ReportStorageError();
    }
  },

  async download(path) {
    try {
      const env = getReportStorageEnv();
      const { data, error } = await getStorageClient()
        .storage.from(env.SUPABASE_REPORT_SCREENSHOTS_BUCKET)
        .download(path);
      if (error || !data) throw new ReportStorageError();
      const extension = path.split('.').at(-1)?.toLowerCase();
      const mimeType =
        data.type ||
        (extension === 'png'
          ? 'image/png'
          : extension === 'webp'
            ? 'image/webp'
            : 'image/jpeg');
      return {
        bytes: new Uint8Array(await data.arrayBuffer()),
        mimeType,
      };
    } catch (error) {
      if (error instanceof ReportStorageError) throw error;
      throw new ReportStorageError();
    }
  },
};

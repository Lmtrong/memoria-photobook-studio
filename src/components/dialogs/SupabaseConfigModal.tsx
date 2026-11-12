import React, { useState, useEffect } from 'react';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  testSupabaseConnection,
} from '../../services/supabase/supabaseService';
import { useAuthStore } from '../../stores/useAuthStore';
import { useToastStore } from '../../stores/useToastStore';
import { useI18n } from '../../i18n';
import { X, Database, Check, Copy, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

const SUPABASE_SQL_SNIPPET = `-- Dán vào Supabase Dashboard -> SQL Editor -> New Query -> nhấn RUN
create table if not exists public.memoria_users (
  id text primary key,
  username text unique not null,
  email_or_phone text unique not null,
  contact_type text not null default 'email',
  display_name text not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.memoria_albums (
  id text primary key,
  owner_id text not null references public.memoria_users(id) on delete cascade,
  owner_username text not null,
  owner_name text not null,
  title text not null,
  is_public boolean not null default true,
  album_data jsonb not null,
  photo_urls jsonb not null default '{}'::jsonb,
  audio_url text,
  audio_meta jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.memoria_users enable row level security;
alter table public.memoria_albums enable row level security;

drop policy if exists "Allow public read and register users" on public.memoria_users;
create policy "Allow public read and register users" on public.memoria_users for all using (true) with check (true);

drop policy if exists "Allow public read and sync albums" on public.memoria_albums;
create policy "Allow public read and sync albums" on public.memoria_albums for all using (true) with check (true);

insert into storage.buckets (id, name, public) values ('memoria-media', 'memoria-media', true)
on conflict (id) do update set public = true;

drop policy if exists "Allow public read memoria-media" on storage.objects;
create policy "Allow public read memoria-media" on storage.objects for select using (bucket_id = 'memoria-media');

drop policy if exists "Allow public upload memoria-media" on storage.objects;
create policy "Allow public upload memoria-media" on storage.objects for insert with check (bucket_id = 'memoria-media');

drop policy if exists "Allow public update memoria-media" on storage.objects;
create policy "Allow public update memoria-media" on storage.objects for update using (bucket_id = 'memoria-media');

drop policy if exists "Allow public delete memoria-media" on storage.objects;
create policy "Allow public delete memoria-media" on storage.objects for delete using (bucket_id = 'memoria-media');`;

export const SupabaseConfigModal: React.FC = () => {
  const { cloudConfigModalOpen, setCloudConfigModalOpen } = useAuthStore();
  const { addToast } = useToastStore();
  const { lang } = useI18n();
  const isVi = lang === 'vi';

  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    if (cloudConfigModalOpen) {
      const cfg = getSupabaseConfig();
      setUrl(cfg.url);
      setAnonKey(cfg.anonKey);
      setTestResult(null);
    }
  }, [cloudConfigModalOpen]);

  if (!cloudConfigModalOpen) return null;

  const handleSaveAndTest = async (e: React.FormEvent) => {
    e.preventDefault();
    saveSupabaseConfig(url, anonKey);
    if (!url.trim() || !anonKey.trim()) {
      addToast(isVi ? 'Đã xóa cấu hình Supabase tùy chỉnh.' : 'Cleared custom Supabase config.', 'info');
      setCloudConfigModalOpen(false);
      return;
    }

    setIsTesting(true);
    const result = await testSupabaseConnection();
    setIsTesting(false);
    setTestResult(result);

    if (result.ok) {
      addToast(result.message, 'success');
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SNIPPET).then(() => {
      setCopiedSql(true);
      addToast(
        isVi
          ? 'Đã sao chép lệnh SQL! Hãy dán vào Supabase SQL Editor và nhấn RUN.'
          : 'Copied SQL schema! Paste it into Supabase SQL Editor and click RUN.',
        'success'
      );
      setTimeout(() => setCopiedSql(false), 2500);
    });
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-charcoal/70 backdrop-blur-xs p-4 overflow-y-auto text-charcoal">
      <div className="bg-ivory text-charcoal border border-beige rounded-2xl shadow-book max-w-2xl w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-cream/80 border-b border-beige flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-800 text-ivory flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-serif font-semibold text-charcoal">
                {isVi
                  ? 'Kết Nối Cơ Sở Dữ Liệu Supabase (Free Tier)'
                  : 'Connect Supabase Cloud Database (Free Tier)'}
              </h2>
              <p className="text-xs text-charcoal/65">
                {isVi
                  ? 'Lưu trữ tài khoản người dùng, phân quyền Album, ảnh HD và nhạc nền trên Supabase'
                  : 'Store user accounts, album permissions, HD photos & audio on Supabase'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setCloudConfigModalOpen(false)}
            className="p-1.5 rounded-full text-charcoal/60 hover:text-charcoal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSaveAndTest} className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
          <div className="p-3.5 rounded-xl bg-cream border border-beige space-y-1.5 text-charcoal/80 leading-relaxed">
            <p className="font-semibold text-charcoal">
              {isVi ? 'Hướng dẫn cài đặt Supabase miễn phí (1 phút):' : '1-Minute Free Supabase Setup:'}
            </p>
            <ol className="list-decimal list-inside space-y-1">
              <li>
                {isVi
                  ? 'Tạo project miễn phí tại https://supabase.com -> vào SQL Editor -> nhấn nút "Sao chép mã SQL" bên dưới, dán vào và bấm RUN.'
                  : 'Create a free project at https://supabase.com -> open SQL Editor -> copy & RUN the SQL snippet below.'}
              </li>
              <li>
                {isVi
                  ? 'Vào Project Settings -> API -> copy Project URL và anon public key dán vào 2 ô bên dưới (hoặc đặt biến môi trường VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY trên Vercel).'
                  : 'Go to Project Settings -> API -> paste your Project URL and anon public key below (or set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY on Vercel).'}
              </li>
            </ol>
          </div>

          <div className="grid grid-cols-1 gap-3.5">
            <div>
              <label className="block font-semibold text-charcoal/80 mb-1">
                Supabase Project URL (`VITE_SUPABASE_URL`)
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://xxxxxxxxxxxxxxxxxxxx.supabase.co"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-beige focus:border-terracotta outline-none text-charcoal font-mono text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-charcoal/80 mb-1">
                Supabase Anon Public Key (`VITE_SUPABASE_ANON_KEY`)
              </label>
              <input
                type="text"
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-beige focus:border-terracotta outline-none text-charcoal font-mono text-xs"
              />
            </div>
          </div>

          {testResult && (
            <div
              className={`p-3.5 rounded-xl border flex items-start gap-2.5 ${
                testResult.ok
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-300 text-amber-900'
              }`}
            >
              {testResult.ok ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              <span className="font-medium leading-relaxed">{testResult.message}</span>
            </div>
          )}

          {/* SQL Schema Copy Box */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-charcoal/80">
                {isVi
                  ? 'Mã SQL khởi tạo bảng Users, Albums & Bucket Ảnh/Nhạc:'
                  : 'SQL Schema for Users, Albums & Media Bucket:'}
              </span>
              <button
                type="button"
                onClick={handleCopySql}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-charcoal text-ivory hover:bg-terracotta text-xs font-semibold transition-colors"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5 text-gold" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSql ? 'Đã sao chép SQL' : 'Sao chép mã SQL'}</span>
              </button>
            </div>
            <pre className="p-3 rounded-xl bg-[#1C1917] text-ivory/85 font-mono text-[11px] overflow-x-auto max-h-36 leading-relaxed">
              {SUPABASE_SQL_SNIPPET}
            </pre>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-beige">
            <button
              type="button"
              onClick={() => setCloudConfigModalOpen(false)}
              className="px-4 py-2 rounded-xl text-charcoal/70 hover:text-charcoal font-medium"
            >
              {isVi ? 'Đóng' : 'Close'}
            </button>
            <button
              type="submit"
              disabled={isTesting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-terracotta hover:bg-charcoal text-white font-semibold transition-colors shadow-sm"
            >
              {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>{isVi ? 'Lưu & Kiểm tra kết nối Supabase' : 'Save & Test Connection'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

"use client";

import React, { useState } from 'react';
import { Database, Check, Copy, ShieldCheck, HelpCircle } from 'lucide-react';

export default function SupabaseSetupWizard() {
  const [copiedSQL, setCopiedSQL] = useState(false);
  const [copiedStorageSQL, setCopiedStorageSQL] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);

  const sqlCode = `-- 1. Create the messages table
create table messages (
  id uuid default gen_random_uuid() primary key,
  username text not null,
  text text,
  timestamp timestamptz default timezone('utc'::text, now()) not null,
  type text default 'user' not null,
  media_url text,
  media_type text
);

-- 2. Enable Realtime triggers on the messages table
alter publication supabase_realtime add table messages;`;

  const storageSqlCode = `-- 1. Create storage bucket named chat-media
insert into storage.buckets (id, name, public)
values ('chat-media', 'chat-media', true)
on conflict (id) do nothing;

-- 2. Allow public access to view media objects
create policy "Allow Public Select" on storage.objects
  for select using (bucket_id = 'chat-media');

-- 3. Allow anyone to upload objects
create policy "Allow Anonymous Uploads" on storage.objects
  for insert with check (bucket_id = 'chat-media');

-- 4. Allow anyone to update/delete objects
create policy "Allow Anonymous Updates" on storage.objects
  for update using (bucket_id = 'chat-media');

create policy "Allow Anonymous Deletes" on storage.objects
  for delete using (bucket_id = 'chat-media');`;

  const envTemplate = `NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-api-public-key`;

  const copyToClipboard = (text, setCopied) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8 relative overflow-hidden font-sans bg-slate-50/50">
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-72 md:w-96 h-72 md:h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-72 md:w-96 h-72 md:h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-2xl z-10 animate-slide-up">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 shadow-lg shadow-indigo-500/25 mb-4 border border-white/50">
            <Database className="h-7 w-7 text-white animate-pulse" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-800">
            Configure Your <span className="text-gradient font-extrabold">DeepLink Database</span>
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-500 max-w-md mx-auto px-4">
            Connect your secure real-time server channels with Supabase storage and databases.
          </p>
        </div>

        {/* Wizard Guide Card */}
        <div className="glass-panel-glow rounded-3xl p-5 sm:p-8 space-y-6 sm:space-y-8 shadow-xl shadow-slate-100/50">
          <h2 className="text-sm sm:text-base font-extrabold text-indigo-600 flex items-center gap-2 border-b border-slate-100 pb-4">
            <HelpCircle className="w-5 h-5 text-indigo-600" /> DeepLink Setup Instructions
          </h2>

          <div className="space-y-6">
            {/* Step 1 */}
            <div className="flex gap-3 sm:gap-4">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-600 border border-indigo-100">
                1
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800">Create a Supabase Project</h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Go to <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline font-bold">supabase.com</a>, sign in, and create a free project named <code className="text-slate-800 bg-slate-100 px-1 py-0.5 rounded font-mono text-2xs">DeepLink</code>.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-3 sm:gap-4">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-600 border border-indigo-100">
                2
              </div>
              <div className="w-full min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-slate-800">Create Database Messages Table</h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Open the <strong>SQL Editor</strong> in your Supabase Dashboard, click "New Query", paste the following SQL, and click <strong>Run</strong>:
                </p>
                <div className="relative mt-3 rounded-xl bg-slate-900 border border-slate-800 p-4 font-mono text-2xs sm:text-xs text-indigo-300 overflow-x-auto max-w-full">
                  <button
                    onClick={() => copyToClipboard(sqlCode, setCopiedSQL)}
                    className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:border-indigo-500/50 hover:text-white transition-all cursor-pointer text-slate-400"
                    title="Copy SQL query"
                  >
                    {copiedSQL ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <pre className="pr-8">{sqlCode}</pre>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-3 sm:gap-4">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-600 border border-indigo-100">
                3
              </div>
              <div className="w-full min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-slate-800">Create Storage Bucket for Media Sharing</h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Instead of clicking around, you can create the **chat-media** public bucket and setup all access policies instantly! Simply run this SQL query in your **Supabase SQL Editor**:
                </p>
                <div className="relative mt-3 rounded-xl bg-slate-900 border border-slate-800 p-4 font-mono text-2xs sm:text-xs text-indigo-300 overflow-x-auto max-w-full">
                  <button
                    onClick={() => copyToClipboard(storageSqlCode, setCopiedStorageSQL)}
                    className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:border-indigo-500/50 hover:text-white transition-all cursor-pointer text-slate-400"
                    title="Copy Storage SQL query"
                  >
                    {copiedStorageSQL ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <pre className="pr-8">{storageSqlCode}</pre>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-3 sm:gap-4">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-600 border border-indigo-100">
                4
              </div>
              <div className="w-full min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-slate-800">Set Environment Variables in Vercel</h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Add these keys to your **Vercel Settings &gt; Environment Variables** (with "Production" active):
                </p>
                <div className="relative mt-3 rounded-xl bg-slate-900 border border-slate-800 p-4 font-mono text-2xs sm:text-xs text-emerald-300 overflow-x-auto max-w-full">
                  <button
                    onClick={() => copyToClipboard(envTemplate, setCopiedEnv)}
                    className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:border-indigo-500/50 hover:text-white transition-all cursor-pointer text-slate-400"
                    title="Copy environment template"
                  >
                    {copiedEnv ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <pre className="pr-8">{envTemplate}</pre>
                </div>
              </div>
            </div>

            {/* Step 5 */}
            <div className="flex gap-3 sm:gap-4">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-600 border border-indigo-100">
                5
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800">Redeploy on Vercel</h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Click **Redeploy** on the Vercel Deployments page. The live site will reload instantly into the premium login portal!
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row gap-2 sm:items-center justify-between text-2xs text-slate-400 font-bold">
            <span>Serverless Architecture Sync</span>
            <span className="flex items-center gap-1.5 text-emerald-600">
              <ShieldCheck className="w-4 h-4 text-emerald-500" /> DeepLink Deployment Active
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

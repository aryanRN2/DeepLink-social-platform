"use client";

import React, { useState } from 'react';
import { Database, Check, Copy, ShieldCheck, HelpCircle } from 'lucide-react';

export default function SupabaseSetupWizard() {
  const [copiedSQL, setCopiedSQL] = useState(false);
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

  const envTemplate = `VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-api-public-key`;

  const copyToClipboard = (text, setCopied) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8 relative overflow-hidden font-sans">
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-72 md:w-96 h-72 md:h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-72 md:w-96 h-72 md:h-96 bg-fuchsia-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-2xl z-10 animate-slide-up">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-lg shadow-emerald-500/25 mb-4 border border-emerald-400/20">
            <Database className="h-7 w-7 text-white animate-pulse" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Configure Your <span className="text-gradient font-bold">Database</span>
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-gray-400 max-w-md mx-auto px-4">
            Vercel requires serverless real-time synchronization. We will connect your chat directly to Supabase!
          </p>
        </div>

        {/* Wizard Guide Card */}
        <div className="glass-panel-glow rounded-3xl p-5 sm:p-8 space-y-6 sm:space-y-8">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-white/5 pb-4">
            <HelpCircle className="text-violet-400 w-5 h-5" /> 5-Minute Setup Instructions
          </h2>

          <div className="space-y-6">
            {/* Step 1 */}
            <div className="flex gap-3 sm:gap-4">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-600/20 text-xs font-bold text-violet-400 border border-violet-500/25">
                1
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white">Create a Supabase Project</h3>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">
                  Go to <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-violet-400 hover:underline font-semibold">supabase.com</a>, sign in, and create a free project named <code className="text-white bg-slate-900 px-1 py-0.5 rounded font-mono text-2xs">Hangout Den</code>.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-3 sm:gap-4">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-600/20 text-xs font-bold text-violet-400 border border-violet-500/25">
                2
              </div>
              <div className="w-full min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-white">Run the Database Script</h3>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">
                  Open the <strong>SQL Editor</strong> in your Supabase Dashboard, click "New Query", paste the following SQL, and click <strong>Run</strong>:
                </p>
                <div className="relative mt-3 rounded-xl bg-slate-950/80 border border-white/5 p-4 font-mono text-2xs sm:text-xs text-violet-300 overflow-x-auto max-w-full">
                  <button
                    onClick={() => copyToClipboard(sqlCode, setCopiedSQL)}
                    className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-slate-900 border border-white/5 hover:border-violet-500/35 hover:text-white transition-all cursor-pointer"
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
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-600/20 text-xs font-bold text-violet-400 border border-violet-500/25">
                3
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white">Create Storage Bucket for Media</h3>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">
                  Go to <strong>Storage</strong> in the sidebar, create a new bucket named <code className="text-white bg-slate-900 px-1 py-0.5 rounded font-mono text-2xs">chat-media</code>. Toggle on <strong>Public Bucket</strong>, click Save. Under bucket Policies, add a policy that allows **INSERT, SELECT, UPDATE, DELETE** actions for anonymous users.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-3 sm:gap-4">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-600/20 text-xs font-bold text-violet-400 border border-violet-500/25">
                4
              </div>
              <div className="w-full min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-white">Set Your Environment Variables</h3>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">
                  Add these keys to your **Vercel Settings &gt; Environment Variables** (make sure the "Production" checkbox is active):
                </p>
                <div className="relative mt-3 rounded-xl bg-slate-950/80 border border-white/5 p-4 font-mono text-2xs sm:text-xs text-emerald-300 overflow-x-auto max-w-full">
                  <button
                    onClick={() => copyToClipboard(envTemplate, setCopiedEnv)}
                    className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-slate-900 border border-white/5 hover:border-violet-500/35 hover:text-white transition-all cursor-pointer"
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
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-600/20 text-xs font-bold text-violet-400 border border-violet-500/25">
                5
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white">Redeploy on Vercel</h3>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">
                  Once saved, click **Redeploy** on the Vercel Deployments page. The live site will reload instantly into the premium login portal!
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-white/5 pt-4 flex flex-col sm:flex-row gap-2 sm:items-center justify-between text-2xs text-gray-500">
            <span>Serverless Architecture</span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <ShieldCheck className="w-4 h-4" /> Vercel Deployment Ready
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

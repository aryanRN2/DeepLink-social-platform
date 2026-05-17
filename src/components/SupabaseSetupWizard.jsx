import React, { useState } from 'react';
import { Database, Check, Copy, ArrowRight, ShieldCheck, HelpCircle } from 'lucide-react';

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
    <div className="flex min-h-screen items-center justify-center px-4 py-16 relative overflow-hidden font-sans">
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-fuchsia-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-2xl z-10 animate-slide-up">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-lg shadow-emerald-500/25 mb-4 border border-emerald-400/20">
            <Database className="h-8 w-8 text-white animate-pulse" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Configure Your <span className="text-gradient">Database</span>
          </h1>
          <p className="mt-2 text-sm text-gray-400 max-w-md mx-auto">
            Vercel requires serverless real-time synchronization. We will connect your chat directly to Supabase!
          </p>
        </div>

        {/* Wizard Guide Card */}
        <div className="glass-panel-glow rounded-3xl p-6 sm:p-10 space-y-8">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 border-b border-white/5 pb-4">
            <HelpCircle className="text-violet-400 w-5 h-5" /> 5-Minute Setup Instructions
          </h2>

          <div className="space-y-6">
            {/* Step 1 */}
            <div className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-600/20 text-sm font-bold text-violet-400 border border-violet-500/25">
                1
              </div>
              <div>
                <h3 className="font-bold text-white">Create a Supabase Project</h3>
                <p className="text-sm text-gray-400 mt-1">
                  Go to <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-violet-400 hover:underline font-semibold">supabase.com</a>, sign in, and create a free project named <code className="text-white bg-slate-900 px-1.5 py-0.5 rounded font-mono text-xs">Hangout Den</code>.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-600/20 text-sm font-bold text-violet-400 border border-violet-500/25">
                2
              </div>
              <div className="w-full">
                <h3 className="font-bold text-white">Run the Database Script</h3>
                <p className="text-sm text-gray-400 mt-1">
                  Open the <strong>SQL Editor</strong> in your Supabase Dashboard, click "New Query", paste the following SQL, and click <strong>Run</strong>:
                </p>
                <div className="relative mt-3 rounded-2xl bg-slate-950/80 border border-white/5 p-4 font-mono text-xs text-violet-300 overflow-x-auto max-w-full">
                  <button
                    onClick={() => copyToClipboard(sqlCode, setCopiedSQL)}
                    className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-900 border border-white/5 hover:border-violet-500/35 hover:text-white transition-all cursor-pointer"
                    title="Copy SQL query"
                  >
                    {copiedSQL ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <pre className="pr-12">{sqlCode}</pre>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-600/20 text-sm font-bold text-violet-400 border border-violet-500/25">
                3
              </div>
              <div>
                <h3 className="font-bold text-white">Create Storage Bucket for Media</h3>
                <p className="text-sm text-gray-400 mt-1">
                  Go to <strong>Storage</strong> in the sidebar, create a new bucket named <code className="text-white bg-slate-900 px-1.5 py-0.5 rounded font-mono text-xs">chat-media</code>. Toggle on <strong>Public Bucket</strong>, click Save. Then click "Policies" on the left, and add a policy that allows **INSERT, SELECT, UPDATE, DELETE** actions for anonymous users.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-600/20 text-sm font-bold text-violet-400 border border-violet-500/25">
                4
              </div>
              <div className="w-full">
                <h3 className="font-bold text-white">Set Your Environment Variables</h3>
                <p className="text-sm text-gray-400 mt-1">
                  Create a file named <code className="text-white bg-slate-900 px-1.5 py-0.5 rounded font-mono text-xs">.env.local</code> in your <code className="text-violet-300 font-mono">/frontend/</code> directory, paste the template below, and fill in your Supabase URL & Anon Key (found in **Project Settings &gt; API**):
                </p>
                <div className="relative mt-3 rounded-2xl bg-slate-950/80 border border-white/5 p-4 font-mono text-xs text-emerald-300 overflow-x-auto max-w-full">
                  <button
                    onClick={() => copyToClipboard(envTemplate, setCopiedEnv)}
                    className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-900 border border-white/5 hover:border-violet-500/35 hover:text-white transition-all cursor-pointer"
                    title="Copy environment variable template"
                  >
                    {copiedEnv ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <pre className="pr-12">{envTemplate}</pre>
                </div>
              </div>
            </div>

            {/* Step 5 */}
            <div className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-600/20 text-sm font-bold text-violet-400 border border-violet-500/25">
                5
              </div>
              <div>
                <h3 className="font-bold text-white">Restart Your Development Server</h3>
                <p className="text-sm text-gray-400 mt-1">
                  Restart your Vite terminal server using <kbd className="text-white bg-slate-900 px-1.5 py-0.5 rounded font-mono text-xs">CTRL + C</kbd> then <kbd className="text-white bg-slate-900 px-1.5 py-0.5 rounded font-mono text-xs">npm run dev</kbd> so Vite detects your new variables!
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-white/5 pt-6 flex items-center justify-between text-xs text-gray-500">
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

import { FileText, Package, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const Docs = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Home</Button>
          </Link>
          <FileText className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Docs</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" /> Mods (.ccmod)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-relaxed">
            <p>
              A <code>.ccmod</code> file is a renamed <code>.zip</code> archive. It can add emojis, override
              textures, add UI screens, run scripts, and hook into in-app events. Manage mods from the
              <strong> Mods </strong> button next to the Beta button. Every installed mod has an
              <strong> Enable / Disable </strong> toggle — disabled mods stay installed but do not affect
              emojis, textures, UI, scripts, or triggers.
            </p>

            <div>
              <h2 className="font-semibold text-base mb-1">Archive layout</h2>
              <pre className="bg-muted rounded p-3 text-xs overflow-x-auto">{`mymod.ccmod (zip)
├─ mod.json              (required)
├─ emojis/               (optional)  e.g. happy.png, fire.gif
├─ textures/             (optional)  mirrors src/assets/, e.g. roles/admin.png
├─ UI/                   (optional)  *.html files opened in a sandboxed dialog
├─ scripts/              (optional)  *.js or *.ts run in a small sandbox
└─ event.cctrigger       (optional)  hooks scripts/UI to app events`}</pre>
            </div>

            <div>
              <h2 className="font-semibold text-base mb-1">mod.json</h2>
              <p>Accepts either an object or an array of objects that are merged.</p>
              <pre className="bg-muted rounded p-3 text-xs overflow-x-auto">{`[{"name":"My Mod"}, {"description":"Adds a fire emoji"}]`}</pre>
            </div>

            <div>
              <h2 className="font-semibold text-base mb-1">Emojis</h2>
              <p>
                Files inside <code>emojis/</code> become usable as <code>:filename:</code> in chat and posts.
                The extension is stripped; only <code>a-z 0-9 _ -</code> characters remain (others become
                <code> _ </code>). Using an existing emoji name overrides it while your mod is enabled.
              </p>
            </div>

            <div>
              <h2 className="font-semibold text-base mb-1">Textures</h2>
              <p>
                Files inside <code>textures/</code> mirror the path of a bundled asset under
                <code> src/assets/</code>. For example <code>textures/roles/admin.png</code> overrides
                <code> src/assets/roles/admin.png</code>. Matching also works by basename regardless of the
                extension, so <code>admin.jpeg</code> can replace <code>admin.png</code>.
              </p>
            </div>

            <div>
              <h2 className="font-semibold text-base mb-1">UI screens</h2>
              <p>
                HTML files under <code>UI/</code> are opened in a sandboxed <code>&lt;iframe&gt;</code> when
                referenced by a trigger. They have no access to your account or storage.
              </p>
            </div>

            <div>
              <h2 className="font-semibold text-base mb-1">Scripts</h2>
              <p>
                <code>scripts/*.js</code> or <code>scripts/*.ts</code> run in a small sandbox with an async
                <code> mod </code> API. Top-level <code>await</code> is supported. TypeScript is stripped
                naively — keep it simple (no imports, no generics).
              </p>
              <pre className="bg-muted rounded p-3 text-xs overflow-x-auto">{`// scripts/hello.ts
mod.toast("Welcome back!");
mod.log("event:", mod.event, mod.payload);

// Read the last 20 messages of a conversation
const msgs = await mod.readMessages("<conversation-id>", 20);
mod.log("messages:", msgs);`}</pre>
            </div>

            <div>
              <h2 className="font-semibold text-base mb-1"><code>mod.*</code> API</h2>
              <p>Available inside <code>scripts/</code> and, via a postMessage bridge, inside UI HTML too:</p>
              <ul className="list-disc pl-5 text-xs space-y-1">
                <li><code>mod.event</code> / <code>mod.payload</code> — the trigger that fired</li>
                <li><code>mod.toast(msg)</code>, <code>mod.log(...)</code>, <code>mod.alert(msg)</code></li>
                <li><code>await mod.currentUser()</code> — signed-in user id or null</li>
                <li><code>await mod.currentProfile()</code> — current profile row</li>
                <li><code>await mod.listConversations()</code> — conversations the user is in</li>
                <li><code>await mod.readMessages(conversationId, limit?)</code> — read messages (respects RLS)</li>
                <li><code>await mod.sendMessage(conversationId, content)</code></li>
                <li><code>mod.storage.get(k)</code>, <code>mod.storage.set(k, v)</code>, <code>mod.storage.del(k)</code> — per-mod localStorage</li>
                <li><code>mod.on(name, cb)</code>, <code>mod.emit(name, data)</code> — cross-mod messaging</li>
                <li><code>mod.openUI(path, title?)</code> — open another UI file from the same mod</li>
                <li><code>mod.fetch(url, init?)</code>, <code>mod.supabase</code> — escape hatches</li>
              </ul>
              <p className="mt-2 text-xs">
                Every call still runs under the signed-in user's Row-Level Security — a mod can only read data
                the user could read themselves.
              </p>
            </div>

            <div>
              <h2 className="font-semibold text-base mb-1">UI screens</h2>
              <p>
                HTML files under <code>UI/</code> are opened in a sandboxed <code>&lt;iframe&gt;</code> when
                referenced by a trigger. The same <code>mod</code> object is auto-injected as
                <code> window.mod</code>, so your HTML can call e.g. <code>await mod.readMessages(id)</code>.
              </p>
              <pre className="bg-muted rounded p-3 text-xs overflow-x-auto">{`<!-- UI/panel.html -->
<button onclick="run()">Load messages</button>
<pre id="out"></pre>
<script>
  async function run() {
    const msgs = await mod.readMessages("<conversation-id>", 10);
    document.getElementById('out').textContent = JSON.stringify(msgs, null, 2);
  }
</script>`}</pre>
            </div>

            <div>
              <h2 className="font-semibold text-base mb-1">event.cctrigger</h2>
              <p>Line-based triggers. Format:</p>
              <pre className="bg-muted rounded p-3 text-xs overflow-x-auto">{`[event: login; run{scripts/hello.ts}]
[event: openedsettings; run{UI/panel.html}]`}</pre>
              <p className="mt-2">Supported events:</p>
              <p className="text-xs font-mono break-words">
                login, reload, openedchat, openedsettings, openedcreatordashboard, videotab, crossunity,
                posting, messagesend, usebetamenu, buy, like, follow, dislike, unfollow, report, blockuser,
                changegrouprole, joingroup, changesetting, watchvideo
              </p>
            </div>

            <div>
              <h2 className="font-semibold text-base mb-1">Updating a published mod</h2>
              <p>
                Open the Mod Store → <strong>Browse</strong>, find your mod (only visible to you as author),
                and click the <strong>refresh</strong> icon to upload a new <code>.ccmod</code>. Everyone who
                already installed it will see an <em>Update available</em> badge and can reinstall.
              </p>
            </div>

            <div>
              <h2 className="font-semibold text-base mb-1">Publishing</h2>
              <p>
                Open the Mod Store → <strong>Upload</strong>, pick your <code>.ccmod</code>, give it a name
                and description. Everyone can browse and install it from the <strong>Browse</strong> tab.
              </p>
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Docs;

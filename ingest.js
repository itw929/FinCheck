#!/usr/bin/env node
/* ============================================================
   FinCheck — ingest

   Takes a video link. Pulls the caption track and the date it
   was posted. Writes a transcript file. Writes a prompt file
   you paste into a chat window.

   NO API KEY. It reads what the platform already published.

     node ingest.js "https://www.youtube.com/shorts/dQw4w9WgXcQ"

   Two routes, tried in order:

     1. yt-dlp, if it is on PATH. Handles YouTube, and handles
        TikTok and Instagram too. Most reliable.
          brew install yt-dlp   |   pipx install yt-dlp

     2. A plain fetch of the YouTube watch page, parsing the
        player JSON that page already contains. No install at
        all. Works often; YouTube sometimes serves a bot check
        instead, in which case use route 1.

   Output:
     transcripts/<key>.json     the transcript and metadata
     transcripts/<key>.prompt.txt   paste this into Claude

   TikTok and Instagram: yt-dlp only, and both frequently need
   a cookies file because they gate playback. Get YouTube
   Shorts working first; it is the one that behaves.
   ============================================================ */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const E = require(path.join(__dirname, "engine.js"));

const OUTDIR = path.join(__dirname, "transcripts");
const PROMPT_FILE = path.join(__dirname, "ANALYST_PROMPT.md");

/* ---------------------------------------------------------- */

function haveYtDlp() {
  try { execFileSync("yt-dlp", ["--version"], { stdio: "pipe" }); return true; }
  catch (e) { return false; }
}

function yt(args) {
  return execFileSync("yt-dlp", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
}

function stamp(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/* Auto-generated captions arrive as rolling text: each cue
   repeats the tail of the last one. Left alone this triples the
   transcript and makes the model see the same claim three times.
   Collapse anything that is a continuation of what came before. */
function collapseRolling(cues) {
  const out = [];
  for (const c of cues) {
    const text = c.text.replace(/\s+/g, " ").trim();
    if (!text) continue;
    const prev = out[out.length - 1];
    if (prev) {
      if (prev.text === text) continue;
      if (text.startsWith(prev.text)) { prev.text = text; continue; }
      if (prev.text.endsWith(text)) continue;
      /* Overlapping tail: keep only the new words. */
      const words = prev.text.split(" ");
      for (let n = Math.min(words.length, 12); n >= 3; n--) {
        const tail = words.slice(-n).join(" ");
        if (text.startsWith(tail)) {
          const rest = text.slice(tail.length).trim();
          if (rest) out.push({ timestamp: c.timestamp, text: rest });
          n = 0;
          break;
        }
      }
      if (out[out.length - 1] !== prev) continue;
    }
    out.push({ timestamp: c.timestamp, text: text });
  }
  return out;
}

/* Merge short cues into sentence-ish lines, so the model sees
   claims rather than three-word fragments. */
function toLines(cues) {
  const lines = [];
  let buf = null;
  for (const c of cues) {
    if (!buf) { buf = { timestamp: c.timestamp, text: c.text }; continue; }
    const merged = (buf.text + " " + c.text).trim();
    if (/[.!?]$/.test(buf.text) || merged.split(" ").length > 26) {
      lines.push(buf);
      buf = { timestamp: c.timestamp, text: c.text };
    } else {
      buf.text = merged;
    }
  }
  if (buf) lines.push(buf);
  return lines;
}

function parseVtt(vtt) {
  const cues = [];
  const blocks = vtt.replace(/\r/g, "").split(/\n\n+/);
  for (const b of blocks) {
    const m = b.match(/(\d{2}):(\d{2}):(\d{2})[.,](\d{3})\s*-->/);
    if (!m) continue;
    const text = b.split("\n")
      .filter((l) => !l.includes("-->") && !/^WEBVTT|^NOTE|^Kind:|^Language:|^\d+$/.test(l))
      .join(" ")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"')
      .trim();
    if (!text) continue;
    cues.push({ timestamp: stamp((+m[1]) * 3600 + (+m[2]) * 60 + (+m[3])), text });
  }
  return cues;
}

/* ---------- route 1: yt-dlp ---------- */

function viaYtDlp(url) {
  const meta = JSON.parse(yt(["--dump-single-json", "--skip-download", "--no-warnings", url]));

  const work = fs.mkdtempSync(path.join(os.tmpdir(), "fincheck-"));
  let cues = null, source = null;
  try {
    yt(["--skip-download", "--write-auto-subs", "--write-subs",
        "--sub-langs", "en.*,en", "--convert-subs", "vtt",
        "--no-warnings", "-o", path.join(work, "cap"), url]);
    const f = fs.readdirSync(work).find((n) => n.endsWith(".vtt"));
    if (f) { cues = parseVtt(fs.readFileSync(path.join(work, f), "utf8")); source = "captions"; }
  } catch (e) { /* no captions */ }
  fs.rmSync(work, { recursive: true, force: true });

  return {
    title: meta.title || null,
    creator: meta.uploader || meta.channel || meta.uploader_id || null,
    publishedAt: meta.upload_date
      ? `${meta.upload_date.slice(0, 4)}-${meta.upload_date.slice(4, 6)}-${meta.upload_date.slice(6, 8)}`
      : null,
    durationSec: meta.duration || null,
    cues, transcriptSource: source, route: "yt-dlp"
  };
}

/* ---------- route 2: the watch page itself ---------- */

async function viaWatchPage(id) {
  const res = await fetch(`https://www.youtube.com/watch?v=${id}&hl=en`, {
    headers: {
      "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      "accept-language": "en-GB,en;q=0.9"
    }
  });
  if (!res.ok) throw new Error(`watch page returned ${res.status}`);
  const html = await res.text();

  const m = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\})\s*;\s*(?:var|<\/script>)/s);
  if (!m) throw new Error("could not find player data — YouTube likely served a bot check. Use yt-dlp.");
  const player = JSON.parse(m[1]);

  const micro = (player.microformat || {}).playerMicroformatRenderer || {};
  const details = player.videoDetails || {};

  const tracks = (((player.captions || {}).playerCaptionsTracklistRenderer) || {}).captionTracks || [];
  const track = tracks.find((t) => /^en/i.test(t.languageCode)) || tracks[0];

  let cues = null, source = null;
  if (track && track.baseUrl) {
    const tRes = await fetch(track.baseUrl + "&fmt=json3");
    if (tRes.ok) {
      const j = await tRes.json();
      cues = (j.events || [])
        .filter((e) => e.segs)
        .map((e) => ({
          timestamp: stamp((e.tStartMs || 0) / 1000),
          text: e.segs.map((s) => s.utf8 || "").join("").replace(/\n/g, " ").trim()
        }))
        .filter((c) => c.text);
      source = track.kind === "asr" ? "captions_auto" : "captions";
    }
  }

  return {
    title: details.title || null,
    creator: details.author || null,
    publishedAt: (micro.publishDate || micro.uploadDate || "").slice(0, 10) || null,
    durationSec: details.lengthSeconds ? Number(details.lengthSeconds) : null,
    cues, transcriptSource: source, route: "watch-page"
  };
}

/* ---------------------------------------------------------- */

async function main() {
  const url = process.argv[2];
  if (!url) {
    console.error('Usage: node ingest.js "<video url>"');
    process.exit(1);
  }

  const n = E.normaliseUrl(url);
  if (!n.key) {
    console.error(`Not a video link I recognise: ${url}`);
    process.exit(1);
  }

  console.log(`link      ${url}`);
  console.log(`key       ${n.key}   (${n.platform})`);

  const ytdlp = haveYtDlp();
  let data;

  if (ytdlp) {
    console.log(`route     yt-dlp`);
    data = viaYtDlp(url);
  } else if (n.key.startsWith("tt:") || n.key.startsWith("ig:")) {
    console.error(`\nTikTok and Instagram need yt-dlp installed. Either:
  brew install yt-dlp        (macOS)
  pipx install yt-dlp        (anywhere with Python)
Then run this again. YouTube Shorts works without it.`);
    process.exit(1);
  } else {
    console.log(`route     watch page (yt-dlp not installed)`);
    data = await viaWatchPage(n.id);
  }

  if (!data.cues || !data.cues.length) {
    console.error(`\nNo caption track on this video.

That is a real outcome, not a bug — plenty of Shorts have none.
Options: pick a different video, or transcribe the audio locally
with whisper.cpp and drop the .vtt into transcripts/ by hand.`);
    process.exit(2);
  }

  const lines = toLines(collapseRolling(data.cues));
  const words = lines.reduce((a, l) => a + l.text.split(/\s+/).length, 0);

  const record = {
    url,
    urlKey: n.key,
    platform: n.platform,
    title: data.title,
    creator: data.creator,
    publishedAt: data.publishedAt,
    durationSec: data.durationSec,
    ingestedAt: new Date().toISOString().slice(0, 10),
    ingestRoute: data.route,
    transcriptState: "ok",
    transcriptSource: data.transcriptSource,
    transcriptWords: words,
    lines
  };

  fs.mkdirSync(OUTDIR, { recursive: true });
  const jsonPath = path.join(OUTDIR, `${n.key.replace(":", "_")}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(record, null, 2));

  /* The paste-ready prompt: the analyst instructions, then the
     real transcript this script just pulled. */
  const promptPath = path.join(OUTDIR, `${n.key.replace(":", "_")}.prompt.txt`);
  const instructions = fs.existsSync(PROMPT_FILE)
    ? fs.readFileSync(PROMPT_FILE, "utf8")
    : "(ANALYST_PROMPT.md missing)";
  fs.writeFileSync(promptPath, [
    instructions,
    "",
    "---",
    "",
    `VIDEO: ${record.title || "(untitled)"}`,
    `CREATOR: ${record.creator || "unknown"}`,
    `PUBLISHED: ${record.publishedAt || "unknown"}   <- assess every claim against this date`,
    `PLATFORM: ${record.platform}`,
    "",
    "TRANSCRIPT:",
    lines.map((l) => `[${l.timestamp}] ${l.text}`).join("\n")
  ].join("\n"));

  console.log(`title     ${record.title}`);
  console.log(`creator   ${record.creator}`);
  console.log(`posted    ${record.publishedAt || "UNKNOWN — say so on the card"}`);
  console.log(`captions  ${record.transcriptSource}   ${lines.length} lines, ${words} words`);
  console.log(`\nwrote     ${path.relative(process.cwd(), jsonPath)}`);
  console.log(`wrote     ${path.relative(process.cwd(), promptPath)}`);
  console.log(`\nNext: paste that .prompt.txt into Claude, save the JSON it returns,`);
  console.log(`then:  node import-analysis.js ${n.key} <that-file.json>\n`);
}

main().catch((e) => { console.error(`\nFailed: ${e.message}\n`); process.exit(1); });

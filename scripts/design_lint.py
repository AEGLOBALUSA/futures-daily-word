#!/usr/bin/env python3
"""Deterministic design lint for a Futures/MultiplyOS app. Grep settles these; no agent should
read code to find them.

  design_lint.py <repo> [--paths app components src pages lib] [--max 60] [--baseline FILE]
                        [--write-baseline FILE] [--json] [--only RULE,RULE]

Prints `file:line  [SEV RULE]  what is wrong -> the change`, worst first. Exit 1 if any BLOCK
finding (or, with --baseline, if any BLOCK is new). BLOCK = breaks a ruling or a user. WARN =
check it by eye. It finds; it never edits.

Copied from ~/.claude/skills/design/scripts/design_lint.py (13 rules) and extended with the 16
MOS rules in SF-00-02-lint-learns-the-mos-rules.md / SCORE-8-PLAN B00-02a. Standard library only.
"""
import argparse
import hashlib
import json
import os
import re
import sys

RAYS_HEAD = "M3.499,25.223L80.867,8.475L80.867,0L71.033,0L4.249,23.483"
SOLID_HEAD = "M3.499,25.223L80.867,8.475L80.867,0L37.166,0L3.197,22.132"
CREAM = r"#(?:faf6f0|f4efe7|fdfaf5|f1eadf|fdf6ee|eadfce|f5f0e6|fffaf0|fdf5e6|faf0e6|f5f5dc|fff8e7|fbf7f0|f7f3eb)\b"
# MOS-only CREAM additions (B00-02a): Heartbeat's own cream, found and named in SF-00-02.
CREAM_MOS = r"#(?:FAF9F4|F0EDE4)\b|\bbg-cream2?\b|\bborder-cream2?\b|var\(--cream2?\)|--cream2?\s*:|\bcream\s*:"

# The one shared "this is a main button" matcher (B00-02a step 3): used by MAIN-NO-NEXT,
# TWO-MAINS (extended), MAIN-IN-LOOP and WAITS-ON-PERSON. Deliberately does NOT match
# mo-button--quiet, mo-btn-fill or a bare "btn".
MAIN_RX = re.compile(
    r"\bmo-button--main\b|\bfx-button--main\b|\bbtn-primary\b|\bprimary-button\b"
    r"|<button\b(?=[^>]*\bdata-act=[\"']submit[\"'])",
)

TEXT_EXT = (".tsx", ".jsx", ".ts", ".js", ".mjs", ".mts", ".html", ".css", ".vue", ".svelte", ".astro", ".mdx")
SKIP_DIRS = {
    "node_modules", ".git", ".next", "dist", "build", "out", ".netlify", "coverage", ".turbo",
    "futures", "docs", "migrations", "__tests__", "__fixtures__",
}

COMMENT_PREFIXES = ("//", "*", "/*", "#", "<!--", "{/*")


def is_comment_line(line):
    return line.strip().startswith(COMMENT_PREFIXES)


def is_skipped_path(rel):
    """Shared skip for every new/extended MOS rule (not the 13 legacy ones, which keep their
    own behaviour): comments are handled per-line; this handles whole files/paths."""
    low = rel.replace("\\", "/")
    if low.endswith(".md"):
        return True
    if ".test." in os.path.basename(low):
        return True
    parts = low.split("/")
    if any(p in ("docs", "migrations", "__tests__", "__fixtures__", "node_modules") for p in parts):
        return True
    if "multiplyos" in parts:  # public/multiplyos/, components/multiplyos/, vendored kit copies
        return True
    return False


# ---------------------------------------------------------------------------
# is_mos / native detection (B00-02a step 2)
# ---------------------------------------------------------------------------

def is_mos(repo):
    """True when a multiplyos.css exists anywhere under the repo (outside node_modules), or
    DESIGN.md contains "MultiplyOS". Gates the MOS-only rules."""
    for d, dirs, files in os.walk(repo):
        dirs[:] = [x for x in dirs if x not in ("node_modules", ".git")]
        if "multiplyos.css" in files:
            return True
    record = os.path.join(repo, "DESIGN.md")
    if os.path.exists(record):
        try:
            if "MultiplyOS" in open(record, encoding="utf-8", errors="ignore").read():
                return True
        except OSError:
            pass
    return False


_NATIVE_CACHE = {}


def is_native(fp):
    """Walk up from the file to the NEAREST package.json; native when it lists expo or
    react-native under dependencies/devDependencies. Never keys on app.json (Heartbeat's root
    app.json has an expo key but its web package.json lists next)."""
    d = os.path.dirname(os.path.abspath(fp))
    start = d
    if start in _NATIVE_CACHE:
        return _NATIVE_CACHE[start]
    chain = []
    result = False
    while True:
        if d in _NATIVE_CACHE:
            result = _NATIVE_CACHE[d]
            break
        chain.append(d)
        pkg = os.path.join(d, "package.json")
        if os.path.exists(pkg):
            try:
                txt = open(pkg, encoding="utf-8", errors="ignore").read()
            except OSError:
                txt = ""
            result = bool(re.search(r'"(?:expo|react-native)"\s*:', txt))
            break
        parent = os.path.dirname(d)
        if parent == d:
            result = False
            break
        d = parent
    for c in chain:
        _NATIVE_CACHE[c] = result
    return result


# ---------------------------------------------------------------------------
# legacy 13 rules (unchanged behaviour)
# ---------------------------------------------------------------------------
RULES = [
    ("BLOCK", "FAKE-BOLD", r"\bfont-(?:medium|semibold|bold|extrabold|black)\b|font-weight:\s*(?:[5-9]00|bold)|fontWeight:\s*[\"']?(?:[5-9]00|bold)",
     "the brand faces ship no bold, the browser smears a fake one -> size or colour, or <strong> (Lemon marker)"),
    ("BLOCK", "GREYED-FIELD", r"<(?:input|textarea|select)\b[^>]*(?<![-\w])disabled\b(?!=\{false\})",
     "a field a person could type in is never disabled -> leave it live, put the reason inside or beside it"),
    ("WARN", "DEAD-BUTTON", r"<button\b[^>]*(?<![-\w])disabled\b(?![^>]*aria-describedby)",
     "fine while busy; if it waits on the PERSON it must say why -> aria-disabled + a .fx-why line saying what to do first"),
    ("BLOCK", "MAGIC-LINK", r"signInWithOtp|magic[\s_-]?link", "password sign-in, never magic links"),
    ("BLOCK", "NO-FOCUS", r"outline:\s*(?:none|0)\b|\boutline-none\b(?![^\"'`]*focus-visible:)",
     "focus ring removed -> keep :focus-visible (3px accent)"),
    ("BLOCK", "CREAM", CREAM, "cream/beige ground -> --ground (white) or --surface (#F5F5F7)"),
    ("BLOCK", "VIOLET-GROUND", r"(?:background(?:-color)?:\s*(?:#5D1FEC|var\(--electric-violet\))[^;]*;[^}]*min-height:\s*100|\bbg-\[#5D1FEC\][^\"'`]*\b(?:min-h-screen|h-screen)\b|(?<![-\w.#])(?:body|html|main)\s*\{[^}]*background(?:-color)?:\s*(?:#5D1FEC|var\(--(?:electric-violet|accent)\)))",
     "the accent is never a background -> white or black ground; violet stays on buttons, links, progress"),
    ("BLOCK", "VAGUE-LABEL", r">\s*(?:Submit|OK|Okay|Click here|Go|Proceed)\s*</(?:button|a)>",
     "a button says what it does -> verb + object (\"Send the email\", \"Book my visit\")"),
    ("WARN", "SMALL-TYPE",
     r"(?<!md:)(?<!lg:)(?<!xl:)(?<!2xl:)\btext-(?:xs|sm|\[(?:\d|1[0-5])(?:\.\d+)?px\])(?![\w-])"
     r"|font-size:\s*(?:1[0-5]|[0-9])(?:\.\d+)?px"
     r"|font-size:\s*0?\.[0-8]\d*rem"
     r"|(?<!max\(16px,)(?<!max\(16px, )calc\(\s*(?:1[0-5]|[0-9])(?:\.\d+)?px"
     r"|fontSize:\s*[\"']?(?:1[0-5]|[0-9])(?:px)?\b(?!\d)"
     r"|0?\.9\d*rem"
     r"|font:\s*(?:[a-zA-Z/,\-\s]*)(?:1[0-5]|[0-9])(?:\.\d+)?px",
     "under the 16px phone floor -> --size-small at least, or max(16px, calc(...)) for a scaled value"),
    ("WARN", "SMALL-TARGET", r"\b(?:h|min-h)-(?:[4-9]|10)\b[^\"'`]*\b(?:rounded|cursor-pointer)|<button\b[^>]*\bclassName=\"[^\"]*\bp[xy]?-(?:0\.5|1)\b",
     "tap target may be under 44px -> min-height 44, the main button 56"),
    ("WARN", "HOVER-ONLY", r"\b(?:opacity-0|invisible|hidden)\b[^\"'`]*\bgroup-hover:(?:opacity-100|visible|block|flex)",
     "revealed on hover only: a phone never sees it -> show it always"),
    ("WARN", "ICON-ONLY", r"<button\b(?![^>]*aria-label)[^>]*>\s*<(?:svg|[A-Z]\w*Icon|Icon)\b[^>]*/?>\s*(?:</svg>\s*)?</button>",
     "an icon with no word -> add the word beside it (aria-label alone is not enough for a sighted pastor)"),
    ("WARN", "EMAIL-VAR", r"var\(--", "EMAIL"),  # only applied to email/og/print paths below
]

# ---------------------------------------------------------------------------
# new rules, line-level (simple regex, one line at a time)
# ---------------------------------------------------------------------------

ALERT_ERROR_RX = re.compile(r"window\.alert\(|(?<![.\w])alert\(|Alert\.alert\(")
BROWSER_CONFIRM_RX = re.compile(r"window\.confirm\(")
TOAST_ERROR_RX = re.compile(r"toast\.error\(|toast\([^)]*(?:err|error|failed|'warn')")
DEV_WORDS_RX = re.compile(
    r"build step \d+|\bin SQL\b|toggleable by SQL|\b[Aa]sk Ashley\b|\bG\d{1,2}\s*·|·\s*G\d{1,2}\b|Arrives in (?:build )?step"
)
RANGE_SLIDER_RX = re.compile(r'type=["\']range["\']|<Slider\b')
GESTURE_ONLY_RX = re.compile(r"onLongPress=|Swipeable|PanGestureHandler|onSwipe")
OFF_SCALE_TONE_RX = re.compile(r'tone\s*[:=]\s*\{?[^}\n]*?["\']amber["\']')
HAND_VIOLET_RX = re.compile(r"#6226ED|#5D1FEC", re.I)
EMOJI_RX = re.compile(
    "[\U0001F000-\U0001FAFF☀-➿]"
)
EMOJI_ALLOW = {"✓", "✔", "✗", "✘"}


def collapse_ws(line):
    return re.sub(r"\s+", " ", line.strip())


def fingerprint(line):
    return hashlib.sha1(collapse_ws(line).encode("utf-8")).hexdigest()


def scan(repo, paths):
    out = []  # (sev, rel, lineno, rule, msg, matched_line_text)
    record = os.path.join(repo, "DESIGN.md")
    brand_look = os.path.exists(record) and bool(re.search(r"^- look:\s*brand", open(record, encoding="utf-8", errors="ignore").read(), re.M))
    mos = is_mos(repo)
    roots = [os.path.join(repo, p) for p in paths if os.path.exists(os.path.join(repo, p))] or [repo]

    main_hits = []       # (rel, lineno, line_text) for MAIN matches in UI files (mos repo-level rule)
    data_next_seen = False

    for root in roots:
        for d, dirs, files in os.walk(root):
            dirs[:] = [x for x in dirs if x not in SKIP_DIRS]
            for f in files:
                if not f.endswith(TEXT_EXT):
                    continue
                fp = os.path.join(d, f)
                try:
                    src = open(fp, encoding="utf-8", errors="ignore").read()
                except OSError:
                    continue
                rel = os.path.relpath(fp, repo)
                if is_skipped_path(rel):
                    continue
                leaves_browser = bool(re.search(r"email|opengraph|og-image|/print/|print-view", rel, re.I))
                lines = src.split("\n")

                def add(sev, rule, msg, lineno):
                    text = lines[lineno - 1] if 0 < lineno <= len(lines) else ""
                    out.append((sev, rel, lineno, rule, msg, text))

                # --- legacy 13 rules ---
                for sev, rule, rx, msg in RULES:
                    if rule == "EMAIL-VAR":
                        if not leaves_browser:
                            continue
                        sev, msg = "BLOCK", "var() never resolves in email HTML, OG images or print -> literal brand hex"
                    if rule == "FAKE-BOLD" and not brand_look:
                        continue
                    for m in re.finditer(rx, src, re.I | re.S):
                        lineno = src.count("\n", 0, m.start()) + 1
                        if is_comment_line(lines[lineno - 1] if lineno <= len(lines) else ""):
                            continue
                        add(sev, rule, msg, lineno)

                # mark checks (unchanged)
                for m in re.finditer(r'80\.867 82\.473"[^>]*>\s*<path[^>]*?\sd=[{"\']+(M[^"\'}]{40})', src):
                    if not (RAYS_HEAD.startswith(m.group(1)[:40]) or SOLID_HEAD.startswith(m.group(1)[:40])):
                        add("BLOCK", "REDRAWN-MARK", "the logo is never redrawn -> copy the path from assets/, never retype it", src.count("\n", 0, m.start()) + 1)
                if re.search(r"preserveAspectRatio=\"none\"", src) and "80.867" in src:
                    add("BLOCK", "STRETCHED-MARK", "the logo is never stretched -> set height only", 1)

                # --- TWO-MAINS (extended): any MAIN match, not just fx-button--main ---
                if f.endswith((".tsx", ".jsx", ".html", ".vue", ".svelte", ".astro")):
                    n = len(MAIN_RX.findall(src))
                    if n > 1:
                        add("WARN", "TWO-MAINS", f"{n} main buttons in one file: one screen has ONE -> demote the rest to .mo-button", 1)

                # collect MAIN hits + data-next presence for the repo-level MAIN-NO-NEXT rule
                if mos:
                    for m in MAIN_RX.finditer(src):
                        lineno = src.count("\n", 0, m.start()) + 1
                        line_text = lines[lineno - 1] if lineno <= len(lines) else ""
                        if is_comment_line(line_text):
                            continue
                        main_hits.append((rel, lineno, line_text))
                    if re.search(r"data-next\b|dataNext\b", src):
                        data_next_seen = True

                # --- MAIN-IN-LOOP (BLOCK, MOS only) ---
                if mos:
                    for m in MAIN_RX.finditer(src):
                        lineno = src.count("\n", 0, m.start()) + 1
                        idx = lineno - 1
                        if idx >= len(lines) or is_comment_line(lines[idx]):
                            continue
                        if _in_unguarded_map(lines, idx):
                            add("BLOCK", "MAIN-IN-LOOP", "every row gets a main button -> first row main + data-next, the rest .mo-button", lineno)

                # --- FORM-NO-NOVALIDATE (BLOCK) ---
                for m in re.finditer(r"<form\b(.*?)>", src, re.S):
                    tag_body = m.group(1)
                    if re.search(r"noValidate|novalidate", tag_body):
                        continue
                    end = src.find("</form>", m.end())
                    body = src[m.end(): end if end != -1 else min(len(src), m.end() + 4000)]
                    if re.search(r"\brequired\b|pattern=|minLength|maxLength|type=[\"']email[\"']", body):
                        lineno = src.count("\n", 0, m.start()) + 1
                        if not is_comment_line(lines[lineno - 1] if lineno <= len(lines) else ""):
                            add("BLOCK", "FORM-NO-NOVALIDATE", "the browser stops the form without a word on iOS -> noValidate + your own check, error beside the button", lineno)

                # --- WAITS-ON-PERSON (BLOCK) ---
                for m in re.finditer(r"<button\b.*?>", src, re.S):
                    tag = m.group(0)
                    if not MAIN_RX.search(tag):
                        continue
                    expr = None
                    dis = re.search(r"(?<![\w-])disabled=\{([^}]*)\}", tag)  # aria-disabled is the fix, not the fault
                    if dis:
                        expr = dis.group(1)
                    else:
                        dis2 = re.search(r"\$\{([^}]*?)\?\s*['\"]disabled['\"]\s*:\s*['\"]['\"]\}", tag)
                        if dis2:
                            expr = dis2.group(1)
                    if expr is None:
                        continue
                    lineno = src.count("\n", 0, m.start()) + 1
                    if is_comment_line(lines[lineno - 1] if lineno <= len(lines) else ""):
                        continue
                    if _waits_on_person(expr):
                        add("BLOCK", "WAITS-ON-PERSON", "the main button waits on the person -> aria-disabled + a .mo-why line saying what to do first (kit MoMainButton)", lineno)

                # --- line-level rules ---
                for lineno, line in enumerate(lines, start=1):
                    if is_comment_line(line):
                        continue

                    if ALERT_ERROR_RX.search(line):
                        sev = "WARN" if is_native(fp) else "BLOCK"
                        add(sev, "ALERT-ERROR", "a pop-up error disappears -> one line beside the button that was pressed (.mo-status--error)", lineno)

                    if BROWSER_CONFIRM_RX.search(line):
                        add("WARN", "BROWSER-CONFIRM", "a browser dialog -> the kit confirm sheet that names what is destroyed and whether it can be undone (RULES-CARD §8 rule 11)", lineno)

                    if TOAST_ERROR_RX.search(line):
                        add("WARN", "TOAST-ERROR", "a toast slides away before it is read -> the error beside the button", lineno)

                    if DEV_WORDS_RX.search(line):
                        add("BLOCK", "DEV-WORDS", "developer words shown to a person -> say what it means for them; name a role, never Ashley", lineno)

                    if mos and re.search(CREAM_MOS, line):
                        add("BLOCK", "CREAM", "cream/beige ground -> --ground (white) or --surface (#F5F5F7)", lineno)

                    if f.endswith((".tsx", ".jsx", ".html", ".vue", ".svelte")) or f.endswith((".ts", ".js")):
                        if "console." not in line:
                            emoji_sev = "BLOCK" if f.endswith((".tsx", ".jsx", ".html", ".vue", ".svelte")) else "WARN"
                            for ch in line:
                                cp = ord(ch)
                                if ch in EMOJI_ALLOW:
                                    continue
                                if 0x1F000 <= cp <= 0x1FAFF or 0x2600 <= cp <= 0x27BF:
                                    add(emoji_sev, "EMOJI-UI", "emoji as UI -> a word, or a lucide icon at 1.5 stroke with the word beside it", lineno)
                                    break

                    if RANGE_SLIDER_RX.search(line):
                        if "data-mo-allow=\"scrubber\"" in line or "data-mo-allow='scrubber'" in line:
                            pass
                        elif "<" not in line and "[type=" in line:
                            pass  # a CSS attribute selector, not a tag
                        else:
                            add("BLOCK", "RANGE-SLIDER", "no sliders: propose the value as a sentence the person accepts", lineno)

                    if GESTURE_ONLY_RX.search(line):
                        add("WARN", "GESTURE-ONLY", "a gesture nobody can see -> add a visible button that does the same", lineno)

                    if mos and OFF_SCALE_TONE_RX.search(line):
                        add("WARN", "OFF-SCALE-TONE", "check this is a warning; if so use a MoLight level, if not it gets no light", lineno)

                    if mos:
                        if re.search(r'severity["\']?\s*[:=]\s*["\']blue["\']', line):
                            add("BLOCK", "OFF-SCALE", "one scale: green, yellow, orange, red (his 25 Sep ruling) -> kit MoLight levels", lineno)
                        elif re.search(r'["\']amber["\']|^\s*amber\s*:', line):
                            window = "\n".join(lines[max(0, lineno - 4): lineno + 3])
                            if re.search(r"\bred\b", window) and re.search(r"\bgreen\b", window):
                                add("BLOCK", "OFF-SCALE", "one scale: green, yellow, orange, red (his 25 Sep ruling) -> kit MoLight levels", lineno)

                    if mos and f.endswith((".tsx", ".jsx", ".ts")):
                        for hv in HAND_VIOLET_RX.finditer(line):
                            # skip if this same line already carries a VIOLET-GROUND finding
                            if re.search(r"background(?:-color)?:\s*(?:#5D1FEC|var\(--electric-violet\))", line, re.I) and "min-height" in line:
                                continue
                            add("BLOCK", "HAND-VIOLET", "hand-typed violet in a chart or fill -> the kit series tokens", lineno)
                            break

    # --- MAIN-NO-NEXT (repo-level, BLOCK, MOS only) ---
    if mos and main_hits and not data_next_seen:
        rel, lineno, text = main_hits[0]
        out.append(("BLOCK", rel, lineno, "MAIN-NO-NEXT", "no screen marks its next step -> data-next on the one main button (kit next-step.js shows the Next pill)", text))

    return out


def _in_unguarded_map(lines, idx):
    """MAIN-IN-LOOP heuristic (B00-02a step 4): nearest unclosed `.map(` within 30 lines
    above, at lower indentation, with no first-row guard between."""
    cur_indent = len(lines[idx]) - len(lines[idx].lstrip())
    start = max(0, idx - 30)
    for j in range(idx - 1, start - 1, -1):
        line = lines[j]
        if ".map(" not in line:
            continue
        indent = len(line) - len(line.lstrip())
        if indent >= cur_indent:
            continue
        between = "\n".join(lines[j + 1: idx + 1])
        if re.search(r"index === 0|i === 0|idx === 0|isFirst|\bfirst\b", between):
            return False
        return True
    return False


BUSY_WORD = r"(?:is)?[A-Za-z]*(?:busy|Busy|pending|Pending|saving|Saving|sending|Sending|loading|Loading|working|Working|submitting|Submitting|generating|creating|confirming)\w*"


def _is_busy_only(part):
    part = part.strip()
    m = re.match(r"^Boolean\((.*)\)$", part)
    if m:
        part = m.group(1).strip()
    if part.startswith("!"):
        return False
    # phase === 'sending' is in-flight state, the same as a sending flag
    cmp = re.match(r"^[A-Za-z_][A-Za-z0-9_.]*\s*===?\s*['\"]([A-Za-z]+)['\"]$", part)
    if cmp:
        return bool(re.fullmatch(BUSY_WORD + "|preparing|halting|testing|uploading", cmp.group(1)))
    if re.fullmatch(r"(?:is)?(?:[Pp]reparing|[Hh]alting|[Tt]esting|[Uu]ploading)", part):
        return True
    ident = re.match(r"^([A-Za-z_][A-Za-z0-9_.]*)", part)
    if not ident:
        return False
    return bool(re.search(BUSY_WORD, ident.group(1)))


def _waits_on_person(expr):
    parts = re.split(r"\|\||&&", expr)
    return any(not _is_busy_only(p) for p in parts if p.strip())


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("repo")
    ap.add_argument("--paths", nargs="*", default=["app", "components", "src", "pages", "lib"])
    ap.add_argument("--max", type=int, default=60)
    ap.add_argument("--baseline", default=None)
    ap.add_argument("--write-baseline", dest="write_baseline", default=None)
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--only", default=None)
    a = ap.parse_args(argv)
    repo = os.path.abspath(os.path.expanduser(a.repo))
    found = scan(repo, a.paths)

    if a.only:
        only = set(r.strip() for r in a.only.split(","))
        found = [x for x in found if x[3] in only]

    # de-dup identical findings (a few rules can double-report the same spot)
    seen = set()
    deduped = []
    for x in found:
        key = (x[0], x[1], x[2], x[3])
        if key in seen:
            continue
        seen.add(key)
        deduped.append(x)
    found = deduped

    found.sort(key=lambda x: (x[0] != "BLOCK", x[3], x[1], x[2]))

    if a.write_baseline:
        baseline = [
            {"rule": rule, "file": rel, "fingerprint": fingerprint(text)}
            for sev, rel, lineno, rule, msg, text in found
        ]
        with open(a.write_baseline, "w") as fh:
            json.dump(baseline, fh, indent=2)
        print(f"wrote {len(baseline)} findings to {a.write_baseline}")
        return 0

    baseline_set = set()
    if a.baseline and os.path.exists(a.baseline):
        try:
            entries = json.load(open(a.baseline))
        except (OSError, ValueError):
            entries = []
        for e in entries:
            baseline_set.add((e.get("rule"), e.get("file"), e.get("fingerprint")))

    new_blocks = 0
    for sev, rel, lineno, rule, msg, text in found[: a.max]:
        is_new = (rule, rel, fingerprint(text)) not in baseline_set
        if a.json:
            print(json.dumps({"severity": sev, "file": rel, "line": lineno, "rule": rule, "message": msg, "new": is_new if a.baseline else None}))
        else:
            print(f"{rel}:{lineno}  [{sev} {rule}]  {msg}")

    blocks = 0
    for sev, rel, lineno, rule, msg, text in found:
        if sev != "BLOCK":
            continue
        blocks += 1
        if a.baseline:
            if (rule, rel, fingerprint(text)) not in baseline_set:
                new_blocks += 1
        else:
            new_blocks += 1

    warns = len(found) - blocks
    by_rule = {}
    for x in found:
        by_rule[x[3]] = by_rule.get(x[3], 0) + 1

    if not a.json:
        suffix = f" (showing {a.max})" if len(found) > a.max else ""
        if a.baseline:
            print(f"\n{blocks} BLOCK ({new_blocks} new), {warns} WARN{suffix}")
        else:
            print(f"\n{blocks} BLOCK, {warns} WARN{suffix}")
        if by_rule:
            print("by rule: " + ", ".join(f"{k} {v}" for k, v in sorted(by_rule.items(), key=lambda kv: -kv[1])))
        if not os.path.exists(os.path.join(repo, "DESIGN.md")):
            print("no DESIGN.md: the logo and accent have not been chosen for this app yet")

    return 1 if new_blocks else 0


if __name__ == "__main__":
    sys.exit(main())

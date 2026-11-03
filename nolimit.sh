#!/usr/bin/env bash
set -e
FILE=$(grep -l "Cozy Garden Builder" *.html 2>/dev/null | head -1)
[ -z "$FILE" ] && { echo "Could not find the game html file"; exit 1; }
cp "$FILE" "$FILE.nolimit.bak"

python3 - "$FILE" <<'PY'
import sys, re
f = sys.argv[1]
s = open(f, encoding="utf-8").read()
if "/*noHeightLimit*/" in s:
    print("Already patched"); sys.exit(0)

# 1) track the tallest block ever placed (VX becomes a Proxy)
old = "var VX=window.__VX={};"
new = ('var VX=window.__VX=new Proxy({},{set:function(t,k,v){/*noHeightLimit*/'
       'var L=+String(k).split(",")[2];if(L>(window.__VT|0))window.__VT=L;t[k]=v;return true}});')
if old not in s:
    print("ERROR: block storage not found"); sys.exit(1)
s = s.replace(old, new, 1)

# 2) every scan up to level 30 now scans up to the tallest block
s, a = re.subn(r"\bL<=30\b", "L<=(window.__VT|0)", s)
s, b = re.subn(r"L=30;L>=0;L--", "L=(window.__VT|0);L>=0;L--", s)

# 3) remove the build limits ("Too high!")
s, c = re.subn(r"MAXL=30\b", "MAXL=1e6", s)

# 4) inside-view floor limit and far plane
s = s.replace("if(n<0||n>20)return;", "if(n<0||n>5000)return;")
s = s.replace("In.far=200", "In.far=1000")

open(f, "w", encoding="utf-8").write(s)
print("Patched: %d scan loops, %d reverse loops, %d limits removed" % (a, b, c))
PY

git add -A
git commit -m "Remove building height limit" || true
git push

#!/usr/bin/env bash
set -e
FILE=$(grep -l "Cozy Garden Builder" *.html 2>/dev/null | head -1)
[ -z "$FILE" ] && { echo "Could not find the game html file"; exit 1; }
cp "$FILE" "$FILE.smoothcam.bak"

python3 - "$FILE" <<'PY'
import sys
f = sys.argv[1]
s = open(f, encoding="utf-8").read()
if "/*smoothCam*/" in s:
    print("Already patched"); sys.exit(0)

old = "In.position.set(px,EYE+py+camOff+Math.sin(bob)*.025,pz);"
new = ("/*smoothCam*/var __t=EYE+py+camOff+Math.sin(bob)*.025,__n=performance.now(),"
       "__g=__n-(window.__sl||__n);window.__sl=__n;"
       "if(window.__sy===undefined||__g>400||Math.abs(__t-window.__sy)>2.5)window.__sy=__t;"
       "else window.__sy+=(__t-window.__sy)*Math.min(1,Math.min(.1,__g/1000)*16);"
       "In.position.set(px,window.__sy,pz);")
if old not in s:
    print("ERROR: camera line not found"); sys.exit(1)
s = s.replace(old, new, 1)
open(f, "w", encoding="utf-8").write(s)
print("Patched", f)
PY

git add -A
git commit -m "Kingdom: smooth camera height to stop up/down flicker" || true
git push

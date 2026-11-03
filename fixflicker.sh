#!/usr/bin/env bash
set -e
FILE=$(grep -l "Cozy Garden Builder" *.html 2>/dev/null | head -1)
[ -z "$FILE" ] && { echo "Could not find the game html file"; exit 1; }
cp "$FILE" "$FILE.flicker.bak"

python3 - "$FILE" <<'PY'
import sys
f = sys.argv[1]
s = open(f, encoding="utf-8").read()
if "/*flickerFix*/" in s:
    print("Already patched"); sys.exit(0)

R = [
# 1) depth precision
("if(In.fov!==72||In.near!==.1){In.fov=72;In.near=.1;In.updateProjectionMatrix()}",
 "if(In.fov!==72||In.near!==.2){In.fov=72;In.near=.2;In.far=200;In.updateProjectionMatrix()}"),
# restore far plane when leaving the kingdom
("In.near=.5; In.rotation.order=\"XYZ\";",
 "In.near=.5; In.far=300; In.rotation.order=\"XYZ\";"),
# 2) sub-stepped movement so running cannot tunnel or jitter
("else{if(free(px+dx,pz))px+=dx;if(free(px,pz+dz))pz+=dz}",
 "else{var _n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.12)),_sx=dx/_n,_sz=dz/_n;for(var _i=0;_i<_n;_i++){if(free(px+_sx,pz))px+=_sx;if(free(px,pz+_sz))pz+=_sz}}"),
# 3) fewer footstep sounds while running
("stepAcc>((keys.ShiftLeft||keys.ShiftRight)?1.1:.75)",
 "stepAcc>((keys.ShiftLeft||keys.ShiftRight)?3.2:.75)"),
# 4) stop full-world scans from causing hitches
("now-lastScan>(fp?6000:1200)", "now-lastScan>(fp?30000:1200)"),
("now-lastScan>(window.__fpOn?8000:1500)", "now-lastScan>(window.__fpOn?30000:1500)"),
("if(now-lastScan>6000){lastScan=now;scanHalos()}", "if(now-lastScan>20000){lastScan=now;scanHalos()}"),
("if(dirty||now-lastScan>(window.__fpOn?8000:2500)){dirty=0;lastScan=now;rescan()}",
 "if((dirty&&(!window.__fpOn||now-lastScan>2000))||now-lastScan>(window.__fpOn?30000:2500)){dirty=0;lastScan=now;rescan()}"),
]
ok = 0
for old, new in R:
    if old in s:
        s = s.replace(old, new, 1); ok += 1
    else:
        print("WARNING: not found ->", old[:60])
s = s.replace("</body>", "<!--flickerFix--><script>/*flickerFix*/</script>\n</body>", 1)
open(f, "w", encoding="utf-8").write(s)
print("Applied %d of %d fixes to %s" % (ok, len(R), f))
PY

git add -A
git commit -m "Kingdom: fix flicker (depth precision), sub-step movement, fewer footstep sounds, fewer world scans" || true
git push

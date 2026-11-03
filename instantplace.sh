#!/usr/bin/env bash
set -e
FILE=$(grep -l "Cozy Garden Builder" *.html 2>/dev/null | head -1)
[ -z "$FILE" ] && { echo "Could not find the game html file"; exit 1; }
cp "$FILE" "$FILE.instant.bak"

python3 - "$FILE" <<'PY'
import sys
f = sys.argv[1]
s = open(f, encoding="utf-8").read()
if "/*instantPlace*/" in s:
    print("Already patched"); sys.exit(0)

n = 0
for old, new in [
  ("DELAY=140,GAP=35", "DELAY=150,GAP=20"),
  ("if(n-lastF<30)return;lastF=n;doPlace()", "if(n-lastF<15)return;lastF=n;doPlace()"),
]:
    if old in s:
        s = s.replace(old, new, 1); n += 1
    else:
        print("WARNING: not found ->", old[:50])

js = r'''
<script>
/*instantPlace*/
(function(){
"use strict";
var look=document.getElementById("fpLook"),S=window.__fpS,G=window.__game,B=window.__builder;
if(!look||!S||!G||!B||!B.parent)return;

/* 1) place on mouse-down, break on right-down (no waiting for release) */
var swallow={0:0,2:0};
function locked(){return document.pointerLockElement===look}
function lookingDown(){return S.pitch<-1.0&&!(window.__tLandOn&&window.__tLandOn())}
window.addEventListener("pointerdown",function(e){
  if(!window.__fpOn||e.target!==look||e.pointerType!=="mouse"||!locked())return;
  if(e.button===0){
    if(lookingDown())return;               /* pillar-up keeps its own logic */
    if(window.__fpx&&window.__fpx.place){window.__fpx.place();swallow[0]=1}
  }else if(e.button===2){
    if(window.__fpBreak){window.__fpBreak();swallow[2]=1}
  }
},true);
window.addEventListener("pointerup",function(e){
  if(e.target!==look||!swallow[e.button])return;
  swallow[e.button]=0;e.stopImmediatePropagation();e.stopPropagation();
},true);

/* 2) throttle the placement sound */
var sf=window.__sfx;
if(sf&&sf.place){var op=sf.place,t0=0;sf.place=function(id){var n=performance.now();if(n-t0<60)return true;t0=n;return op(id)}}

/* 3) render distance: do not draw blocks far away (set window.__cullR=0 to turn off) */
var fo=null;B.parent.children.forEach(function(o){if(!fo&&o.isGroup)fo=o});
var culled=false;
window.__cullR=90;
setInterval(function(){
  if(!fo)return;
  var ch=fo.children,i,o;
  if(!window.__fpOn||!window.__cullR){
    if(culled){for(i=0;i<ch.length;i++)ch[i].visible=true;culled=false;G.redraw()}
    return;
  }
  var r2=window.__cullR*window.__cullR,px=S.px,pz=S.pz,dx,dz,v;
  for(i=0;i<ch.length;i++){
    o=ch[i];dx=o.position.x-px;dz=o.position.z-pz;v=dx*dx+dz*dz<=r2;
    if(o.visible!==v)o.visible=v;
  }
  culled=true;
},400);

/* 4) FPS counter (Kingdom only) */
var el=document.createElement("div");
el.style.cssText="position:fixed;left:8px;bottom:8px;z-index:60;background:rgba(0,0,0,.55);color:#9f9;font:700 12px monospace;padding:3px 8px;border-radius:8px;pointer-events:none;display:none";
document.body.appendChild(el);
var fr=0,last=performance.now();
(function loop(now){
  requestAnimationFrame(loop);
  fr++;
  if(now-last>=500){
    el.style.display=window.__fpOn?"block":"none";
    el.textContent=Math.round(fr*1000/(now-last))+" FPS";
    fr=0;last=now;
  }
})(performance.now());
})();
</script>
'''
i = s.rfind("</body>")
s = s[:i] + js + s[i:]
open(f, "w", encoding="utf-8").write(s)
print("Patched %s (%d constant tweaks + instant place script)" % (f, n))
PY

git add -A
git commit -m "Kingdom: instant place/break on mouse-down, faster hold repeat, sound throttle, render distance, FPS counter" || true
git push

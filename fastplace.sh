#!/usr/bin/env bash
set -e
FILE=$(grep -l "Cozy Garden Builder" *.html 2>/dev/null | head -1)
[ -z "$FILE" ] && { echo "Could not find the game html file"; exit 1; }
cp "$FILE" "$FILE.bak"

python3 - "$FILE" <<'PY'
import sys
f = sys.argv[1]
s = open(f, encoding="utf-8").read()

if "/*fastPlace*/" in s:
    print("Already patched"); sys.exit(0)

# 1) cheap ql() while inside the Kingdom: defer goals / income / save until idle
old = "function ql(){Su(),er(),cgBagUi(),tc()}"
new = ("var __qd=0;function ql(){if(window.__fpOn){cgBagUi();clearTimeout(__qd);"
       "__qd=setTimeout(function(){Su(),er(),tc()},800);return}"
       "Su(),er(),cgBagUi(),tc()}")
if old not in s:
    print("ERROR: ql() not found, file layout changed"); sys.exit(1)
s = s.replace(old, new, 1)

# 2) fast grid-march aim (no raycast against every mesh)
js = r'''
<script>
/*fastPlace*/
(function(){
"use strict";
var G=window.__game,S=window.__fpS,B=window.__builder;
if(!G||!S||!B||!B.parent)return;
var cells=G.cells,lt=Math.round(Math.sqrt(cells.length)),half=lt/2,H=.92,REACH=9,STEP=.07;
var Wt=null;
B.parent.children.forEach(function(o){var p=o.geometry&&o.geometry.parameters;if(!Wt&&p&&p.width===.96&&p.height===.96)Wt=o});
var oldAim=window.__tAim;
function colTop(ix,iz){
  var i=iz*lt+ix,c=cells[i],h=0,T=window.__terrain,V=window.__VX;
  if(c.base)h=H;
  if(c.stack&&c.stack.length)h=(c.stack.length+1)*H;
  else if(c.floor&&!c.base)h=.06;
  if(c.top&&h<H*1.2)h=H*1.2;
  if(V)for(var L=30;L>=0;L--)if(V[ix+","+iz+","+L]){h=Math.max(h,(L+1)*H);break}
  return (T&&T.lvl?T.lvl(i)*H:0)+h;
}
function fastAim(){
  var n=G.size,off=(lt-n)/2,yaw=S.yaw,p=S.pitch,cp=Math.cos(p);
  var dx=-Math.sin(yaw)*cp,dy=Math.sin(p),dz=-Math.cos(yaw)*cp;
  var ox=S.px,oy=.72+S.py+(S.camOff||0),oz=S.pz,cache={};
  for(var t=.15;t<REACH;t+=STEP){
    var y=oy+dy*t;
    if(y<-6)break;
    var ix=Math.floor(ox+dx*t+half),iz=Math.floor(oz+dz*t+half);
    if(ix<off||iz<off||ix>=off+n||iz>=off+n)continue;
    var i=iz*lt+ix,top=cache[i];
    if(top===undefined)top=cache[i]=colTop(ix,iz);
    if(y<=top)return{ix:ix,iz:iz,top:top};
  }
  return null;
}
window.__tAim=function(){
  if(!window.__fpOn)return oldAim?oldAim():undefined;
  if(window.__tLandOn&&window.__tLandOn())return oldAim?oldAim():undefined;
  var r=fastAim();
  if(!r)return null;
  if(Wt)Wt.position.y=r.top+.05;
  return {ix:r.ix,iz:r.iz};
};
})();
</script>
'''
i = s.rfind("</body>")
s = s[:i] + js + s[i:]
open(f, "w", encoding="utf-8").write(s)
print("Patched", f)
PY

git add -A
git commit -m "Kingdom: fast block placing (grid-march aim, deferred save/goal scans)" || true
git push

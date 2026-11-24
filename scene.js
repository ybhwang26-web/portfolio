/* scene.js — a tiny 3Blue1Brown-style animation player for SVG.
 *
 * A scene is a list of steps. Each step has a label and a draw(g, t) function.
 * When step k plays, steps 0..k-1 are drawn finished (t = 1) and step k is drawn at t from 0 to 1.
 * Readers press Next / Back / Replay, like stepping through a lecture.
 *
 * Usage:
 *   Scene.create(document.getElementById("myScene"), {
 *     viewBox: "0 0 640 300",
 *     steps: [
 *       { label: "Draw the circle", dur: 1200, draw: (g, t, S) => S.circle(g, 320, 150, 100, { write: t }) },
 *       { label: "Add a point",     dur: 800,  draw: (g, t, S) => S.dot(g, 420, 150, { fade: t, accent: true }) }
 *     ]
 *   });
 *
 * Helpers on S (all colors follow the site theme):
 *   S.line(g,x1,y1,x2,y2,o)  S.circle(g,cx,cy,r,o)  S.path(g,d,o)  S.dot(g,x,y,o)
 *   S.arrow(g,x1,y1,x2,y2,o) S.text(g,x,y,str,o)    S.lerp(a,b,t)  S.ease(t)
 *   options o: { write: 0..1 (draws the stroke on), fade: 0..1, accent: true, muted: true,
 *                width: px, dash: "4 4", fill: true, size: px, anchor: "middle", italic: true }
 */
(function(global){
  var NS="http://www.w3.org/2000/svg";
  var reduce=window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function css(name){return getComputedStyle(document.documentElement).getPropertyValue(name).trim();}
  function colors(){return {ink:css("--ink"),muted:css("--muted"),accent:css("--accent-text"),line:css("--line"),bg:css("--bg"),soft:css("--soft"),mid:css("--mid")};}
  function ease(t){t=Math.max(0,Math.min(1,t));return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;}
  function lerp(a,b,t){return a+(b-a)*t;}
  function mk(tag,attrs,parent){var e=document.createElementNS(NS,tag);for(var k in attrs)e.setAttribute(k,attrs[k]);if(parent)parent.appendChild(e);return e;}

  function helpers(C){
    function stroke(o){return o.accent?C.accent:o.muted?C.muted:C.ink;}
    function finish(e,o){
      if(o.fade!=null) e.setAttribute("opacity",Math.max(0,Math.min(1,o.fade)));
      if(o.write!=null && e.getTotalLength){
        var L=e.getTotalLength(); e.setAttribute("stroke-dasharray",L); e.setAttribute("stroke-dashoffset",L*(1-ease(o.write)));
      }
      return e;
    }
    var S={
      colors:C, ease:ease, lerp:lerp,
      line:function(g,x1,y1,x2,y2,o){o=o||{};return finish(mk("line",{x1:x1,y1:y1,x2:x2,y2:y2,stroke:stroke(o),"stroke-width":o.width||2,"stroke-dasharray":o.dash||"none","stroke-linecap":"round"},g),o);},
      path:function(g,d,o){o=o||{};return finish(mk("path",{d:d,stroke:stroke(o),"stroke-width":o.width||2,fill:o.fill?(o.accent?C.accent:C.soft):"none","stroke-linejoin":"round","stroke-linecap":"round","stroke-dasharray":o.dash||"none"},g),o);},
      circle:function(g,cx,cy,r,o){o=o||{};return finish(mk("circle",{cx:cx,cy:cy,r:r,stroke:stroke(o),"stroke-width":o.width||2,fill:o.fill?C.soft:"none"},g),o);},
      dot:function(g,x,y,o){o=o||{};return finish(mk("circle",{cx:x,cy:y,r:o.r||5,fill:stroke(o)},g),o);},
      text:function(g,x,y,s,o){o=o||{};var t=mk("text",{x:x,y:y,fill:stroke(o),"font-size":o.size||15,"text-anchor":o.anchor||"start","font-family":o.mono?css("--f-mono"):css("--f-display"),"font-style":o.italic?"italic":"normal"},g);t.textContent=s;return finish(t,o);},
      arrow:function(g,x1,y1,x2,y2,o){o=o||{};var w=(o.write==null)?1:ease(o.write);var xe=lerp(x1,x2,w),ye=lerp(y1,y2,w);
        var grp=mk("g",{},g);mk("line",{x1:x1,y1:y1,x2:xe,y2:ye,stroke:stroke(o),"stroke-width":o.width||2.2,"stroke-linecap":"round"},grp);
        if(w>0.05){var a=Math.atan2(y2-y1,x2-x1),s=o.head||9;mk("path",{d:"M"+xe+","+ye+" L"+(xe-s*Math.cos(a-.42))+","+(ye-s*Math.sin(a-.42))+" L"+(xe-s*Math.cos(a+.42))+","+(ye-s*Math.sin(a+.42))+" Z",fill:stroke(o)},grp);}
        if(o.fade!=null) grp.setAttribute("opacity",o.fade);return grp;}
    };
    return S;
  }

  function create(host,opts){
    var steps=opts.steps, k=steps.length-1, t=1, raf=null;
    host.classList.add("scene");
    var svg=mk("svg",{viewBox:opts.viewBox||"0 0 640 320",role:"img","aria-label":opts.label||"Animated diagram"},host);
    var ctl=document.createElement("div");ctl.className="bar-ctl";host.appendChild(ctl);
    var back=btn("Back"),next=btn("Next"),replay=btn("Replay all");next.classList.add("primary");
    var dots=document.createElement("div");dots.className="dots";ctl.appendChild(dots);
    steps.forEach(function(){dots.appendChild(document.createElement("span"));});
    var lab=document.createElement("div");lab.className="step-label";lab.setAttribute("aria-live","polite");ctl.appendChild(lab);
    function btn(s){var b=document.createElement("button");b.type="button";b.className="btn";b.textContent=s;ctl.appendChild(b);return b;}
    function render(){
      while(svg.firstChild)svg.removeChild(svg.firstChild);
      var S=helpers(colors());
      for(var i=0;i<=k;i++){var g=mk("g",{},svg);steps[i].draw(g,i<k?1:t,S);}
      lab.textContent=(k+1)+" / "+steps.length+" — "+steps[k].label;
      Array.prototype.forEach.call(dots.children,function(d,i){d.className=i<=k?"on":"";});
      back.disabled=k===0&&t===0; next.textContent=(k===steps.length-1&&t>=1)?"Done":"Next";
    }
    function play(i){
      if(raf)cancelAnimationFrame(raf);
      k=i; if(reduce){t=1;render();return;}
      var t0=performance.now(),D=steps[i].dur||1000;
      (function tick(now){t=Math.min(1,(now-t0)/D);render();if(t<1)raf=requestAnimationFrame(tick);})(t0);
    }
    next.addEventListener("click",function(){ if(t<1){t=1;if(raf)cancelAnimationFrame(raf);render();return;} if(k<steps.length-1)play(k+1); });
    back.addEventListener("click",function(){ if(raf)cancelAnimationFrame(raf); if(k>0){k--;t=1;}else{t=0;} render(); });
    replay.addEventListener("click",function(){
      if(raf)cancelAnimationFrame(raf); var i=0;
      (function chain(){play(i);var D=reduce?0:(steps[i].dur||1000);setTimeout(function(){i++;if(i<steps.length)chain();},D+350);})();
    });
    document.addEventListener("themechange",render);
    render(); // opens finished, so the whole diagram is visible at rest
    return {goTo:function(i){k=i;t=1;render();}};
  }
  global.Scene={create:create};
})(window);

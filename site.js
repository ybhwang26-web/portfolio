/* Site-wide: light/dark toggle (remembered in this browser only). */
(function(){
  var root=document.documentElement, KEY="theme";
  try{var s=localStorage.getItem(KEY); if(s==="light"||s==="dark") root.setAttribute("data-theme",s);}catch(e){}
  function current(){
    var t=root.getAttribute("data-theme");
    if(t) return t;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  function label(btn){btn.textContent = current()==="dark" ? "Light mode" : "Dark mode";}
  document.addEventListener("DOMContentLoaded",function(){
    document.querySelectorAll(".theme-btn").forEach(function(btn){
      label(btn);
      btn.addEventListener("click",function(){
        var next = current()==="dark" ? "light" : "dark";
        root.setAttribute("data-theme",next);
        try{localStorage.setItem(KEY,next);}catch(e){}
        document.querySelectorAll(".theme-btn").forEach(label);
        document.dispatchEvent(new CustomEvent("themechange"));
      });
    });
    var y=document.getElementById("year"); if(y) y.textContent=new Date().getFullYear();
  });
})();

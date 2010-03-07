// ==UserScript==
// @name           hate.d-linkchecker
// @namespace      hated
// @description    Censors links to hate.d sites
// @include        *
// ==/UserScript==

function addGlobalStyle(css) {
  var head, style;
  head = document.getElementsByTagName('head')[0];
  if (!head) { return; }
  style = document.createElement('style');
  style.type = 'text/css';
  style.innerHTML = css;
  head.appendChild(style);
}

function checkLink(link) {
  GM_xmlhttpRequest({
    method: 'GET',
    url: "http://hate.d:8000/" + encodeURI(link.href),
    onload: function(res) {
      if (res.responseText != "0") {
        link.className += " blackened";
        link.href = "http://hate.d:8000/STOP/" + encodeURI(link.href);
      }
    }
  });
}

addGlobalStyle("body a.blackened,body a:hover.blackened { color:#000 !IMPORTANT; background-color:#000 !IMPORTANT; } ")
for (var i=0; i<document.links.length; i++) {
  checkLink(document.links[i]);
}
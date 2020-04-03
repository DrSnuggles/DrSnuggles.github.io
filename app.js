/* DrSnuggles' Github Page based on Evoke19 demo

*/

"use strict";

var app = (function (){
  //
  // vars
  //
  var my = {}; // return object
  var data;    // party entries
  var CDNs = { // this and other function like addScript should be moved into utils object
    'enable': false,                    // use CDNs
    'enableCOM': true,                 // shall we use CDNs for COM, false = locale/home hosted
    'useMIN': false,                    // use minimized .js resources
    'global': '//cdn.jsdelivr.net/gh/', // global CDN provider used
    'home': 'DrSnuggles/DrSnuggles.github.io/',      // home of this repo
  };

  //
  // set browser behaviour
  //
  document.oncontextmenu = function(){return false;};

  //
  // load libs
  //
  //
  // ToDo: replace with SnuPlayer (in dev)
  loadScript(CDN('com/DrSnuggles/Decruncher@ldr/ldr.js'), function() {
    applyStyle('amiga', function() {
      LDR.loadHead('script', CDN('com/DrSnuggles/jsGoniometer/goniometer.js'), function(dat) {

        // set this colors, would be nicer/more general to use style information here
        Goniometer.bgColor = [];
        Goniometer.bgLineColor = [0, 0, 34, 0.5];
        Goniometer.scopeColor = [255, 136, 0, 1];

        LDR.loadHead('script', CDN('com/wothke/webaudio-player/scriptprocessor_player.js'), function(dat) {
          LDR.loadHead('script', CDN('com/wothke/webMPT/emscripten/htdocs/backend_mpt.js'), function(dat) {
            LDR.loadURL(CDN('content.json'), function(dat) {
              data = JSON.parse(dat);
              showContent(data);
              // needed for browser policies
              addEventListener("keydown", resumeFunc);
              addEventListener("click", resumeFunc);
              addEventListener("touchstart", resumeFunc);
              playNextTrack();
              // done here start renderer
              requestAnimationFrame(renderer);

            }, 'text');
          }, 'text');
        }, 'text');
      }, 'text');
    });
  });

  //
  // private functions
  //
  function showContent(data) {
    var html = [];
    for (var i in data) {
      html.push("<div>");
        html.push("<h2>");
          html.push(data[i].date +" "+ data[i].title);
        html.push("</h2>");
        html.push(data[i].content);
      html.push("</div>")
    }
    textbox.innerHTML = html.join("");
  }
  function playNextTrack() {
    LDR.loadURL('https://script.google.com/macros/s/AKfycbzL1LWzWGTXrB5DlcApEG3CUDnO9IhQHyrPk_xmOLbWIbFI3Kib/exec?archive=modland', function(song) {
      try {
        Goniometer.stop();
        if (typeof window.player !== 'undefined') ScriptNodePlayer.getInstance().pause();
      } catch(e) {}

      trackTitle.innerText = song.substr(song.lastIndexOf("/")+1);
      song = "//modland.com/pub/modules/" + song;
      ScriptNodePlayer.createInstance(new MPTBackendAdapter(), "", [], false, function(){}, function(){}, playNextTrack); // backendAdapter, basePath, requiredFiles, enableSpectrum, onPlayerReady, onTrackReadyToPlay, onTrackEnd, doOnUpdate, externalTicker
      ScriptNodePlayer.getInstance().loadMusicFromURL(song, {}, function(){}, function(){playNextTrack()}, function(){}); // url, options, onCompletion, onFail, onProgress
      Goniometer.start(ScriptNodePlayer.getInstance()._gainNode, goniometercanvas);
    },'');
  }
  function resumeFunc() {
    try {
      var ctx = ScriptNodePlayer.getInstance()._bufferSource.context;
      if (ctx.state !== 'running') ctx.resume();
    } catch(e){}
  }
  function renderer() {
    requestAnimationFrame(renderer);
    //
    // Player
    //
    try {
      if (typeof window.player !== "undefined") {
        // display time
        if (!player.isPaused()) {
          position.innerHTML = "<b>Pos:</b> " +formatTime( player.getCurrentPlaytime() );// + " [ " + player.getPlaybackPosition() +" / "+ player.getMaxPlaybackPosition() +" ]";
          // Songinfos
          var html = [];
          html.push("<b>Title:</b> "+ player._songInfo.title +"<br/>");
          html.push("<b>Artist:</b> "+ player._songInfo.artist +"<br/>");
          html.push("<b>Type:</b> "+ player._songInfo.type +"<br/>");
          html.push("<b>Tracker:</b> "+ player._songInfo.tracker +"<br/>");
          html.push("<b>Info:</b> ");
          var msgs = player._songInfo.msg.split("\n");
          for (var i = 0; i < msgs.length; i++) {
            html.push(msgs[i] +"<br/>");
          }
          msg.innerHTML = html.join("");
        }
      }
    } catch(e){}

    //
    // Screenbar
    //
    // display memory
    try {
      memory.innerText = formatBytes(performance.memory.usedJSHeapSize) +' / '+ formatBytes(performance.memory.totalJSHeapSize) +' / '+ formatBytes(performance.memory.jsHeapSizeLimit);
    } catch(e){}

    // display time (not amiga style but i like it)
    try {
      var now = new Date();
      now = now.toLocaleTimeString();
      clock.innerText = now;
    } catch(e){}

    // resizers. yeah called them to often but eventHandler just fired on own will
    //resizePicView();
    resizeTxtView();
  };

  //
  // private helper functions
  //
  function CDN(s) {
    var ret = s;
    if (CDNs.enable) {
      ret = CDNs.global;

      if (s.substr(s.length-3, 3) === '.js' && CDNs.useMIN) {
        s = s.substr(0, s.length-3) + ".min.js";
      }

      if (s.indexOf("com/") !== -1 && s.indexOf("com/DrSnuggles/") === -1 && CDNs.enableCOM) {
        ret += s.substr(4);
      } else {
        ret += CDNs.home + s;
      }


    }
    return ret;
  }
  function loadScript(src, cb) { // loadScript (often one of my first functions i call)
    var script = document.createElement("script");
    script.onload = function() {
      if (cb) cb();
    };
    script.src = src;
    document.head.appendChild(script);
  }
  function applyStyle(style, cb) {
    // load CSS
    LDR.loadHead('style', CDN('style/'+ style +'/style.css'), function(dat) {
      LDR.loadURL(CDN('style/'+ style +'/layout.html'), function(dat) {
        document.body.innerHTML += dat;

        // keyboard handler
        window.onkeydown = function(e) {
          switch (e.key) {
            case 'PageUp':
              playNextTrack(1);
              break;
            case 'PageDown':
              playNextTrack(-1);
              break;
            default:
          }
        }

        // make screens & windows moveable
        var tmp = document.querySelectorAll('.screenbar, .titlebar');
        [].forEach.call(tmp, function(i) {
          i.ondragstart = function(e) {
            e.dataTransfer.setDragImage(new Image(), 0, 0); // hide ghost image
          };
          i.ondrag = function(e) {
            if (e.y !== 0) {
              e.srcElement.parentElement.style.top = e.y + 20 +'px'; // set new position
              if (e.srcElement.classList.contains("titlebar")) {
                e.srcElement.parentElement.style.left = e.x +'px'; // set new position
              }
            }
          };
        });
        //document.body.setAttribute("contenteditable", true); // for playing around
        // exit
        if (cb) cb();
      }, 'text');
    }, 'text');
  }
  function formatBytes(bytes) {
    // b, kB, MB, GB
    var kilobytes = bytes/1024;
    var megabytes = kilobytes/1024;
    var gigabytes = megabytes/1024;
    if (gigabytes>1) return gigabytes.toFixed(2) +' GB';
    if (megabytes>1) return megabytes.toFixed(2) +' MB';
    if (kilobytes>1) return kilobytes.toFixed(2) +' kB';
    return bytes +' b';
  }
  function formatTime(s) {
    var m = Math.floor(s/60);
    var ss = Math.floor(s-m*60);
    if (ss<10) ss = "0"+ ss;
    return m+":"+ss;
  }
  function getExt(fn) {
    return fn.substr(fn.lastIndexOf(".")+1).toLowerCase();
  }
  function resizePicView() {
    PicView.style.height = picture.height+40 +'px';
  }
  function resizeTxtView() {
    if (textbox.childNodes[0]) {
      Textbox.style.height = textbox.childNodes[0].height+ 20+20 +'px';
      Textbox.style.width = textbox.childNodes[0].width+ 20 +'px';
    }
  }

  //
  // public functions
  //
  my.playNextTrack = function() {playNextTrack();}
  my.playPrevTrack = function() {playNextTrack(-1);}
  my.showNextPic = function() {showNextPic();}
  my.showPrevPic = function() {showNextPic(-1);}
  my.showNextTxt = function() {showNextTxt();}
  my.showPrevTxt = function() {showNextTxt(-1);}

  //
  // Exit
  //
  return my;

})();

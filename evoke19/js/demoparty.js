/* Demo party player by DrSnuggles 2019

*/

"use strict";

var demoparty = (function (){
  //
  // vars
  //
  var my = {}; // return object
  var data;    // party entries
  var audio;
  var currentTrack = -1;
  var currentPic = -1;
  var currentTxt = -1;
  var CDNs = { // this and other function like addScript should be moved into utils object
    'enable': false,                    // use CDNs
    'enableCOM': false,                 // shall we use CDNs for COM, false = locale/home hosted
    'useMIN': false,                    // use minimized .js resources
    'global': '//cdn.jsdelivr.net/gh/', // global CDN provider used
    'home': 'DrSnuggles/Evoke19/',      // home of this repo
  };

  //
  // set browser behaviour
  //
  document.oncontextmenu = function(){return false;};

  //
  // load libs
  //
  loadScript(CDN('com/DrSnuggles/Decruncher@ldr/ldr.js'), function() {
    applyStyle('amiga', function() {
      LDR.loadURL(CDN('com/DrSnuggles/jsGoniometer/goniometer.js'), function(dat) {
        addHead('script', dat);
        // set this colors, would be nicer/more general to use style information here
        Goniometer.bgColor = [];
        Goniometer.bgLineColor = [0, 0, 34, 0.5];
        Goniometer.scopeColor = [255, 136, 0, 1];

        LDR.loadURL(CDN('com/wothke/webaudio-player/scriptprocessor_player.js'), function(dat) {
          addHead('script', dat);

          LDR.loadURL(CDN('com/wothke/webMPT/emscripten/htdocs/backend_mpt.js'), function(dat) {
            addHead('script', dat);

            LDR.loadURL(CDN('data/data.json'), function(dat) {
              data = JSON.parse(dat);
              playNextTrack();

              LDR.loadURL(CDN('com/ansilove/ansilove.js/ansilove.js'), function(dat) {
                addHead('script', dat);

                // show results
                LDR.loadURL(CDN('data/results.txt'), function(dat) {
                  resultsbox.innerText = dat;
                  showNextPic();
                  showNextTxt();
                  // done here start renderer
                  requestAnimationFrame(renderer);
                }, 'text');

              }, 'text');
            }, 'text');
          }, 'text');
        }, 'text');
      }, 'text');
    });
  });

  //
  // private functions
  //
  function playNextTrack(i) {
    if (i === undefined || typeof i === 'object' ) i = 1;
    currentTrack += i;
    if (currentTrack < 0) currentTrack = data.a.tracked.length+data.a.streams.length-1;
    if (currentTrack >= data.a.tracked.length+data.a.streams.length) currentTrack = 0;

    try {
      Goniometer.stop();
      if (typeof window.player !== 'undefined') ScriptNodePlayer.getInstance().pause();
      audio.pause();
      audio.removeEventListener("ended", playNextTrack);
      audio.delete();
    } catch(e) {}

    var song = 'data/a/';
    if (currentTrack < data.a.tracked.length) {
      song += 'tracked/'+data.a.tracked[currentTrack];
    } else {
      song += 'streams/'+data.a.streams[currentTrack-data.a.tracked.length];
    }
    trackTitle.innerText = song.substr(song.lastIndexOf("/")+1);
    //title.innerText = song.substr(song.lastIndexOf("/")+1);
    // mp3/ogg || tracker
    var ext = getExt(song);
    song = CDN(song);
    if (ext === "mp3" || ext === "ogg" || ext === "aac" || ext === "wav" || ext === "flac") {
      audio = new Audio(song);
      audio.play();
      audio.addEventListener("ended", playNextTrack);
      Goniometer.start(audio, goniometercanvas);
    } else {
      ScriptNodePlayer.createInstance(new MPTBackendAdapter(), "", [], false, function(){}, function(){}, playNextTrack); // backendAdapter, basePath, requiredFiles, enableSpectrum, onPlayerReady, onTrackReadyToPlay, onTrackEnd, doOnUpdate, externalTicker
      ScriptNodePlayer.getInstance().loadMusicFromURL(song, {}, function(){}, function(){}, function(){}); // url, options, onCompletion, onFail, onProgress
      Goniometer.start(ScriptNodePlayer.getInstance()._gainNode, goniometercanvas);
    }
  }
  function showNextPic(i) {
    if (i === undefined) i = 1;
    currentPic += i;
    if (currentPic < 0) currentPic = data.v.freestyle.length + data.v.pixel.length-1;
    if (currentPic >= data.v.freestyle.length + data.v.pixel.length) currentPic = 0;
    var fn = '';
    if (currentPic < data.v.freestyle.length) {
      fn = 'freestyle/'+data.v.freestyle[currentPic];
    } else {
      fn = 'pixel/'+data.v.pixel[currentPic-data.v.freestyle.length];
    }
    picture.src = CDN('data/v/'+ fn);
    picName.innerText = fn;
  }
  function showNextTxt(i) {
    if (i === undefined) i = 1;
    currentTxt += i;
    if (currentTxt < 0) currentTxt = data.v.ansi_amiga.length + data.v.ansi_pc.length-1;
    if (currentTxt >= data.v.ansi_amiga.length + data.v.ansi_pc.length) currentTxt = 0;
    var fn = '';
    if (currentTxt < data.v.ansi_amiga.length) {
      fn += 'amiga/'+data.v.ansi_amiga[currentTxt];
    } else {
      fn += 'pc/'+data.v.ansi_pc[currentTxt-data.v.ansi_amiga.length];
    }
    txtTitle.innerText = fn;
    textbox.innerText = '';
    fn = CDN('data/v/ansi_' +fn);
    if (getExt(fn) !== "ans") {
      // ASCII / TXT
      LDR.loadURL(fn, function(dat) {
        // here we only have txt,asc in amiga compo, none in PC section
        var decoder = new TextDecoder("iso-8859-1");
        textbox.innerText = decoder.decode(dat);
      }, 'arraybuffer');
    } else {
      if (fn.indexOf("/ansi_pc/") !== -1) {
        // ANSI
        AnsiLove.splitRender(fn, function (canvases, sauce) {
          canvases.forEach(function (canvas) {
            canvas.style.verticalAlign = "bottom"; // For perfect, gap-less viewing.
            textbox.appendChild(canvas);
          });
          //console.log(sauce);
        }, 27, {"bits": "8"});
      } else {
        AnsiLove.splitRender(fn, function (canvases, sauce) {
          canvases.forEach(function (canvas) {
            canvas.style.verticalAlign = "bottom"; // For perfect, gap-less viewing.
            textbox.appendChild(canvas);
          });
          //console.log(sauce);
        }, 27, {"bits": "9", "mode": "workbench", "font": "topaz"});
      }

    }
  }
  function renderer() {
    requestAnimationFrame(renderer);
    // display time
    try {
      if (!audio.paused) {
        position.innerText = formatTime(audio.currentTime) + " / " + formatTime(audio.duration);
      }
    } catch(e){}

    try {
      if (window.player) {
        if (!ScriptNodePlayer.getInstance().isPaused()) {
          position.innerText = formatTime( ScriptNodePlayer.getInstance().getCurrentPlaytime() ) + " [ " + ScriptNodePlayer.getInstance().getPlaybackPosition() +" / "+ ScriptNodePlayer.getInstance().getMaxPlaybackPosition() +" ]";
        }

      }
    } catch(e){}

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
    resizePicView();
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
  function addHead(tag, txt, cb) { // maybe move to LDR ??
    var tmp = document.createElement(tag);
    tmp.type = (tag==='script')? 'text/javascript':'text/css';
    //tmp.text = txt; // works for script only
    tmp.appendChild(document.createTextNode(txt)); // works for script and style
    document.head.appendChild(tmp);
    if (cb) cb();
  }
  function applyStyle(style, cb) {
    // load CSS
    LDR.loadURL(CDN('style/'+ style +'/style.css'), function(dat) {
      addHead('style', dat, function() {
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
      });
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

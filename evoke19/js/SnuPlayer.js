/* SnuPlay by DrSnuggles 2019

  Simple player for audio
  uses HTML5 Audio for mp3,aac,ogg,wav,flac (no fallbacks supported only native)
  uses libopenmpt for all the rest (maybe i will add others later)

  constructor but with chiptune2

*/

"use strict";

function SnuPlayer(data) {
  //
  // vars
  //
  var audio; // for mp3,aac,ogg,wav,flac
  var current = -1;

  //
  // Functions
  //
  function play(i) {
    if (i === undefined || typeof i === 'object' ) i = 1;
    current += i;
    if (current < 0) current = data.length-1;
    if (current >= data.length) current = 0;
    return playURL(data[current]);
  }
  function playURL(url) {
    console.log("SnuPlayer.playURL", url);

    // stop old
    try {
      if (typeof window.player !== 'undefined') ScriptNodePlayer.getInstance().pause();
      audio.pause();
      audio.removeEventListener("ended", play);
      audio.delete();
    } catch(e) {}

    // play next
    switch (getExt(url)) {
      case 'mp3':
      case 'ogg':
      case 'acc':
      case 'wav':
      case 'flac':
        audio = new Audio(url);
        audio.play();
        audio.addEventListener("ended", play);
        // exit
        return audio;
        break;
      default:
        ScriptNodePlayer.createInstance(new MPTBackendAdapter(), "", [], false, function(){}, function(){}, play); // backendAdapter, basePath, requiredFiles, enableSpectrum, onPlayerReady, onTrackReadyToPlay, onTrackEnd, doOnUpdate, externalTicker
        ScriptNodePlayer.getInstance().loadMusicFromURL(url, {}, function(){}, function(){}, function(){}); // url, options, onCompletion, onFail, onProgress
        // exit
        return ScriptNodePlayer.getInstance()._gainNode;
    }
  }
  this.play = function(i) { play(i); }
  this.playURL = function(url) { playURL(url); }

  //
  // Private Helpers
  //
  function loadScript(src, cb) { // loadScript (often one of my first functions i call)
    var script = document.createElement("script");
    script.onload = function() {
      if(cb) cb();
    };
    script.src = src;
    document.head.appendChild(script);
  }
  function getExt(fn) {
    return fn.substr(fn.lastIndexOf(".")+1).toLowerCase();
  }

  //
  // load libs
  //
  loadScript('./com/chiptune2.js', function() {
    loadScript('./com/libopenmpt/bin/wasm/libopenmpt.js', function() {
      console.info("SnuPlayer instanciated");
      play();
    });
  });

}

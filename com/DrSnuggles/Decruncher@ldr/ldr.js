/*  LDR (LoadDecrunchRun or Loader) by DrSnuggles
  LDR is the successor of Decrunch.js
  After visualizing decrunching process i also want to show the loading process
  640x512 = 327680 Pixel. Each needs 3 Bytes for color = 983040Bytes = 960kB = 0.9375MB per screen

History:
0.4 added LoadHead function
0.3 jsZIP returns Arraybuffer, needed for scriptprocessor_player input, stopRenderer kills one item (multiple parallel load)
0.2 Evoke2019 result demo update (needed blob, arraybuffer for other libs)
0.1 initial release
*/

"use strict";

var LDR = (function() {
  //
  // Init
  //
  var my = {            // holds all public available functions/properties
    version : "0.4",    // version
    packer : "jszip",   // used depacking library
    visualOutput : true,// enable/disable the whole point of this lib, never set it to false !!! ;)
    lines : 256,        // 256 amiga lines
    background : true,  // background or foreground
    fullscreen : false,  // fullscreen or border only
  },
  debug = false,        // duration times will still be displayed in console
  raf,                  // requestAnimationFrame, needed for cancel
  ctx,                  // canvas 2d context so i do not need to get this every frame
  loadedPackers = [],   // already loaded packers, do not load them twice
  packers = {           // CDN resources for the supported packers
    "jszip" : "//cdn.jsdelivr.net/gh/Stuk/jszip/dist/jszip.min.js",
    "jszip_internalservererror" : "//gitcdn.xyz/repo/Stuk/jszip/master/dist/jszip.min.js",
    "zipjs" : "packers/zip.js/zip.js",
    "jsx" : "//gitcdn.xyz/repo/jsxgraph/jsxgraph/master/JSXCompressor/jsxcompressor.min.js",
    "pako" : "//gitcdn.xyz/repo/nodeca/pako/master/dist/pako_inflate.min.js",
    "lh4" : "//gitcdn.xyz/repo/erlandranvinge/lh4.js/master/lh4.js",
  },
  packedData,           // Uint8Array of packed data, used to get line colors
  currentPos,           // position in ^^ for next frame
  currentX,             // current x position for loader
  currentY,             // current x position for loader
  overflow,             // counter how often an modulo has to be done
  CDN = "//cdn.jsdelivr.net/gh/DrSnuggles/Decruncher/";
  CDN = "";             // use local version

  //
  // Private
  //
  function log(t) {
    // log to console only when debug=true
    if (debug) console.log(t);
  };
  function startCopperbars(background, fullscreen, lines) {
    var canvas = document.createElement('canvas');
    canvas.id = 'copperbars';
    var zIndex = background ? -604 : 604;
    canvas.style = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:'+ zIndex +';';
    canvas.height = lines;
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
    currentPos = 0;
    raf = requestAnimationFrame(function(){renderCopperbars(fullscreen, lines)});
  };
  function stopCopperbars() {
    document.body.removeChild(copperbars);
    cancelAnimationFrame(raf);
  };
  function renderCopperbars(fullscreen, lines) {
    log("renderCopperbars: "+ currentPos);
    for (var y = 0; (y < lines && currentPos+y+2 < packedData.length) ; y++) {
      ctx.beginPath();
      ctx.strokeStyle = "rgb("+ packedData[currentPos] +", "+ packedData[currentPos+1] +", "+ packedData[currentPos+2] +")";
      if (fullscreen || y < lines*0.05 || y > lines*0.95){
        ctx.moveTo(0, y);
        ctx.lineTo(300, y);
      } else {
        ctx.moveTo(0, y);
        ctx.lineTo(10, y);
        ctx.moveTo(290, y);
        ctx.lineTo(300, y);
      }
      currentPos += 3;
      ctx.stroke();
    }
    // and again...
    raf = requestAnimationFrame(function(){renderCopperbars(fullscreen, lines)});
  };
  function startRenderer(background, fullscreen, lines, part) {
    var canvas = document.createElement('canvas');
    canvas.id = 'ldrcanvas';
    var zIndex = background ? -604 : 604;
    canvas.style = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:'+ zIndex +';';
    canvas.width = 640;
    canvas.height = 512;
    /* too early no info yet
    if (part.total !== 0) {
      var tmp = Math.sqrt(part.total/3);
      log("make use of total size to adjust canvas dimensions: " + tmp +" x "+ tmp);
      canvas.width = canvas.height = tmp;
    }
    */
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
    currentX = currentY = currentPos = overflow = 0;
    raf = requestAnimationFrame(function(){renderRenderer(canvas.width, canvas.height, part)});
  };
  function stopRenderer() {
    var rem = document.getElementById("ldrcanvas"); //0.3 workaround when more than one ldrcanvas gets created
    document.body.removeChild(rem);
    cancelAnimationFrame(raf);
  };
  function renderRenderer(width, height, part) {
    log("renderRenderer: "+ currentPos);
    //console.log(part);
    /* idea:
      when at the end the whole file is displayed it should fill the screen
      i want it like former tape loading of screens
      lines with byte height, line by line like interlaced png
      640 width x 512 height x 3bytes color = 960kB

      (newLength - currentPos) IS NOT (newData.length/3)

      currentPos = oldLength
    */
    if (part.responseType === '' || part.responseType === 'text') { // blobs do not have that...
      var newLength = part.responseText.length;
      if (newLength !== currentPos) {
        //console.log("i will paint coz currentpos: "+currentPos+" !== "+ newLength);
        var newData = part.responseText.substr(currentPos, newLength-currentPos);
        newData = bin2ab(newData);
        //log("received bytes: "+ (newLength - currentPos));
        //log("received bytes: "+ (newData.length));
        for (var i = 0; i < newData.length; i+=3) {
          //ctx.beginPath();
          ctx.fillStyle = "rgb("+ newData[i] +", "+ newData[i+1] +", "+ newData[i+2] +")";
          ctx.fillRect(currentX, currentY, 1, 1);
          //ctx.stroke();
          currentX++;
          if (currentX >= width) {
            // go 8 pixels deeper, like interlace
            currentX = 0;
            currentY += 8;
          }
          if (currentY >= height) {
            currentY = currentY % height + 1;
            overflow++; // stop after 8 times do not overwrite old data. makes it faster
          }
        }
        currentPos = newLength; // i don't care if i will lose data here. maybe array is not divable by 3
      }
    }
    // and again...
    if (overflow < 8) { // do not render rest.. makes it slower
      raf = requestAnimationFrame(function(){renderRenderer(width, height, part)});
    }
  };
  function loadHead(tag, url, cb) {
    xhr(url, function(txt) {
      addHead(tag, txt, cb);
    }, 'text');
  };
  function addHead(tag, txt, cb) {
    var tmp = document.createElement(tag);
    tmp.type = (tag==='script')? 'text/javascript':'text/css';
    //tmp.text = txt; // works for script only
    tmp.appendChild(document.createTextNode(txt)); // works for script and style
    document.head.appendChild(tmp);
    if (cb) cb();
  };
  function xhr(src, cb, responseType) {
    // knows special responseType="binary"
    console.time("XHR load ("+responseType+") "+src);
    var xhr = new XMLHttpRequest();
    startRenderer(my.background, my.fullscreen, my.lines, xhr);
    xhr.open("GET", src, true);
    if (responseType === "binary") {
      xhr.overrideMimeType('text/plain; charset=x-user-defined');
    } else {
      xhr.responseType = responseType;
    }
    xhr.onreadystatechange = function() {
      if (this.readyState == 4 && this.status == 200) {
        console.timeEnd("XHR load ("+responseType+") "+src);
        stopRenderer();
        if (responseType === "" || responseType === "text" || responseType === "binary") {
          //log(this.responseText);
          cb(this.responseText);
        } else {
          //log(this.response);
          cb(this.response);
        }
      }
    };
    //could call render process but i want to use raf
    /*
    xhr.onprogress = function(e) {
      log("xhr.onprogress");
      //raf = requestAnimationFrame(function(){renderRenderer(640, 512, e.target)});
      if (e.lengthComputable) {
        //var percentage = Math.round((e.loaded/e.total)*100);
        //ldrcanvas.width = ldrcanvas.height = Math.ceil(Math.sqrt(e.total/3));
        //console.log(ldrcanvas.width);
        //log("percent " + percentage + '%' );
      } else {
        //log("not computable");
      }
    };
    */
    xhr.send();
  };
  function checkPacker(packer, cb) {
    // check if we need to load the lib
    if (!loadedPackers.includes(packer)) {
      xhr(CDN+packers[packer], function(txt) {
        addHead('script', txt, function() {
          log("checkPacker had to load: "+ packer);
          loadedPackers.push(packer);
          if (cb) return cb();
        });
      }, 'text');
    } else {
      // already loaded
      if (cb) return cb();
    }
  };
  function dePacker(url, packer, background, fullscreen, lines, cb) {
    switch (packer){
      case "zipjs":
      zip.workerScriptsPath = document.location.href + "packers/zip.js/";
      // use a BlobReader to read the zip from a Blob object
      xhr(url, function(data){
        if (my.visualOutput) {
          packedData = new Uint8Array(data);
        }
        // convert Uint8Array to Blob
        var blob = Uint82Blob(data);
        zip.createReader(new zip.BlobReader(blob), function(reader) {

          // get all entries from the zip
          reader.getEntries(function(entries) {
            if (entries.length) {

              console.time("Decrunch single file");
              if (my.visualOutput) {
                startCopperbars(background, fullscreen, lines);
              }

              // get first entry content as text
              entries[0].getData(new zip.TextWriter(), function(text) {
                // text contains the entry data as a String
                console.timeEnd("Decrunch single file");
                if (my.visualOutput) {
                  stopCopperbars();
                }
                if (cb) cb(text);

                // close the zip reader
                reader.close(function() {
                  // onclose callback
                });

              }, function(current, total) {
                // onprogress callback
              });
            }
          });
        }, function(error) {
          // onerror callback
        });
      }, "arraybuffer");
      break;
      case "jszip":
        xhr(url, function(data){
          if (my.visualOutput) {
            packedData = bin2ab(data);
          }
          JSZip.loadAsync(data).then(function (d) {
            for (var i in d.files) {
              //if (i === "allmods.txt") {

                console.time("Decrunch single file");
                if (my.visualOutput) {
                  startCopperbars(background, fullscreen, lines);
                }
                // now using ArrayBuffer as return
                d.files[i].async("ArrayBuffer").then(function (txt){

                  console.timeEnd("Decrunch single file");
                  if (my.visualOutput) {
                    stopCopperbars();
                  }

                  if (cb) cb(txt);

                }, function (err){
                  console.error("err:",err);
                });
                break;
              //} // if allmods.txt
              break; // just the first file
            } // for files in zip

          });
        }, "binary");
        break;
      case "pako":
        // no file management here. just for gzipped strings
        xhr(url, function(data){
          data = new Uint8Array(data);
          ret = pako.inflate(data);
        }, "blob");
        break;
      case "jsx":
        // no file management here. just for gzipped strings
        xhr(url, function(data){
          ret = JXG.decompress(btoa(data));
        }, "arraybuffer");
        break;
      case "lh4":
        break;
      default:
    }
  };
  // copy of dePacker, could save some bytes if i call this from above
  function dePackerData(data, packer, background, fullscreen, lines, cb) {
    switch (packer){
      case "zipjs": // wants arraybuffer
      zip.workerScriptsPath = document.location.href + "packers/zip.js/";
      // use a BlobReader to read the zip from a Blob object
      if (my.visualOutput) {
        packedData = new Uint8Array(data);
      }
      // convert Uint8Array to Blob
      var blob = Uint82Blob(data);
      zip.createReader(new zip.BlobReader(blob), function(reader) {

        // get all entries from the zip
        reader.getEntries(function(entries) {
          if (entries.length) {

            console.time("Decrunch single file");
            if (my.visualOutput) {
              startCopperbars(background, fullscreen, lines);
            }

            // get first entry content as text
            entries[0].getData(new zip.TextWriter(), function(text) {
              // text contains the entry data as a String
              console.timeEnd("Decrunch single file");
              if (my.visualOutput) {
                stopCopperbars();
              }
              if (cb) cb(text);

              // close the zip reader
              reader.close(function() {
                // onclose callback
              });

            }, function(current, total) {
              // onprogress callback
            });
          }
        });
      }, function(error) {
        // onerror callback
      });
      break;
      case "jszip": // wants binary
        if (my.visualOutput) {
          packedData = bin2ab(data);
        }
        JSZip.loadAsync(data).then(function (d) {
          for (var i in d.files) {
            //if (i === "allmods.txt") {

              console.time("Decrunch single file");
              if (my.visualOutput) {
                startCopperbars(background, fullscreen, lines);
              }
              // now using ArrayBuffer as return
              d.files[i].async("ArrayBuffer").then(function (txt){

                console.timeEnd("Decrunch single file");
                if (my.visualOutput) {
                  stopCopperbars();
                }

                if (cb) cb(txt);

              }, function (err){
                console.error("err:",err);
              });
              break;
            //} // if allmods.txt
            break; // just the first file
          } // for files in zip

        });

        break;
      case "pako": // wants blob
        // no file management here. just for gzipped strings
        data = new Uint8Array(data);
        ret = pako.inflate(data);
        break;
      case "jsx": // wants arraybuffer
        // no file management here. just for gzipped strings
        ret = JXG.decompress(btoa(data));
        break;
      case "lh4":
        break;
      default:
    }
  };
  //
  // Converter helpers
  //
  function Uint82Blob(data) {
    return new Blob([new Uint8Array(data)]);
  };
  function bin2ab(data) {
    var enc = new TextEncoder();  // always utf-8
    return enc.encode(data);
  };

  //
  // Public
  //
  my.depackURL = function (url, cb) {
    // get defaults from object
    var packer = this.packer;
    var background = this.background;
    var fullscreen = this.fullscreen;
    var lines = this.lines;
    log("depackURL ("+ packer +"): "+ url);
    // overwrite with arguments for single use
    if (arguments[2] !== undefined) packer = arguments[2];
    if (arguments[3] !== undefined) background = arguments[3];
    if (arguments[4] !== undefined) fullscreen = arguments[4];
    if (arguments[5] !== undefined) lines = arguments[5];
    checkPacker(packer, function(){
      dePacker(url, packer, background, fullscreen, lines, cb);
    });
  };
  my.depackData = function (data, cb) {
    // get defaults from object
    var packer = this.packer;
    var background = this.background;
    var fullscreen = this.fullscreen;
    var lines = this.lines;
    log("depackData ("+ packer +"): "+ data);
    // overwrite with arguments for single use
    if (arguments[2] !== undefined) packer = arguments[2];
    if (arguments[3] !== undefined) background = arguments[3];
    if (arguments[4] !== undefined) fullscreen = arguments[4];
    if (arguments[5] !== undefined) lines = arguments[5];
    checkPacker(packer, function(){
      dePackerData(data, packer, background, fullscreen, lines, cb);
    });
  }
  my.loadURL = function (url, cb, responseType) {
    log("loadURL ("+ responseType +"): "+ url);
    xhr(url, cb, responseType);
  };
  my.loadHead = loadHead;

  //
  // Exit
  //
  return my;
})();

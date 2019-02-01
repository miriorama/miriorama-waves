/* globals d3, chroma */

var UTIL = (function() {
  let util = {};

  util.select = function(selector) {
    let ret = document.querySelectorAll(selector);

    if (ret.length == 1) {
      ret = ret[0];
    }

    return ret;
  }

  util.rnd = function (min, max) {
    return Math.random() * (max - min) + min;
  }

  return util;
})();

var MIRIO = (function(){
  let mirio = {}; 
  let svg = d3.select('svg');
  let el = document.getElementById('svg');
  
  let settings = {
    width: 70,
    height: 100,
    totx: 5,
    toty: 15,
    waveDimension: 100,
    waveDiffMax: 50,
    colorContrast: 2
  } 

  var areaFunction = d3.area()
    .x(function(d) { return d.x; })
    .y1(function(d) { return d.y; })
    .curve(d3.curveBasis).y0(settings.height);
  
  /* INIT */ 
  mirio.init = function () {
    if (!UTIL.select('#chkColor1').checked) {
      settings.color1 = chroma.random();
    } else {
      settings.color1 = chroma(UTIL.select('#color1').value);
    }
    if (!UTIL.select('#chkColor2').checked) {
      settings.color2 = chroma.random();
    } else {
      settings.color2 = chroma(UTIL.select('#color2').value);
    }
    if (!UTIL.select('#chkLine1').checked) {
      settings.line1 = mirio.getPath(false);
    } else {
      settings.line1 = UTIL.select('#line1').value.split(',');
    }
    if (!UTIL.select('#chkLine2').checked) {
      settings.line2 = mirio.getPath(true);
    }
    var lines = mirio.getLines();
    
    var els = svg.selectAll('path').data(lines).enter().append('path');    

    els.attr('d', function(d, i) { return areaFunction(d);});  
    els.attr('fill', function(d, i) { return d[0].fill; });
    els.attr('stroke', function(d, i) { return d[0].stroke; });
    els.style('opacity', function(d, i) { return d[0].opacity; });
    
    mirio.updateFields();
    //window.setInterval(function(){ MIRIO.transition();}, 4000);
  }

  mirio.readFields = function() {

  }

  mirio.updateFields = function() {
    document.getElementById('color1').value = settings.color1;
    document.getElementById('color2').value = settings.color2;
    
    document.getElementById('line1').value = settings.line1.toString();
    document.getElementById('line2').value = settings.line2.toString();
  }
  
  /* TRANSITION */
  mirio.transition = function () {
    mirio.init();

    var lines = mirio.getLines();      
    var t = d3.transition().duration(2000).ease(d3.easeSin);
    //.on("end", MIRIO.transition);
    //.ease(d3.easeExpInOut);
    
    var anim = svg.selectAll('path').data(lines).transition(t);
    anim.attr('d', function(d, i) { return areaFunction(d);});           
    anim.attr('fill', function(d, i) { return d[0].fill; });
    anim.attr('stroke', function(d, i) { return d[0].stroke; });
  }
  
  mirio.download = function () {
    var svgData = el.outerHTML;
    var svgBlob = new Blob([svgData], {type: 'image/svg+xml;charset=utf-8'});
    var svgUrl = URL.createObjectURL(svgBlob);
    var downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    downloadLink.download = "miriorama.svg";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  }

  mirio.save = function() {
    let ret = '';
    let obj = {
      color1: settings.color1,
      color2: settings.color2,
      line1: settings.line1,
      line2: settings.line2
    }
    console.log(btoa(JSON.stringify(obj)));
  }
  
  mirio.getLines = function () {
    var linesArr = [];
    var colors = chroma.scale([settings.color1, settings.color2]).mode('lch').colors(settings.toty + 2);
    
    for (var ny = -1; ny <= settings.toty; ny++) {
      var newLine = [];

      for (var nx = 0; nx <= settings.totx; nx++) {
        var x1 = settings.width / settings.totx * nx;
        var y1 = settings.line1[nx];
        var x2 = settings.width / settings.totx * nx;
        var y2 = settings.line2[nx];
        var data = {};
        
        if (ny == -1) {
          data.x = nx/settings.totx * settings.width;
          data.y = 0;
          data.y1 = settings.height;
        } else {
          data.x = nx/settings.totx * settings.width,
          data.y = this.interpolator(y1, y2, ny/settings.toty)
          data.y1 = this.interpolator(y1, y2, (ny + 1)/settings.toty)
        }
        
        data.fill = colors[ny + 1];               
        
        newLine.push(data);
      }
      
      newLine.index = ny;
      newLine.key = ny;

      linesArr.push(newLine)
    }

    return linesArr;
  }
  
  mirio.interpolator = function(a, b, t) {
    t = d3.easeQuadInOut(t);

    return a * (1 - t) + b * t;
  }
    
  mirio.getPath = function(isBottom) {
    var ret = [];

    var rndPrev = 0;
    for (var nx = 0; nx <= settings.totx; nx++) {
      var rnd;

      do {
          rnd = Math.round(UTIL.rnd(0, settings.waveDimension));
      } while (Math.abs(rnd - rndPrev) > settings.waveDiffMax);
      
      ret.push((isBottom ? settings.height - rnd : rnd));

      rndPrev = rnd;
    }

    return ret;
  }
  
  return mirio;
})();

MIRIO.init();

var DB = (function(){  
  let conn = firebase.database();
    
  var opt = {
  }
  
  var db = {
    init: function () {
      
    },
    
    load: function(id, callback) {
      return conn.ref('/waves/' + id).once('value').then(function(obj) {
          var data = obj.val() || null;
          console.log('Circle loaded.');
          if (typeof callback === 'function') {
              callback(data);
          }
      });
    },
    
    save: function(id, data, callback) {
      if (id) {
        // update
        
        conn.ref('waves/' + id).set(data);
      } else {
        // insert
        
        var waves = conn.ref('waves/');
        var newWave = waves.push();
        newWave.set(data, function() {
          console.log('New circle saved at: ' + newWave.key);
          
          db.upload(newWave.key);
          
          if (typeof callback === 'function') {
              callback();
          }          
        });
      }
    },
    
    upload: function(id) {
      const SVG_DOCTYPE = '<?xml version="1.0" standalone="no"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">';
      var storageRef = firebase.storage().ref();
      var image = storageRef.child('waves/' + id + '.svg');
      var svg = document.getElementById('svg');
      var content = SVG_DOCTYPE + (new XMLSerializer()).serializeToString(svg).replace();
      
      let metadata = {
        contentType: 'image/svg+xml'
      };      
      image.putString(content, 'raw', metadata).then(function(snapshot) {
        console.log('Uploaded a new file at ' + snapshot);
      });
      
    }
  }
  return {
    init: function() {
      return db.init();
    },
    save: function(id, data, callback) {
      return db.save(id, data, callback);
    },
    load: function(id, callback) {
      return db.load(id, callback);
    }
  }

})();

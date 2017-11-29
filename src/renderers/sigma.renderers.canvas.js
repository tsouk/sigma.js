;
(function(undefined) {
  'use strict';

  if (typeof sigma === 'undefined')
    throw 'sigma is not declared';

  if (typeof conrad === 'undefined')
    throw 'conrad is not declared';

  // Initialize packages:
  sigma.utils.pkg('sigma.renderers');

  /**
   * This function is the constructor of the canvas sigma's renderer.
   *
   * @param  {sigma.classes.graph}            graph    The graph to render.
   * @param  {sigma.classes.camera}           camera   The camera.
   * @param  {configurable}           settings The sigma instance settings
   *                                           function.
   * @param  {object}                 object   The options object.
   * @return {sigma.renderers.canvas}          The renderer instance.
   */
  sigma.renderers.canvas = function(graph, camera, settings, options) {
    if (typeof options !== 'object')
      throw 'sigma.renderers.canvas: Wrong arguments.';

    if (!(options.container instanceof HTMLElement))
      throw 'Container not found.';

    var k,
      i,
      l,
      a,
      fn,
      self = this;

    sigma.classes.dispatcher.extend(this);

    // Initialize main attributes:
    Object.defineProperty(this, 'conradId', {
      value: sigma.utils.id()
    });
    this.graph = graph;
    this.camera = camera;
    this.contexts = {};
    this.domElements = {};
    this.options = options;
    this.container = this.options.container;
    this.settings = (
        typeof options.settings === 'object' &&
        options.settings
      ) ?
      settings.embedObjects(options.settings) :
      settings;

    // Node indexes:
    this.nodesOnScreen = [];
    this.edgesOnScreen = [];

    // Conrad related attributes:
    this.jobs = {};

    // Find the prefix:
    this.options.prefix = 'renderer' + this.conradId + ':';

    // Initialize the DOM elements:
    if (!this.settings('batchEdgesDrawing')) {
      this.initDOM('canvas', 'scene');
      this.contexts.edges = this.contexts.scene;
      this.contexts.nodes = this.contexts.scene;
      this.contexts.labels = this.contexts.scene;
    } else {
      this.initDOM('canvas', 'edges');
      this.initDOM('canvas', 'scene');
      this.contexts.nodes = this.contexts.scene;
      this.contexts.labels = this.contexts.scene;
    }

    this.initDOM('canvas', 'mouse');
    this.contexts.hover = this.contexts.mouse;

    // Initialize captors:
    this.captors = [];
    a = this.options.captors || [sigma.captors.mouse, sigma.captors.touch];
    for (i = 0, l = a.length; i < l; i++) {
      fn = typeof a[i] === 'function' ? a[i] : sigma.captors[a[i]];
      this.captors.push(
        new fn(
          this.domElements.mouse,
          this.camera,
          this.settings
        )
      );
    }

    // Deal with sigma events:
    sigma.misc.bindEvents.call(this, this.options.prefix);
    sigma.misc.drawHovers.call(this, this.options.prefix);

    this.resize(false);
  };




  /**
   * This method renders the graph on the canvases.
   *
   * @param  {?object}                options Eventually an object of options.
   * @return {sigma.renderers.canvas}         Returns the instance itself.
   */
  sigma.renderers.canvas.prototype.render = function(options) {
    options = options || {};

    var a,
      i,
      k,
      l,
      o,
      id,
      end,
      job,
      start,
      edges,
      renderers,
      rendererType,
      batchSize,
      tempGCO,
      index = {},
      graph = this.graph,
      nodes = this.graph.nodes,
      prefix = this.options.prefix || '',
      drawEdges = this.settings(options, 'drawEdges'),
      drawNodes = this.settings(options, 'drawNodes'),
      drawLabels = this.settings(options, 'drawLabels'),
      drawEdgeLabels = this.settings(options, 'drawEdgeLabels'),
      embedSettings = this.settings.embedObjects(options, {
        prefix: this.options.prefix
      });

    // Call the resize function:
    this.resize(false);

    // Check the 'hideEdgesOnMove' setting:
    if (this.settings(options, 'hideEdgesOnMove'))
      if (this.camera.isAnimated || this.camera.isMoving)
        drawEdges = false;

    // Apply the camera's view:
    this.camera.applyView(
      undefined,
      this.options.prefix, {
        width: this.width,
        height: this.height
      }
    );

    // Clear canvases:
    this.clear();

    // Kill running jobs:
    for (k in this.jobs)
      if (conrad.hasJob(k))
        conrad.killJob(k);

    // Find which nodes are on screen:
    this.edgesOnScreen = [];
    this.nodesOnScreen = this.camera.quadtree.area(
      this.camera.getRectangle(this.width, this.height)
    );

    for (a = this.nodesOnScreen, i = 0, l = a.length; i < l; i++)
      index[a[i].id] = a[i];

    // Draw edges:
    // - If settings('batchEdgesDrawing') is true, the edges are displayed per
    //   batches. If not, they are drawn in one frame.
    if (drawEdges) {
      // First, let's identify which edges to draw. To do this, we just keep
      // every edges that have at least one extremity displayed according to
      // the quadtree and the "hidden" attribute. We also do not keep hidden
      // edges.
      for (a = graph.edges(), i = 0, l = a.length; i < l; i++) {
        o = a[i];
        if (
          (index[o.source] || index[o.target]) &&
          (!o.hidden && !nodes(o.source).hidden && !nodes(o.target).hidden)
        )
          this.edgesOnScreen.push(o);
      }

      // If the "batchEdgesDrawing" settings is true, edges are batched:
      if (this.settings(options, 'batchEdgesDrawing')) {
        id = 'edges_' + this.conradId;
        batchSize = embedSettings('canvasEdgesBatchSize');

        edges = this.edgesOnScreen;
        l = edges.length;

        start = 0;
        end = Math.min(edges.length, start + batchSize);

        job = function() {
          tempGCO = this.contexts.edges.globalCompositeOperation;
          this.contexts.edges.globalCompositeOperation = 'destination-over';

          renderers = sigma.canvas.edges;
          for (i = start; i < end; i++) {
            o = edges[i];
            (renderers[
              o.type || this.settings(options, 'defaultEdgeType')
            ] || renderers.def)(
              o,
              graph.nodes(o.source),
              graph.nodes(o.target),
              this.contexts.edges,
              embedSettings
            );
          }

          // Draw edge labels:
          if (drawEdgeLabels) {
            renderers = sigma.canvas.edges.labels;
            for (i = start; i < end; i++) {
              o = edges[i];
              if (!o.hidden)
                (renderers[
                  o.type || this.settings(options, 'defaultEdgeType')
                ] || renderers.def)(
                  o,
                  graph.nodes(o.source),
                  graph.nodes(o.target),
                  this.contexts.labels,
                  embedSettings
                );
            }
          }

          // Restore original globalCompositeOperation:
          this.contexts.edges.globalCompositeOperation = tempGCO;

          // Catch job's end:
          if (end === edges.length) {
            delete this.jobs[id];
            return false;
          }

          start = end + 1;
          end = Math.min(edges.length, start + batchSize);
          return true;
        };

        this.jobs[id] = job;
        conrad.addJob(id, job.bind(this));

        // If not, they are drawn in one frame:
      } else {
        renderers = sigma.canvas.edges;
        for (a = this.edgesOnScreen, i = 0, l = a.length; i < l; i++) {
          o = a[i];
          (renderers[
            o.type || this.settings(options, 'defaultEdgeType')
          ] || renderers.def)(
            o,
            graph.nodes(o.source),
            graph.nodes(o.target),
            this.contexts.edges,
            embedSettings
          );
        }

        // Draw edge labels:
        // - No batching
        if (drawEdgeLabels) {
          renderers = sigma.canvas.edges.labels;
          for (a = this.edgesOnScreen, i = 0, l = a.length; i < l; i++)
            if (!a[i].hidden)
              (renderers[
                a[i].type || this.settings(options, 'defaultEdgeType')
              ] || renderers.def)(
                a[i],
                graph.nodes(a[i].source),
                graph.nodes(a[i].target),
                this.contexts.labels,
                embedSettings
              );
        }
      }
    }

    // Draw nodes:
    // - No batching
    if (drawNodes) {

      renderers = sigma.canvas.nodes;
      for (a = this.nodesOnScreen, i = 0, l = a.length; i < l; i++)
        if (!a[i].hidden)
          (renderers[
            a[i].type || this.settings(options, 'defaultNodeType')
          ] || renderers.def)(
            a[i],
            this.contexts.nodes,
            embedSettings
          );

      // // ----- Cardinal spline, pasted in the bottom.
      // // Works, but needs to apply to all nodes, not just ones on screen
      // // also needs to be applied in the right order, only on child only node.
      // // also needs to clear the context every frame 
      // var degreeOneNodes = [];
      // for (a = this.nodesOnScreen, i = 0, l = a.length; i < l; i++) {
      //     if (!a[i].hidden) {
      //         if (graph.degree(a[i].id) <= 1) {
      //             degreeOneNodes.push({
      //                 x: a[i][prefix + 'x'],
      //                 y: a[i][prefix + 'y']
      //             });
      //         }
      //     }
      // }

      // //Create a new instance.
      // var convexHull = new ConvexHullGrahamScan();

      // //add points (needs to be done for each point, a foreach loop on the input array can be used.)
      // for (let point of degreeOneNodes) {
      //     convexHull.addPoint(point.x, point.y);
      // }

      // //getHull() returns the array of points that make up the convex hull.
      // var hullPoints = convexHull.getHull();

      // var pointsforHull = [];
      // for (k = 0; k < hullPoints.length; k++) {
      //     pointsforHull.push(hullPoints[k].x);
      //     pointsforHull.push(hullPoints[k].y);
      // }

      // this.contexts.nodes.curve(pointsforHull, 0.2, 25, true); // add cardinal spline to path
      // this.contexts.nodes.stroke(); // stroke path
      // this.contexts.nodes.fillStyle = "rgba(100, 200, 255, 0.5)";;
      // this.contexts.nodes.fill();

      // // -------- Blobs
      // //this.width and this.height are not camera width and height 
      // var imageData = this.contexts.tempNodes.getImageData(0, 0, 2000, 2000),
      //     pix = imageData.data,
      //     pixelNumber,
      //     threshold = 100;
      // // --- it's not the for loops that are fucking it up
      // for (i = 0, pixelNumber = pix.length; i < pixelNumber; i += 4) {
      //     if (pix[i + 3] < threshold) {
      //         pix[i + 3] /= 60;
      //         if (pix[i + 3] > threshold / 4) {
      //             pix[i + 3] = 0;
      //         }
      //     }
      // }
      // this.contexts.nodes.putImageData(imageData, 0, 0, 0, 0, 1000, 1000);
      // //this.contexts.nodes = this.contexts.tempNodes;

    }

    // Draw labels:
    // - No batching
    if (drawLabels) {
      renderers = sigma.canvas.labels;
      for (a = this.nodesOnScreen, i = 0, l = a.length; i < l; i++)
        if (!a[i].hidden)
          (renderers[
            a[i].type || this.settings(options, 'defaultNodeType')
          ] || renderers.def)(
            a[i],
            this.contexts.labels,
            embedSettings
          );
    }

    this.dispatchEvent('render');

    return this;
  };

  /**
   * This method creates a DOM element of the specified type, switches its
   * position to "absolute", references it to the domElements attribute, and
   * finally appends it to the container.
   *
   * @param  {string} tag The label tag.
   * @param  {string} id  The id of the element (to store it in "domElements").
   */
  sigma.renderers.canvas.prototype.initDOM = function(tag, id) {
    var dom = document.createElement(tag);

    dom.style.position = 'absolute';
    dom.setAttribute('class', 'sigma-' + id);

    this.domElements[id] = dom;
    this.container.appendChild(dom);

    if (tag.toLowerCase() === 'canvas')
      this.contexts[id] = dom.getContext('2d');

    this.contexts.tempNodes = dom.getContext('2d');
  };

  /**
   * This method resizes each DOM elements in the container and stores the new
   * dimensions. Then, it renders the graph.
   *
   * @param  {?number}                width  The new width of the container.
   * @param  {?number}                height The new height of the container.
   * @return {sigma.renderers.canvas}        Returns the instance itself.
   */
  sigma.renderers.canvas.prototype.resize = function(w, h) {
    var k,
      oldWidth = this.width,
      oldHeight = this.height,
      pixelRatio = sigma.utils.getPixelRatio();

    if (w !== undefined && h !== undefined) {
      this.width = w;
      this.height = h;
    } else {
      this.width = this.container.offsetWidth;
      this.height = this.container.offsetHeight;

      w = this.width;
      h = this.height;
    }

    if (oldWidth !== this.width || oldHeight !== this.height) {
      for (k in this.domElements) {
        this.domElements[k].style.width = w + 'px';
        this.domElements[k].style.height = h + 'px';

        if (this.domElements[k].tagName.toLowerCase() === 'canvas') {
          this.domElements[k].setAttribute('width', (w * pixelRatio) + 'px');
          this.domElements[k].setAttribute('height', (h * pixelRatio) + 'px');

          if (pixelRatio !== 1)
            this.contexts[k].scale(pixelRatio, pixelRatio);
        }
      }
    }

    return this;
  };

  /**
   * This method clears each canvas.
   *
   * @return {sigma.renderers.canvas} Returns the instance itself.
   */
  sigma.renderers.canvas.prototype.clear = function() {
    for (var k in this.contexts) {
      this.contexts[k].clearRect(0, 0, this.width, this.height);
    }

    return this;
  };

  /**
   * This method kills contexts and other attributes.
   */
  sigma.renderers.canvas.prototype.kill = function() {
    var k,
      captor;

    // Kill captors:
    while ((captor = this.captors.pop()))
      captor.kill();
    delete this.captors;

    // Kill contexts:
    for (k in this.domElements) {
      this.domElements[k].parentNode.removeChild(this.domElements[k]);
      delete this.domElements[k];
      delete this.contexts[k];
    }
    delete this.domElements;
    delete this.contexts;
  };

  /**
   * Graham's Scan Convex Hull Algorithm
   * @desc An implementation of the Graham's Scan Convex Hull algorithm in JavaScript.
   * @author Brian Barnett, brian@3kb.co.uk, http://brianbar.net/ || http://3kb.co.uk/
   * @version 1.0.4
   */
  function ConvexHullGrahamScan() {
    this.anchorPoint = void 0, this.reverse = !1, this.points = []
  }
  ConvexHullGrahamScan.prototype = {
    constructor: ConvexHullGrahamScan,
    Point: function(n, t) {
      this.x = n, this.y = t
    },
    _findPolarAngle: function(n, t) {
      var i, o, h = 57.295779513082;
      if (!n || !t) return 0;
      if (i = t.x - n.x, o = t.y - n.y, 0 == i && 0 == o) return 0;
      var r = Math.atan2(o, i) * h;
      return this.reverse ? 0 >= r && (r += 360) : r >= 0 && (r += 360), r
    },
    addPoint: function(n, t) {
      return void 0 === this.anchorPoint ? void(this.anchorPoint = new this.Point(n, t)) : this.anchorPoint.y > t && this.anchorPoint.x > n || this.anchorPoint.y === t && this.anchorPoint.x > n || this.anchorPoint.y > t && this.anchorPoint.x === n ? (this.points.push(new this.Point(this.anchorPoint.x, this.anchorPoint.y)), void(this.anchorPoint = new this.Point(n, t))) : void this.points.push(new this.Point(n, t))
    },
    _sortPoints: function() {
      var n = this;
      return this.points.sort(function(t, i) {
        var o = n._findPolarAngle(n.anchorPoint, t),
          h = n._findPolarAngle(n.anchorPoint, i);
        return h > o ? -1 : o > h ? 1 : 0
      })
    },
    _checkPoints: function(n, t, i) {
      var o, h = this._findPolarAngle(n, t),
        r = this._findPolarAngle(n, i);
      return h > r ? (o = h - r, !(o > 180)) : r > h ? (o = r - h, o > 180) : !0
    },
    getHull: function() {
      var n, t, i = [];
      if (this.reverse = this.points.every(function(n) {
          return n.x < 0 && n.y < 0
        }), n = this._sortPoints(), t = n.length, 3 > t) return n.unshift(this.anchorPoint), n;
      for (i.push(n.shift(), n.shift());;) {
        var o, h, r;
        if (i.push(n.shift()), o = i[i.length - 3], h = i[i.length - 2], r = i[i.length - 1], this._checkPoints(o, h, r) && i.splice(i.length - 2, 1), 0 == n.length) {
          if (t == i.length) {
            var e = this.anchorPoint;
            return i = i.filter(function(n) {
              return !!n
            }), i.some(function(n) {
              return n.x == e.x && n.y == e.y
            }) || i.unshift(this.anchorPoint), i
          }
          n = i, t = n.length, i = [], i.push(n.shift(), n.shift())
        }
      }
    }
  }, "function" == typeof define && define.amd && define(function() {
    return ConvexHullGrahamScan
  }), "undefined" != typeof module && (module.exports = ConvexHullGrahamScan);


  /**
   * The labels, nodes and edges renderers are stored in the three following
   * objects. When an element is drawn, its type will be checked and if a
   * renderer with the same name exists, it will be used. If not found, the
   * default renderer will be used instead.
   *
   * They are stored in different files, in the "./canvas" folder.
   */
  sigma.utils.pkg('sigma.canvas.nodes');
  sigma.utils.pkg('sigma.canvas.edges');
  sigma.utils.pkg('sigma.canvas.labels');

  /*  Curve extension for canvas 2.3.4
   *  (c) Epistemex 2013-2016
   *  www.epistemex.com
   *  License: MIT
   */
  CanvasRenderingContext2D.prototype.curve = CanvasRenderingContext2D.prototype.curve || function(h, t, f, c) {
    t = (typeof t === "number") ? t : 0.5;
    f = (typeof f === "number") ? f : 25;
    var j, d = 1,
      e = h.length,
      n = 0,
      m = (e - 2) * f + 2 + (c ? 2 * f : 0),
      k = new Float32Array(m),
      a = new Float32Array((f + 2) * 4),
      b = 4;
    j = h.slice(0);
    if (c) {
      j.unshift(h[e - 1]);
      j.unshift(h[e - 2]);
      j.push(h[0], h[1])
    } else {
      j.unshift(h[1]);
      j.unshift(h[0]);
      j.push(h[e - 2], h[e - 1])
    }
    a[0] = 1;
    for (; d < f; d++) {
      var o = d / f,
        p = o * o,
        r = p * o,
        q = r * 2,
        s = p * 3;
      a[b++] = q - s + 1;
      a[b++] = s - q;
      a[b++] = r - 2 * p + o;
      a[b++] = r - p
    }
    a[++b] = 1;
    g(j, a, e, t);
    if (c) {
      j = [];
      j.push(h[e - 4], h[e - 3], h[e - 2], h[e - 1], h[0], h[1], h[2], h[3]);
      g(j, a, 4, t)
    }

    function g(G, z, B, M) {
      for (var A = 2, H; A < B; A += 2) {
        var C = G[A],
          D = G[A + 1],
          E = G[A + 2],
          F = G[A + 3],
          I = (E - G[A - 2]) * M,
          J = (F - G[A - 1]) * M,
          K = (G[A + 4] - C) * M,
          L = (G[A + 5] - D) * M,
          u = 0,
          v, w, x, y;
        for (H = 0; H < f; H++) {
          v = z[u++];
          w = z[u++];
          x = z[u++];
          y = z[u++];
          k[n++] = v * C + w * E + x * I + y * K;
          k[n++] = v * D + w * F + x * J + y * L
        }
      }
    }
    e = c ? 0 : h.length - 2;
    k[n++] = h[e++];
    k[n] = h[e];
    for (d = 0, e = k.length; d < e; d += 2) {
      this.lineTo(k[d], k[d + 1])
    }
    return k
  };
}).call(this);
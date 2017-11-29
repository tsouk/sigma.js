;
(function() {
  'use strict';

  sigma.utils.pkg('sigma.canvas.nodes');

  /**
   * The default node renderer. It renders the node as a simple disc.
   *
   * @param  {object}                   node     The node object.
   * @param  {CanvasRenderingContext2D} context  The canvas context.
   * @param  {configurable}             settings The settings function.
   */
  sigma.canvas.nodes.def = function(node, context, settings) {
    var prefix = settings('prefix') || '';


    //---- Blobs
    // context.beginPath();
    // var grad = context.createRadialGradient(node[prefix + 'x'], node[prefix + 'y'], 1, node[prefix + 'x'], node[prefix + 'y'], node[prefix + 'size'] * 10);
    // grad.addColorStop(0, 'rgba(100,145,190,1)');
    // grad.addColorStop(1, 'rgba(100,145,190,0)');
    // context.fillStyle = grad;
    // context.arc(node[prefix + 'x'], node[prefix + 'y'], node[prefix + 'size'] * 100, 0, Math.PI * 2);
    // context.fill();

    //---- how it was
    context.fillStyle = node.color || settings('defaultNodeColor');

    context.beginPath();
    context.arc(
      node[prefix + 'x'],
      node[prefix + 'y'],
      node[prefix + 'size'],
      0,
      Math.PI * 2,
      true
    );

    context.closePath();
    context.fill();

  };
})();
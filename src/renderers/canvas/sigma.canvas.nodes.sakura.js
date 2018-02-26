;(function() {
    'use strict';

    sigma.utils.pkg('sigma.canvas.nodes');
    var imageObj = new Image();
    imageObj.src = 'images/sakura.svg';

    /**
     * Sigma Node Sakura Custom Renderer
     * ==================================
     *
     * Sakura blossom renderer
     *
     * Author: Nikos Tsouknidas (tsouk)
     * Version: 0.0.1
     */

    sigma.canvas.nodes.sakura = function(node, context, settings) {
        var prefix = settings('prefix') || '',
            scale = 0.05,
            img_width = 100,//25,
            img_height = 96,//25,
            sakura_width = node[prefix + 'size'] * img_width * scale,
            sakura_height = node[prefix + 'size'] * img_height * scale,
            sakura_x = node[prefix + 'x'] - sakura_width/2,
            sakura_y = node[prefix + 'y'] - sakura_height/2;

        context.imageSmoothingEnabled = false;
        context.drawImage(imageObj, sakura_x, sakura_y, sakura_width, sakura_height);
      
    };
})();

;(function() {
    'use strict';

    sigma.utils.pkg('sigma.canvas.nodes');
    var imageObj = new Image();
<<<<<<< HEAD
    imageObj.src = 'images/sakura.svg';
=======
    imageObj.src = '/images/sakura.png';
>>>>>>> d2a3f620a3d44b35a8e955e958f50eb4354040ef

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
<<<<<<< HEAD
=======
            
>>>>>>> d2a3f620a3d44b35a8e955e958f50eb4354040ef
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

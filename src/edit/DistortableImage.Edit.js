/* eslint-disable valid-jsdoc */
L.DistortableImage = L.DistortableImage || {};

// holds the keybindings & toolbar API for an individual image instance
L.DistortableImage.Edit = L.Handler.extend({
  options: {
    opacity: 0.7,
    outline: '1px solid red',
    keymap: L.distortableImage.action_map,
  },

  initialize: function(overlay, options) {
    this._overlay = overlay;
    this._toggledImage = false;
    /* Interaction modes. TODO - create API for
    * limiting modes similar to toolbar actions API */
    var modes = ['distort', 'lock', 'rotate', 'scale', 'rotateScale'];
    this._mode = modes[modes.indexOf(overlay.options.mode)] || 'distort';

    this._selected = this._overlay.options.selected || false;
    this._transparent = false;
    this._outlined = false;

    L.setOptions(this, options);

    L.distortableImage.action_map.Escape = '_deselect';
  },

  /* Run on image selection. */
  addHooks: function() {
    var overlay = this._overlay;
    var map = overlay._map;
    var eventParents = overlay._eventParents;

    /* bring the selected image into view */
    overlay.bringToFront();

    this._initHandles();

    this._appendHandlesandDragable(this._mode);

    this.editActions = this.options.actions;

    if (this._selected && !overlay.options.suppressToolbar) {
      this._addToolbar();
    }

    this._overlay._dragStartPoints = {
      0: L.point(0, 0),
      1: L.point(0, 0),
      2: L.point(0, 0),
      3: L.point(0, 0),
    };

    if (eventParents) {
      var eP = eventParents[Object.keys(eventParents)[0]];
      if (eP) { this.parentGroup = eP; }
      else { this.parentGroup = false; }
    }

    /**
     * custom events fired from DoubleClickLabels.js. Used to differentiate
     * single / dblclick to not deselect images on map dblclick.
     */
    if (map.doubleClickZoom.enabled() || map.doubleClickLabels.enabled()) {
      L.DomEvent.on(map, 'singleclick', this._singleClick, this);
    } else {
      L.DomEvent.on(map, 'click', this._deselect, this);
    }

    L.DomEvent.on(map, {
      singleclickon: this._singleClickListeners,
      singleclickoff: this._resetClickListeners,
    }, this);

    L.DomEvent.on(overlay._image, {
      click: this._select,
      dblclick: this._nextMode,
    }, this);

    L.DomEvent.on(window, 'keydown', this._onKeyDown, this);
  },

  /* Run on image deselection. */
  removeHooks: function() {
    var overlay = this._overlay;
    var map = overlay._map;
    var eP = this.parentGroup;

    // First, check if dragging exists - it may be off due to locking
    if (this.dragging) { this.dragging.disable(); }
    delete this.dragging;

    if (this.toolbar) { this._removeToolbar(); }
    if (this.editing) { this.editing.disable(); }

    map.removeLayer(this._handles[this._mode]);

    /**
     * ensures if you disable an image while it is multi-selected
     * additional deselection logic is run
     */
    if (L.DomUtil.hasClass(overlay.getElement(), 'selected')) {
      L.DomUtil.removeClass(overlay.getElement(), 'selected');
    }

    if (eP && (!eP.anySelected() && eP.editing.toolbar)) {
      eP.editing._removeToolbar();
    }

    if (map.doubleClickZoom.enabled() || map.doubleClickLabels.enabled()) {
      L.DomEvent.off(map, 'singleclick', this._singleClick, this);
    } else {
      L.DomEvent.off(map, 'click', this._deselect, this);
    }

    L.DomEvent.off(map, {
      singleclickon: this._singleClickListeners,
      singleclickoff: this._resetClickListeners,
    }, this);

    L.DomEvent.off(overlay._image, {
      click: this._select,
      dblclick: this._nextMode,
    }, this);

    L.DomEvent.off(window, 'keydown', this._onKeyDown, this);
  },

  disable: function() {
    if (!this._enabled) { return this; }

    this._enabled = false;
    this.removeHooks();
    return this;
  },

  _initHandles: function() {
    var overlay = this._overlay;
    var i;

    this._lockHandles = L.layerGroup();
    for (i = 0; i < 4; i++) {
      this._lockHandles.addLayer(
          new L.LockHandle(overlay, i, {draggable: false})
      );
    }

    this._distortHandles = L.layerGroup();
    for (i = 0; i < 4; i++) {
      this._distortHandles.addLayer(new L.DistortHandle(overlay, i));
    }

    this._rotateHandles = L.layerGroup(); // individual rotate
    for (i = 0; i < 4; i++) {
      this._rotateHandles.addLayer(new L.RotateHandle(overlay, i));
    }

    this._scaleHandles = L.layerGroup();
    for (i = 0; i < 4; i++) {
      this._scaleHandles.addLayer(new L.ScaleHandle(overlay, i));
    }

    // handle includes rotate AND scale
    this._rotateScaleHandles = L.layerGroup();
    for (i = 0; i < 4; i++) {
      this._rotateScaleHandles.addLayer(new L.RotateScaleHandle(overlay, i));
    }

    this._handles = {
      lock: this._lockHandles,
      distort: this._distortHandles,
      rotateScale: this._rotateScaleHandles,
      scale: this._scaleHandles,
      rotate: this._rotateHandles,
    };
  },

  _appendHandlesandDragable: function(mode) {
    var overlay = this._overlay;
    var map = overlay._map;

    map.addLayer(this._handles[mode]);

    if (mode !== 'lock') {
      if (!this._selected) {
        this._handles[mode].eachLayer(function(layer) {
          layer.setOpacity(0);
          layer.dragging.disable();
          layer.options.draggable = false;
        });
      }

      this._enableDragging();
    }
  },

  _onKeyDown: function(e) {
    var keymap = this.options.keymap;
    var handlerName = keymap[e.key];
    var overlay = this._overlay;
    var eP = this.parentGroup;

    if (eP && eP.anySelected()) { return; }

    if (this[handlerName] !== undefined && !overlay.options.suppressToolbar) {
      if (this._selected) {
        this[handlerName].call(this);
      }
    }
  },

  addTool: function(value) {
    if (value.baseClass === 'leaflet-toolbar-icon' && !this.hasTool(value)) {
      this._removeToolbar();
      this.editActions.push(value);
      this._addToolbar();
    } else {
      return false;
    }
  },

  hasTool: function(value) {
    return this.editActions.some(function(action) {
      return action === value;
    });
  },

  removeTool: function(value) {
    this.editActions.some(function(item, idx) {
      if (this.editActions[idx] === value) {
        this._removeToolbar();
        this.editActions.splice(idx, 1);
        this._addToolbar();
        return true;
      } else {
        return false;
      }
    }, this);
  },

  _removeToolbar: function() {
    var overlay = this._overlay;
    var map = overlay._map;

    if (this.toolbar) {
      map.removeLayer(this.toolbar);
      this.toolbar = false;
    }
  },

  _enableDragging: function() {
    var overlay = this._overlay;
    var map = overlay._map;

    this.dragging = new L.Draggable(overlay.getElement());
    this.dragging.enable();

    /* Hide toolbars and markers while dragging; click will re-show it */
    this.dragging.on('dragstart', function() {
      overlay.fire('dragstart');
      this._removeToolbar();
    }, this);

    /*
     * Adjust default behavior of L.Draggable.
     * By default, L.Draggable overwrites the CSS3 distort transform
     * that we want when it calls L.DomUtil.setPosition.
     */
    this.dragging._updatePosition = function() {
      var delta = this._newPos.subtract(map.latLngToLayerPoint(overlay._corners[0]));
      var currentPoint;
      var i;

      this.fire('predrag');

      for (i = 0; i < 4; i++) {
        currentPoint = map.latLngToLayerPoint(overlay._corners[i]);
        overlay._corners[i] = map.layerPointToLatLng(currentPoint.add(delta));
      }

      overlay._reset();
      overlay.fire('update');
      overlay.fire('drag');

      this.fire('drag');
    };
  },

  _toggleRotateScale: function() {
    var map = this._overlay._map;

    if (this._mode === 'lock') { return; }

    map.removeLayer(this._handles[this._mode]);

    if (this._mode === 'rotateScale') { this._mode = 'distort'; }
    else { this._mode = 'rotateScale'; }

    map.addLayer(this._handles[this._mode]);

    this._addToolbar();
  },

  _toggleScale: function() {
    var map = this._overlay._map;

    if (this._mode === 'lock') { return; }

    map.removeLayer(this._handles[this._mode]);

    if (this._mode === 'scale') { this._mode = 'distort'; }
    else { this._mode = 'scale'; }

    map.addLayer(this._handles[this._mode]);
  },

  _toggleRotate: function() {
    var map = this._overlay._map;

    if (this._mode === 'lock') { return; }

    map.removeLayer(this._handles[this._mode]);
    if (this._mode === 'rotate') { this._mode = 'distort'; }
    else { this._mode = 'rotate'; }

    map.addLayer(this._handles[this._mode]);
  },

  _toggleTransparency: function() {
    var image = this._overlay.getElement();
    var opacity;

    this._transparent = !this._transparent;
    opacity = this._transparent ? this.options.opacity : 1;

    L.DomUtil.setOpacity(image, opacity);
    image.setAttribute('opacity', opacity);

    this._addToolbar();
  },

  _toggleOutline: function() {
    var image = this._overlay.getElement();
    var opacity;
    var outline;

    this._outlined = !this._outlined;
    outline = this._outlined ? this.options.outline : 'none';

    L.DomUtil.setOpacity(image, opacity);
    image.setAttribute('opacity', opacity);

    image.style.outline = outline;

    this._addToolbar();
  },

  _sendUp: function() {
    this._overlay.bringToFront();
  },

  _sendDown: function() {
    this._overlay.bringToBack();
  },

  _unlock: function() {
    this._mode = 'distort';
    this._enableDragging();
  },

  _lock: function() {
    this._mode = 'lock';
    if (this.dragging) {
      this.dragging.disable();
    }
    delete this.dragging;
  },

  _toggleLock: function() {
    var map = this._overlay._map;

    map.removeLayer(this._handles[this._mode]);

    if (this._mode === 'lock') { this._unlock(); }
    else { this._lock(); }

    map.addLayer(this._handles[this._mode]);

    this._addToolbar();
  },

  _singleClick: function(e) {
    if (e.deselect) { this._deselect(); }
    else { return; }
  },

  _singleClickListeners: function() {
    var map = this._overlay._map;

    L.DomEvent.on(map, 'singleclick', this._singleClick, this);
    L.DomEvent.off(map, 'click', this._deselect, this);
  },

  _resetClickListeners: function() {
    var map = this._overlay._map;

    L.DomEvent.on(map, 'click', this._deselect, this);
    L.DomEvent.off(map, 'singleclick', this._singleClick, this);
  },

  _select: function(e) {
    this._selected = true;
    this._addToolbar();
    this._showMarkers();

    if (e) { L.DomEvent.stopPropagation(e); }
  },

  _deselect: function() {
    this._selected = false;
    this._removeToolbar();
    if (this._mode !== 'lock') {
      this._hideMarkers();
    }
  },

  _showMarkers: function() {
    var eP = this.parentGroup;
    // mutli-image interface doesn't have markers so check if its on & return early if true
    if (this._mode === 'lock' || (eP && eP.anySelected())) { return; }

    var currentHandle = this._handles[this._mode];

    currentHandle.eachLayer(function(layer) {
      var drag = layer.dragging;
      var opts = layer.options;

      layer.setOpacity(1);
      if (drag) { drag.enable(); }
      if (opts.draggable) { opts.draggable = true; }
    });
  },

  _hideMarkers: function() {
    // workaround for race condition w/ feature group
    if (!this._handles) { this._initHandles(); }

    var mode = this._mode;
    var currentHandle = this._handles[mode];

    currentHandle.eachLayer(function(layer) {
      var drag = layer.dragging;
      var opts = layer.options;

      if (mode !== 'lock') { layer.setOpacity(0); }
      if (drag) { drag.disable(); }
      if (opts.draggable) { opts.draggable = false; }
    });
  },

  _addToolbar: function() {
    var overlay = this._overlay;
    var eP = this.parentGroup;
    var map = overlay._map;
    // Find the topmost point on the image.
    var corners = overlay.getCorners();
    var maxLat = -Infinity;

    if (eP && eP.anySelected()) {
      eP.editing._addToolbar();
      return;
    }

    if (overlay.options.suppressToolbar) { return; }

    for (var i = 0; i < corners.length; i++) {
      if (corners[i].lat > maxLat) {
        maxLat = corners[i].lat;
      }
    }

    // Longitude is based on the centroid of the image.
    var raisedPoint = overlay.getCenter();
    raisedPoint.lat = maxLat;

    try {
      this.toolbar = L.distortableImage.popupBar(raisedPoint, {
        actions: this.editActions,
      }).addTo(map, overlay);
      overlay.fire('toolbar:created');
    } catch (e) { }
  },

  _refreshPopupIcons: function() {
    this._addToolbar();
    this._removeToolbar();
  },

  _updateToolbarPos: function() {
    var overlay = this._overlay;
    // Find the topmost point on the image.
    var corners = overlay.getCorners();
    var toolbar = this.toolbar;
    var maxLat = -Infinity;

    if (toolbar && toolbar instanceof L.DistortableImage.PopupBar) {
      for (var i = 0; i < corners.length; i++) {
        if (corners[i].lat > maxLat) {
          maxLat = corners[i].lat;
        }
      }

      // Longitude is based on the centroid of the image.
      var raisedPoint = overlay.getCenter();
      raisedPoint.lat = maxLat;

      if (!overlay.options.suppressToolbar) {
        this.toolbar.setLatLng(raisedPoint);
      }
    }
  },

  _removeOverlay: function() {
    var overlay = this._overlay;
    var map = overlay._map;
    var eP = this.parentGroup;

    if (this._mode === 'lock') { return; }

    var choice = L.DomUtil.confirmDelete();
    if (!choice) { return; }

    this._removeToolbar();

    if (eP) { eP.removeLayer(overlay); }
    else { map.removeLayer(overlay); }
  },

  // compare this to using overlay zIndex
  _toggleOrder: function() {
    if (this._toggledImage) {
      this._toggledImage = false;
      this._overlay.bringToFront();
    } else {
      this._toggledImage = true;
      this._overlay.bringToBack();
    }
    this._addToolbar();
  },

  // Based on https://github.com/publiclab/mapknitter/blob/8d94132c81b3040ae0d0b4627e685ff75275b416/app/assets/javascripts/mapknitter/Map.js#L47-L82
  _getExport: function() {
    var overlay = this._overlay;
    var map = overlay._map;

    // make a new image
    var downloadable = new Image();

    downloadable.id = downloadable.id || 'tempId12345';
    document.body.appendChild(downloadable);

    downloadable.onload = function onLoadDownloadableImage() {
      var height = downloadable.height;
      var width = downloadable.width;
      var nw = map.latLngToLayerPoint(overlay.getCorner(0));
      var ne = map.latLngToLayerPoint(overlay.getCorner(1));
      var sw = map.latLngToLayerPoint(overlay.getCorner(2));
      var se = map.latLngToLayerPoint(overlay.getCorner(3));

      // I think this is to move the image to the upper left corner,
      // eslint-disable-next-line max-len
      // jywarren: i think we may need these or the image goes off the edge of the canvas
      // jywarren: but these seem to break the distortion math...

      // jywarren: i think it should be rejiggered so it
      // finds the most negative values of x and y and then
      // adds those to all coordinates

      // nw.x -= nw.x;
      // ne.x -= nw.x;
      // se.x -= nw.x;
      // sw.x -= nw.x;

      // nw.y -= nw.y;
      // ne.y -= nw.y;
      // se.y -= nw.y;
      // sw.y -= nw.y;

      // run once warping is complete
      downloadable.onload = function() {
        L.DomUtil.remove(downloadable);
      };

      if (window && window.hasOwnProperty('warpWebGl')) {
        warpWebGl(
            downloadable.id,
            [0, 0, width, 0, width, height, 0, height],
            [nw.x, nw.y, ne.x, ne.y, se.x, se.y, sw.x, sw.y],
            true // trigger download
        );
      }
    };

    downloadable.src = overlay.options.fullResolutionSrc || overlay._image.src;
  },

  /**
    * need to attach a stop to img dblclick or it will propogate to
    * the map and fire the handler that shows map location labels on map dblclick.
    */
  _nextMode: function(e) {
    var eP = this.parentGroup;

    this._enableDragging();
    this.enable();
    this._toggleRotateScale();

    if (eP && eP.anySelected()) { this._deselect(); }
    L.DomEvent.stop(e);
  },
});

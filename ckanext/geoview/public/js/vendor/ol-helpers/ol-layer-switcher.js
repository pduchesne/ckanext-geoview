
/**
 * Adapted from https://github.com/walkermatt/ol3-layerswitcher
 */
ol.control.HilatsLayerSwitcher = function(opt_options) {

    var options = opt_options || {};

    this.mapListeners = [];

    var _this = this;

    this.parentElement = $("<div class='layer-switcher'></div>").hover(
        function(e) {
            _this.showPanel()
        },
        function(e) {
            // deal with FF triggering a mouseout when opening the select dropdown
            // cf https://stackoverflow.com/questions/32561180/keep-hover-triggered-twitter-bootstrap-popover-alive-while-selecting-option-from
            if (!(e.target && e.target.tagName == 'SELECT'))
                _this.hidePanel()
        }
    )

    this.header = $("<div class='header'></div>")

    var element = $("<div class='ol-unselectable ol-control layer-list'></div>");

    var progressIndicator =  $("<div class='stacked-layers'>" +
                                "<div class='stacked-layer layer-1'/>" +
                                "<div class='stacked-layer layer-2'/>" +
                                "<div class='stacked-layer layer-3'/></div>")
    this.parentElement
        .append(progressIndicator)
        .append(this.header)
        .append(element);


    this.panel = $("<div class='panel'></div>").appendTo(element)[0];

    ol.control.HilatsLayerSwitcher.enableTouchScroll_(this.panel);

    ol.control.Control.call(this, {
        element: this.parentElement[0],
        target: options.target
    });

};

ol.inherits(ol.control.HilatsLayerSwitcher, ol.control.Control);

/**
 * Show the layer panel.
 */
ol.control.HilatsLayerSwitcher.prototype.showPanel = function() {
    if (! $(this.panel).is(":visible")) {
        this.parentElement.addClass('active');
        this.renderPanel();
    }
};

ol.control.HilatsLayerSwitcher.prototype.isLoading = function(toggle) {
    $(this.element).find('.stacked-layer').toggleClass('animated', toggle)
};

/**
 * Hide the layer panel.
 */
ol.control.HilatsLayerSwitcher.prototype.hidePanel = function() {
    this.parentElement.removeClass('active');
};

/**
 * Re-draw the layer panel to represent the current state of the layers.
 */
ol.control.HilatsLayerSwitcher.prototype.renderPanel = function() {

    this.ensureTopVisibleBaseLayerShown_();

    $(this.header).empty()
        .append(this.renderBaseLayerSelector());

    this.renderLayersList(this.getMap().getLayers().getArray().slice().reverse())
        .appendTo($(this.panel).empty())

    $(this.header).find("select").width($(this.panel).width() - 40)

};

ol.control.HilatsLayerSwitcher.prototype.setMap = function(map) {
    ol.control.Control.prototype.setMap.call(this, map);
    if (map) {
        this.renderPanel();
    }
};

ol.control.HilatsLayerSwitcher.prototype.renderBaseLayerSelector = function() {
    var _this = this;
    var $select = $("<select></select>")
        .change(function(e) {
            var layer = $(e.target).find(":selected").prop("layer");
            _this.switchBaseLayer(layer)
        })
    return $("<div class='baseLayerSelector'></div>")
        .append($select);
};

ol.control.HilatsLayerSwitcher.prototype.renderBaseLayer = function(baselayer) {
    var $select = $(this.header).find(".baseLayerSelector select");

    $select.append(
        $('<option/>', {value: baselayer.ol_uid})
            .prop("layer", baselayer)
            .text(baselayer.get('title'))
    )

    if (baselayer.getVisible())
        $select.val(baselayer.ol_uid);

};

ol.control.HilatsLayerSwitcher.prototype.switchBaseLayer = function(baselayer) {
    // hide all base layers
    ol.control.HilatsLayerSwitcher.forEachRecursive(this.getMap(), function(l, idx, a) {
        if (l.get('type') === 'base') {
            l.setVisible(false);
        }
    });

    //switch projection
    var newProjection = baselayer.getSource() && baselayer.getSource().getProjection();
    if (newProjection) {
        var currentView = this.getMap().getView();
        var currentExtent = currentView.calculateExtent();
        var newExtent = ol.proj.transformExtent(currentExtent, currentView.getProjection(), newProjection);
        var newView = new ol.View({
            projection: newProjection
        })
        this.getMap().setView(newView);

        // doing setView messes with the extent
        // --> set extent after
        newView.fit(newExtent, {constrainResolution: false});
    }


    // display base layer
    baselayer.setVisible(true);

};

/**
 * Ensure only the top-most base layer is visible if more than one is visible.
 * @private
 */
ol.control.HilatsLayerSwitcher.prototype.ensureTopVisibleBaseLayerShown_ = function() {
    var lastVisibleBaseLyr;
    ol.control.HilatsLayerSwitcher.forEachRecursive(this.getMap(), function(l, idx, a) {
        if (l.get('type') === 'base' && l.getVisible()) {
            lastVisibleBaseLyr = l;
        }
    });
    if (lastVisibleBaseLyr) this.setVisible_(lastVisibleBaseLyr, true);
};

/**
 * Toggle the visible state of a layer.
 * Takes care of hiding other layers in the same exclusive group if the layer
 * is toggle to visible.
 * @private
 * @param {ol.layer.Base} The layer whos visibility will be toggled.
 */
ol.control.HilatsLayerSwitcher.prototype.setVisible_ = function(lyr, visible) {
    var map = this.getMap();
    lyr.setVisible(visible);
    if (visible && lyr.get('type') === 'base') {
        // Hide all other base layers regardless of grouping
        ol.control.HilatsLayerSwitcher.forEachRecursive(map, function(l, idx, a) {
            if (l != lyr && l.get('type') === 'base') {
                l.setVisible(false);
            }
        });
    }
};

ol.control.HilatsLayerSwitcher.prototype.renderLayer = function(lyr, container) {

    if (lyr.get('type') === 'base') {
        this.renderBaseLayer(lyr)
        return;
    }

    var this_ = this;

    var li = $("<li></li>")

    var label = $("<label></label>").text(lyr.get('title'))
    if (lyr.getLayers) {

        li.append(label.addClass('group'));
        var layerList = this.renderLayersList(lyr.getLayers().getArray().slice().reverse())
        li.append(layerList);

    } else {

        li.addClass('layer');
        var input = $("<input>")
            .prop("checked", lyr.get('visible'))
            .attr("type", 'checkbox')
            .change(function(e) {this_.setVisible_(lyr, e.target.checked)})
            .appendTo(li);
        li.append(label)
    }

    if (container)
        li.appendTo(container)

    return li;

};

/**
 * Render all layers that are children of a group.
 * @private
 * @param {ol.layer.Group} lyr Group layer whos children will be rendered.
 * @param {Element} elm DOM element that children will be appended to.
 */
ol.control.HilatsLayerSwitcher.prototype.renderLayersList = function(layers) {
    var _this = this;
    var $list = $("<ul></ul>")
    layers.forEach(function(l) {
        if (l.get('title')) {
            _this.renderLayer(l, $list);
        }
    });
    return $list;
};

/**
 * **Static** Call the supplied function for each layer in the passed layer group
 * recursing nested groups.
 * @param {ol.layer.Group} lyr The layer group to start iterating from.
 * @param {Function} fn Callback which will be called for each `ol.layer.Base`
 * found under `lyr`. The signature for `fn` is the same as `ol.Collection#forEach`
 */
ol.control.HilatsLayerSwitcher.forEachRecursive = function(lyr, fn) {
    lyr.getLayers().forEach(function(lyr, idx, a) {
        fn(lyr, idx, a);
        if (lyr.getLayers) {
            ol.control.HilatsLayerSwitcher.forEachRecursive(lyr, fn);
        }
    });
};

/**
 * @private
 * @desc Apply workaround to enable scrolling of overflowing content within an
 * element. Adapted from https://gist.github.com/chrismbarr/4107472
 */
ol.control.HilatsLayerSwitcher.enableTouchScroll_ = function(elm) {
    if(ol.control.HilatsLayerSwitcher.isTouchDevice_()){
        var scrollStartPos = 0;
        elm.addEventListener("touchstart", function(event) {
            scrollStartPos = this.scrollTop + event.touches[0].pageY;
        }, false);
        elm.addEventListener("touchmove", function(event) {
            this.scrollTop = scrollStartPos - event.touches[0].pageY;
        }, false);
    }
};

/**
 * @private
 * @desc Determine if the current browser supports touch events. Adapted from
 * https://gist.github.com/chrismbarr/4107472
 */
ol.control.HilatsLayerSwitcher.isTouchDevice_ = function() {
    try {
        document.createEvent("TouchEvent");
        return true;
    } catch(e) {
        return false;
    }
};

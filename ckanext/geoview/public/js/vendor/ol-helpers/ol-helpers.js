// Openlayers preview module

if (typeof proj4 != "undefined" && proj4) {
    window.Proj4js = {
        Proj: function (code) {

            if (Proj4js.defs[code])
                return proj4(Proj4js.defs[code]);

            var shortCode = code.replace(
                /urn:ogc:def:crs:(\w+):(.*:)?(\w+)$/, "$1:$3"
            )
            // side-effect : add long-form code as alias
            if (code != shortCode)
                Proj4js.defs(code, Proj4js.defs[shortCode]);
            return Proj4js.defs[shortCode] && proj4(Proj4js.defs[shortCode]);
        },
        defs: proj4.defs,
        transform: proj4
    };
}

if (!ol.source.State) {
    ol.source.State = {
        UNDEFINED: 'undefined',
        LOADING: 'loading',
        READY: 'ready',
        ERROR: 'error'
    };
}

var OLgetState = ol.source.Vector.prototype.getState
ol.source.Vector.prototype.getState = function() {
    return this.HL_state || OLgetState.call(this);
};
ol.source.Vector.prototype.setState = function(state) {
    this.HL_state = state;
    this.changed();
};

String.prototype.hashCode = function() {
    var hash = 0, i, chr;
    if (this.length === 0) return hash;
    for (i = 0; i < this.length; i++) {
        chr   = this.charCodeAt(i);
        hash  = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
};

if (window.Proj4js) {
    // add your projection definitions here
    // definitions can be found at http://spatialreference.org/ref/epsg/{xxxx}/proj4js/

    proj4.defs['OGC:CRS84'] = proj4.defs['EPSG:4326']

    // add EPSG:4326 as coming from GML, to allow for geometry transforms performed by format.GML
    proj4.defs['http://www.opengis.net/gml/srs/epsg.xml#4326'] = proj4.defs['EPSG:4326']

    // warn : 31370 definition from spatialreference.org is wrong
    proj4.defs("EPSG:31370", "+proj=lcc +lat_1=51.16666723333333 +lat_2=49.8333339 +lat_0=90 +lon_0=4.367486666666666 +x_0=150000.013 +y_0=5400088.438 +ellps=intl +towgs84=-106.868628,52.297783,-103.723893,0.336570,-0.456955,1.842183,-1.2747 +units=m +no_defs");
    //window.Proj4js.defs["EPSG:31370"] = "+proj=lcc +lat_1=51.16666723333333 +lat_2=49.8333339 +lat_0=90 +lon_0=4.367486666666666 +x_0=150000.013 +y_0=5400088.438 +ellps=intl +towgs84=-106.868628,52.297783,-103.723893,0.336570,-0.456955,1.842183,-1.2747 +units=m +no_defs";

    window.Proj4js.defs["EPSG:28992"] = "+proj=sterea +lat_0=52.15616055555555 +lon_0=5.38763888888889 +k=0.999908 +x_0=155000 +y_0=463000 +ellps=bessel +units=m +towgs84=565.2369,50.0087,465.658,-0.406857330322398,0.350732676542563,-1.8703473836068,4.0812 +no_defs <>";
    window.Proj4js.defs["EPSG:3812"] = "+proj=lcc +lat_1=49.83333333333334 +lat_2=51.16666666666666 +lat_0=50.797815 +lon_0=4.359215833333333 +x_0=649328 +y_0=665262 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs";

}

// duplicate this code to avoid a dependency on internal class ol.<...>.Projection_
var createEPSG4326Proj = function(code, opt_axisOrientation) {
    return new ol.proj.Projection({
        code: code,
        units: ol.proj.get('EPSG:4326').getUnits(),
        extent: ol.proj.get('EPSG:4326').getExtent(),
        axisOrientation: opt_axisOrientation,
        global: true,
        metersPerUnit: ol.proj.get('EPSG:4326').getMetersPerUnit(),
        worldExtent: ol.proj.get('EPSG:4326').getWorldExtent()
    })
}

// redefine GML EPSG:4326 with lon/lat axis order;
// Don't do that. Force usage of EPSG4326_LONLAT in format.GML instead
//ol.proj.addProjection(createEPSG4326Proj('http://www.opengis.net/gml/srs/epsg.xml#4326', 'enu'));

// Define a special projection with lon/lat axis order to be used in format.GML hack
ol.proj.addProjection(createEPSG4326Proj('EPSG:4326:LONLAT', 'enu'));

(function() {

    // Establish the root object, `window` in the browser, or `global` on the server.
    var root = this;
    var OL_HELPERS = root.OL_HELPERS = {
        // this is currently used only for geojson parsing
        FEATURE_GEOM_PROP : '_HILATS_Geometry',
        DEFAULT_STYLEMAP : {
        highlight : new ol.style.Style({
            stroke: new ol.style.Stroke({
                color: 'blue',
                width: 3
            }),
            image: new ol.style.Circle({
                radius: 5,
                stroke: new ol.style.Stroke({
                    color: 'blue',
                    width: 3
                })
            })
        }),
            selected : [
            new ol.style.Style({
                stroke: new ol.style.Stroke({
                    color: 'white',
                    width: 5
                })}),
            new ol.style.Style({
                stroke: new ol.style.Stroke({
                    color: 'green',
                    width: 3
                }),
                fill: new ol.style.Fill({
                    color: 'rgba(255, 255, 255, 0.1)'
                }),
                image: new ol.style.Circle({
                    radius: 5,
                    fill: new ol.style.Fill({
                        color: 'rgba(255, 255, 255, 0.1)'
                    }),
                    stroke: new ol.style.Stroke({
                        color: 'green',
                        width: 3
                    })
                })
            }) ]
    }
    };

    var $_ = _ // keep pointer to underscore, as '_' will may be overridden by a closure variable when down the stack

    var EPSG4326 = OL_HELPERS.EPSG4326 = ol.proj.get("EPSG:4326")
    var EPSG4326_LONG = OL_HELPERS.EPSG4326_LONG = ol.proj.get('urn:ogc:def:crs:EPSG:6.6:4326')
    var EPSG4326_LONLAT = OL_HELPERS.EPSG4326_LONLAT = createEPSG4326Proj('EPSG:4326', 'enu')
    var Mercator = OL_HELPERS.Mercator = ol.proj.get("EPSG:3857")
    var WORLD_BBOX = OL_HELPERS.WORLD_BBOX = [-180, -90, 180, 90]
    var MAX_FEATURES = 300

    var isNumeric = function(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    }

    // When possible, override decimal parsers, as some capabilities use commas as decimal separator
    // (e.g. http://geoservices.wallonie.be/arcgis/services/EAU/ALEA_2016/MapServer/WMSServer)
    var originalReadDecimal = ol.format && ol.format.XSD && ol.format.XSD.readDecimalString;
    if (originalReadDecimal) {
        ol.format.XSD.readDecimalString = function (string) {
            if (string) {
                string = string.replace(',', '.');
            }
            return originalReadDecimal(string);
        };
    }


    ol.Map.prototype.addLayerWithExtent = function (layer) {
        this.addLayer(layer)

        // fit to layer extent only if layer visible
        if (layer.getVisible() && layer.getSource()) {

            var _view = this.getView();
            var zoomToExtent = function() {
                var projectedBbox;
                var wgs84bbox = layer.getSource().getFullExtent && layer.getSource().getFullExtent();
                if (wgs84bbox) {
                    projectedBbox = ol.proj.transformExtent(wgs84bbox, OL_HELPERS.EPSG4326, _view.getProjection())
                } else {
                    // is getExtent always in view projection? yes for vector sources
                    projectedBbox = layer.getSource().getExtent && layer.getSource().getExtent();
                }

                // sometimes the capabilities are wrong and the bbox is absent
                if (projectedBbox &&
                    isNumeric(projectedBbox[0]) &&
                    isNumeric(projectedBbox[1]) &&
                    isNumeric(projectedBbox[2]) &&
                    isNumeric(projectedBbox[3]))

                    _view.fit(projectedBbox, {constrainResolution: false})
                else {
                    console.warn("Adding layer : could not find extent to zoom to")
                }
            }


            var loading = $.Deferred();
            if (! layer.getSource().get('waitingOnFirstData'))
                loading.resolve();
            else {
                var listenerKey = layer.getSource().on('change', function(e) {
                    if (layer.getSource().getState() == 'ready') {
                        ol.Observable.unByKey(listenerKey);
                        loading.resolve();
                    }
                });
            }

            return loading.then(zoomToExtent)
        }

    }

    /**
     * Override loadFeatures to implement max features cap.
     * Take into account return value of loader func and reload new batches of data when needed
     */
    /*
    ol.source.Vector.prototype.loadFeatures = function(
        extent, resolution, projection) {
        var loadedExtentsRtree = this.loadedExtentsRtree_;
        var extentsToLoad = this.strategy_(extent, resolution);
        var i, ii;
        for (i = 0, ii = extentsToLoad.length; i < ii; ++i) {
            var extentToLoad = extentsToLoad[i];
            var alreadyLoaded = loadedExtentsRtree.forEachInExtent(extentToLoad,
                    function(object) {
                        // return true if new extent is contained in a fully loaded extent
                        // or if new extent contains a partially loaded extent
                    return (object.extentCovered && ol.extent.containsExtent(object.extent, extentToLoad)) ||
                           (!object.extentCovered && ol.extent.containsExtent(extentToLoad, object.extent));
                });
            if (!alreadyLoaded) {
                // return value of loader is true if extent was partially loaded (due to max features cap)
                var promise = this.loader_.call(this, extentToLoad, resolution, projection);
                var insertExtentFn = function(extentCovered) {
                    loadedExtentsRtree.insert(extentToLoad, {extent: extentToLoad.slice(), extentCovered: extentCovered});
                }
                if (promise) {
                    promise.then(
                        function(extentPartiallyCovered) { insertExtentFn(!extentPartiallyCovered) },
                        function(err) { insertExtentFn(false) });
                } else {
                    insertExtentFn(true)
                }

            }
        }
    };
    */




    // Returns the WGS84 bbox
    var getFTSourceExtent = function() {
        var bbox = this.get('ftDescr') && this.get('ftDescr').wgs84bbox;
        return bbox;
    }

    var getFT3SourceExtent = function() {
        var bbox = this.get('ftDescr') && this.get('ftDescr').extent.bbox;
        return bbox;
    }

    var getWMTSSourceExtent = function() {
        var bbox = this.get('mlDescr') && this.get('mlDescr').WGS84BoundingBox;
        return bbox;
    }

    var getWMSSourceExtent = function() {
        //1.1.0 : LatLonBoundingBox
        //1.3   : EX_GeographicBoundingBox
        var bbox = this.get('mlDescr') && this.get('mlDescr').EX_GeographicBoundingBox;
        return bbox;
    }

    var getArcGISVectorExtent = function() {
        var bbox = this.get('arcgisDescr') && this.get('arcgisDescr').bounds;
        return bbox;
    }


    var pendingEPSGRequests = {};
    var searchEPSG = function(query) {
        if (pendingEPSGRequests[query])
            return pendingEPSGRequests[query];

        var deferredResult = pendingEPSGRequests[query] = $.Deferred()

        fetch('https://epsg.io/?format=json&q=' + query).then(function(response) {
            return response.json();
        }).then(function(json) {
            var results = json['results'];
            if (results && results.length > 0) {
                for (var i = 0, ii = results.length; i < ii; i++) {
                    var result = results[i];
                    if (result) {
                        var code = result['code'], name = result['name'],
                            proj4def = result['proj4'], bbox = result['bbox'];
                        if (code && code.length > 0 && proj4def && proj4def.length > 0) {

                            var newProjCode = 'EPSG:' + code;
                            proj4.defs(newProjCode, proj4def);
                            var newProj = ol.proj.get(newProjCode);

                            deferredResult.resolve(newProj);
                        }
                    }
                }
            }
            deferredResult.resolve(undefined); // resolve with an error ?
        });

        return deferredResult.then(function() {
            delete pendingEPSGRequests[query]
        });
    }

    OL_HELPERS.LoggingMap = function(options) {
        ol.Map.call(this, options);

        this.loadingObjects = []

        this.errorDiv = options.errorDiv
        if (this.errorDiv === undefined) {
            this.errorDiv = $("<div style='color: #511e17; font-size: 12px; padding: 2px 3px; background-color: rgba(255, 235, 131, 0.80);  display: none;'></div>")[0]
        }

        this.msgDiv = options.msgDiv
        if (this.msgDiv === undefined) {
            this.msgDiv = $("<div style='font-size: 12px; padding: 2px 3px; background-color: rgba(255,255,255,0.8); display: none;'></div>")[0]
        }

        this.loadingDiv = options.loadingDiv
        if (this.loadingDiv === undefined) {
            this.loadingDiv = $("<div class='loader' style='font-size: 10px; margin: 40px 40px; z-index: 50; position: absolute; top: 0px;'></div>")[0]
        }
        this.loadingListener = options.loadingListener

        this.loadingDiv && this.getViewport().appendChild(this.loadingDiv);

        var msgContainer = $("<div style='position: absolute; z-index: 50; left: 60px; top:10px;'></div>").appendTo(this.getViewport());
        this.errorDiv && msgContainer.append(this.errorDiv);
        this.msgDiv && msgContainer.append(this.msgDiv);

        this.partiallyLoadedSources = [];
        this.erroredSources = [];

        this.on("change:partiallyLoaded", function() {
            if (this.msgDiv) {
                if (this.partiallyLoadedSources.length > 0) {
                    var _thisMap = this;
                    var msgDiv = $(this.msgDiv)
                        .text("More features to load ")
                        .append($("<button>Reload in current view</button>").click(function() {
                            _thisMap.partiallyLoadedSources.forEach(function(src) {
                                src.clear();
                            })
                        }))
                    _thisMap.partiallyLoadedSources.forEach(function(src) {
                        if (src.get('next_page')) {
                            msgDiv.append($("<button>Next page</button>").click(function() {
                                _thisMap.partiallyLoadedSources.forEach(function(src) {
                                    src.nextPage();
                                })
                            }))
                        }
                    })
                    this.msgDiv.style.display = '';
                } else {
                    this.msgDiv.style.display = 'none';
                }
            }
        });

        this.on("change:erroredSource", function() {
            if (this.errorDiv) {
                if (this.erroredSources.length > 0) {
                    var _thisMap = this;
                    $(this.errorDiv)
                        .text("Layers in error - See console for details ")
                        .append($("<button>Retry</button>").click(function() {
                            _thisMap.erroredSources.forEach(function(src) {
                                src.setState(ol.source.State.READY);
                                src.clear();
                            })
                        }))
                    this.errorDiv.style.display = '';
                } else {
                    this.errorDiv.style.display = 'none';
                }
            }
        });

        this.updateLoadingStatus();
    };
    ol.inherits(OL_HELPERS.LoggingMap, ol.Map);

    OL_HELPERS.LoggingMap.prototype.updateLoadingStatus = function() {
        if (this.loadingObjects.length == 0) {
            this.loadingDiv && (this.loadingDiv.style.display = 'none');
            this.loadingListener && this.loadingListener(false);
        } else {
            this.loadingDiv && (this.loadingDiv.style.display = '');
            this.loadingListener && this.loadingListener(true);
        }
    };

    OL_HELPERS.LoggingMap.prototype.addLayer = function(layer) {
        ol.Map.prototype.addLayer.apply(this, arguments)

        var _this = this

        var layerStarts = function(event) {
            var loadingObj = event.tile || event.target || this;
            if (_this.loadingObjects.indexOf(loadingObj) < 0) {
                _this.loadingObjects.push(loadingObj)
            }
            _this.updateLoadingStatus()
        }

        var layerEnds = function(event) {
            var loadingObj = event.tile || event.target || this;


            var es_idx = _this.erroredSources.indexOf(loadingObj);
            if (this.getState() == ol.source.State.ERROR) {
                if (es_idx == -1)
                    _this.erroredSources.push(loadingObj);
                _this.dispatchEvent("change:erroredSource");
            } else {
                if (es_idx >= 0) {
                    _this.erroredSources.splice(es_idx, 1);
                    _this.dispatchEvent("change:erroredSource")
                }
            }

            var pls_idx = _this.partiallyLoadedSources.indexOf(loadingObj);
            if (loadingObj.get && loadingObj.get('partial_load')) {
                if (pls_idx == -1)
                    _this.partiallyLoadedSources.push(loadingObj);
                    _this.dispatchEvent("change:partiallyLoaded");
            } else {
                if (pls_idx >= 0) {
                    _this.partiallyLoadedSources.splice(pls_idx, 1);
                    _this.dispatchEvent("change:partiallyLoaded")
                }
            }

            var idx = _this.loadingObjects.indexOf(loadingObj)
            if (idx >= 0) {
                _this.loadingObjects.splice(idx, 1)
            }
            setTimeout(function() {
                _this.updateLoadingStatus()
            }, 100);
        }

        //TODO do something special for errors ?
        var layerError = layerEnds

        layer.getSource().on('change', function(e) {
            if (layer.getSource().getState() == ol.source.State.LOADING) {
                layerStarts.call(this, e)
            } else if (layer.getSource().getState() == ol.source.State.READY)
            {
                layerEnds.call(this, e)
            } else if (layer.getSource().getState() == ol.source.State.ERROR)
            {
                layerError.call(this, e)
            }
        });

        layer.on('change:visible', function(e) {
            var pls_idx = _this.partiallyLoadedSources.indexOf(this.getSource());
            if (this.getVisible() && this.getSource().get('partial_load')) {
                _this.partiallyLoadedSources.push(this.getSource());
                _this.dispatchEvent("change:partiallyLoaded");
            } else if (!this.getVisible() && pls_idx >= 0) {
                _this.partiallyLoadedSources.splice(pls_idx, 1);
                _this.dispatchEvent("change:partiallyLoaded")
            }

            var es_idx = _this.erroredSources.indexOf(this.getSource());
            if (this.getVisible() && this.getSource().getState() == ol.source.State.ERROR) {
                _this.erroredSources.push(this.getSource());
                _this.dispatchEvent("change:erroredSource");
            } else if (!this.getVisible() && es_idx >= 0) {
                _this.erroredSources.splice(es_idx, 1);
                _this.dispatchEvent("change:erroredSource")
            }
        });

        layer.getSource().on('tileloadstart', layerStarts);
        layer.getSource().on('tileloadend', layerEnds);
        layer.getSource().on('tileloaderror', layerError);
        layer.getSource().on('imageloadstart', layerStarts);
        layer.getSource().on('imageloadend', layerEnds);
        layer.getSource().on('imageloaderror', layerError);

    };


    /**
     * Options : {
     *     className,
     *     target,
     *     render : () => {render all features} ,
     *     renderFeature : (feature, $elem) => {render feature in $elem}
     * }
     * @param opt_options
     * @constructor
     */
    OL_HELPERS.FeatureDetailsControl = function(opt_options) {

        var options = opt_options ? opt_options : {};

        var element = document.createElement('DIV');
        element.className = options.className !== undefined ? options.className : 'ol-feature-details';

        var render = options.render ?
            options.render : OL_HELPERS.FeatureDetailsControl.render;

        ol.control.Control.call(this, {
            element: element,
            render: render,
            target: options.target
        });

        this.renderFeature = options.renderFeature ?
            options.renderFeature : OL_HELPERS.FeatureDetailsControl.renderFeature;


        this.on('change:'+OL_HELPERS.FeatureDetailsControl.PROPERTIES.SELECTED_FEATURES, this.handleFeaturesChanged);

    };
    ol.inherits(OL_HELPERS.FeatureDetailsControl, ol.control.Control);

    OL_HELPERS.FeatureDetailsControl.prototype.handleFeaturesChanged = function() {
        this.render();
    };

    OL_HELPERS.FeatureDetailsControl.prototype.setFeatures = function(features) {
        if (features instanceof ol.Collection)
            features = features.getArray();
        this.set(OL_HELPERS.FeatureDetailsControl.PROPERTIES.SELECTED_FEATURES, features || []);
    };

    /**
     * Update the mouseposition element.
     * @param {ol.MapEvent} mapEvent Map event.
     * @this {ol.control.MousePosition}
     * @api
     */
    OL_HELPERS.FeatureDetailsControl.render = function() {
        var htmlContent;

        var selectedFeatures = this.get(OL_HELPERS.FeatureDetailsControl.PROPERTIES.SELECTED_FEATURES) || [];

        var container = $(this.element)

        var _thisControl = this;
        if (selectedFeatures && selectedFeatures.length > 0) {
            var detailsArr = selectedFeatures.map(function(f) {
                var $details = $("<div class='featureDetails'></div>")
                    .prop('feature', f)
                _thisControl.renderFeature(f, $details)

                return $details;
            })
            container.empty().append(detailsArr);
        } else {
            container.empty();
        }

    };

    OL_HELPERS.FeatureDetailsControl.renderFeature = function(feature, container) {
        var htmlContent;

        if (feature) {

            var layerTitle = feature && feature.layer && feature.layer.get('title')
            htmlContent = "<div class='name'>" + layerTitle +" : <b>"+ (feature.get('name') || feature.getId()) + "</b></div>";

            htmlContent += "<div class='content'><table>";
            var geomName = feature.getGeometryName();
            feature.getKeys().forEach(function(prop) {
                if (prop != geomName)
                    htmlContent += "<tr><td class='propKey'>" + prop + "</td><td class='propValue'>" + feature.get(prop) + "</td></tr></div>"
            })
            htmlContent += "</table></div>";

            $(container).append($(htmlContent));
        } else {
            // return undefined
        }

    };

    OL_HELPERS.FeatureDetailsControl.PROPERTIES = {
        SELECTED_FEATURES : "selectedFeatures"
    };


    OL_HELPERS.FeatureInfoOverlay = function(options) {
        ol.Overlay.call(this, options);

        var popupContent = $(this.getElement()).find('.popupContent');
        popupContent.hover(function() {
            popupContent.prop('isHovered', true)
        }, function() {
            popupContent.prop('isHovered', false)
        })

        this.showDetails = options.showDetails;
        this.filter = options.filter;
        this.renderFeaturePopup = options.renderFeaturePopup || function(features, displayDetails) {
            var htmlContent;

            if (displayDetails) {
                var feature = features[0];

                var layerTitle = feature && feature.layer && feature.layer.get('title')
                htmlContent = "<div class='name'>" + layerTitle +" : <b>"+ (feature.get('name') || feature.getId()) + "</b></div>";

                htmlContent += "<table>";
                feature.getKeys().forEach(function(prop) {
                    htmlContent += "<tr><td class='propKey'>" + prop + "</td><td class='propValue'>" + feature.get(prop) + "</td></tr></div>"
                })
                htmlContent += "</table>"
            } else {
                htmlContent = "";
                features.forEach(function(feature) {
                    var layerTitle = feature && feature.layer && feature.layer.get('title')
                    htmlContent += "<div class='name'>" + layerTitle +" : <b>"+ (feature.get('name') || feature.getId()) + "</b></div>";
                })
            }

            return htmlContent;
        }
        this.computePosition = options.computePosition || function(features, evt) {
            // default positioning : take current cursor pos
            return evt.coordinate;
        }

        this.hoveredFeatures = [];

        this.on('change:map', function(evt) {
            this.HL_handleMapChanged();
        })
    };
    ol.inherits(OL_HELPERS.FeatureInfoOverlay, ol.Overlay);

    OL_HELPERS.FeatureInfoOverlay.prototype.setFeatures = function(features, displayDetails) {
        var popupContent = $(this.getElement()).find('.popupContent');

        if (features.length == 0) {
            // if features are no longer hovered, but info element still is, do not hide info
            if (!popupContent.prop("isHovered"))
                this.setPosition(undefined);
            return;
        }

        var htmlContent = this.renderFeaturePopup(features, displayDetails);

        // do a clean detach to make sure the same element can be re-appended while keeping its listeners
        this.appendedElement && $(this.appendedElement).detach();

        if (typeof htmlContent === 'string') {
            popupContent.html(htmlContent);
        } else {
            popupContent.empty().append(this.appendedElement = htmlContent);
        }

    }

    OL_HELPERS.FeatureInfoOverlay.prototype.HL_handleMapChanged = function() {
        var map = this.getMap();
        var _this = this;
        if (map) {
            map.on('pointermove', function(evt) {

                var changed = false;
                var features = [];
                map.forEachFeatureAtPixel(evt.pixel, function(feature, layer) {
                    if (layer != null) { // null layer is from unmanaged layers, presumably form Select interaction
                        if (feature && (!_this.filter || _this.filter(feature, layer))) // sometimes feature is undefined (?!)
                            features.push(feature);
                        feature.layer = layer
                        if (_this.hoveredFeatures.indexOf(feature) < 0) {
                            changed = true
                        }
                    }
                });

                changed = !$_.isEqual(features, _this.hoveredFeatures)

                if (changed) {
                    if (_this.displayDetailsTimeout)
                        clearTimeout(_this.displayDetailsTimeout)
                    _this.hoveredFeatures = features;
                    _this.setFeatures(_this.hoveredFeatures);
                    if (_this.showDetails)
                        _this.displayDetailsTimeout = setTimeout(function() {_this.setFeatures(_this.hoveredFeatures, true);}, 500);
                }

                if (_this.hoveredFeatures.length > 0) {
                    _this.setPosition(_this.computePosition(features, evt));
                }

            });
        }
    };




    /**
     * Parse a comma-separated set of KVP, typically for URL query or fragments
     * @param url
     */
    var parseKVP = OL_HELPERS.parseKVP = function (kvpString) {
        var kvps = (kvpString && kvpString.split("&")) || []
        var kvpMap = {}
        kvps.forEach(function(val, idx) {
            var kv = val.split('=')
            kvpMap[kv[0].toLowerCase()] = kv[1]
        })

        return kvpMap
    }

    var kvp2string = OL_HELPERS.kvp2string = function (map) {
        var result = ""
        for (var key in map) {
            result += (result.length>0?'&':'') + key + "=" + map[key]
        }

        return result
    }

    /**
     * Parse a URL into path, query KVP , hash KVP
     * @param url
     */
    OL_HELPERS.parseURL = function (url) {
        var parts = url.split('?', 2)
        var path = parts[0]
        var query = parts.length > 1 && parts[1]
        var hash
        if (!query) {
            parts = path.split('#', 2)
            path = parts[0]
            hash = parts.length > 1 && parts[1]
        } else {
            parts = query.split('#', 2)
            query = parts[0]
            hash = parts.length > 1 && parts[1]
        }

        return {
            path: path,
            query: parseKVP(query),
            hash: parseKVP(hash)
        }
    }


    var parseArcGisDescriptor = function (url, callback, failCallback) {

        var params = {f: "pjson"};

        fetch(url + (url.indexOf('?')>=0?'&':'?') + kvp2string(params),
            {method:'GET', credentials: 'include'}
        ).then(
            function(response) {
                return response.text();
            }
        ).then(
            function(text) {
                var descriptor = JSON.parse(text)
                callback(descriptor)
            }
        ).catch(failCallback || function(ex) {
            console.warn("Trouble getting ArcGIS descriptor");
            console.warn(ex);
        })
    }

    var fetchWFSCapas = function (url, callback, failCallback) {


        var params = {
            SERVICE: "WFS",
            REQUEST: "GetCapabilities"
        }
        fetch(url + (url.indexOf('?')>=0?'&':'?') + kvp2string(params),
            {method:'GET', credentials: 'include'}
        ).then(
            function(response) {
                return response.text();
            }
        ).then(
            function(text) {
                var capabilities = OL_HELPERS.parseWfsCapabilities($.parseXML(text))
                callback(capabilities)
            }
        ).catch(failCallback || function(ex) {
                console.warn("Trouble getting capabilities doc");
                console.warn(ex);
            })
    }


    var fetchWFSFeatureTypeDescr = function (url, ftName, ver, callback, failCallback) {
        var params = {
            SERVICE: "WFS",
            REQUEST: "DescribeFeatureType",
            TYPENAME: ftName,
            VERSION: ver
        }
        fetch(url + (url.indexOf('?')>=0?'&':'?') + kvp2string(params),
            {method:'GET', credentials: 'include'}
        ).then(
            function(response) {
                return response.text();
            }
        ).then(
            function(text) {
                var capabilities = $.parseXML(text);
                callback(OL_HELPERS.parseFeatureTypeDescription(capabilities))
            }
        ).catch(failCallback || function(ex) {
                console.warn("Trouble getting FT description doc");
                console.warn(ex);
            })
    }

    var parseWMSCapas = function (url, callback, failCallback) {
        var parser = new ol.format.WMSCapabilities();
        var params = {
            SERVICE: "WMS",
            REQUEST: "GetCapabilities"
        }
        fetch(url + (url.indexOf('?')>=0?'&':'?') + kvp2string(params),
              {method:'GET', credentials: 'include'}
        ).then(
            function(response) {
                return response.text();
            }
        ).then(
            function(text) {
                var capabilities = parser.read(text);
                callback(capabilities)
            }
        ).catch(failCallback || function(ex) {
                console.warn("Trouble getting capabilities doc");
                console.warn(ex);
            })

    }

    OL_HELPERS.parseWMTSCapas = function (url, callback, failCallback) {
        var wmtsFormat = new ol.format.WMTSCapabilities();
        var params = {
            SERVICE: "WMTS",
            REQUEST: "GetCapabilities",
            VERSION: "1.0.0"
        };

        fetch(url + (url.indexOf('?')>=0?'&':'?') + kvp2string(params),
            {method:'GET', credentials: 'include'}
        ).then(
            function(response) {
                return response.text();
            }
        ).then(
            function(text) {
                var capabilities = wmtsFormat.read(text);
                callback(capabilities)
            }
        ).catch(failCallback || function(ex) {
                console.warn("Trouble getting capabilities doc");
                console.warn(ex);
            })
    }

    /* Define a custom KML Format that accepts an onread callback
    *  to read global KML metadata (title, description, ...)      */

      OL_HELPERS.format = OL_HELPERS.format || {}
    OL_HELPERS.format.KML = function(opt_options) {

        ol.format.KML.call(this, opt_options);
        this.onread = opt_options && opt_options.onread;
    };
    ol.inherits(OL_HELPERS.format.KML, ol.format.KML);

    OL_HELPERS.format.KML.prototype.readDocumentOrFolder_ = function(node, objectStack) {
        var result = ol.format.KML.prototype.readDocumentOrFolder_.call(this, node, objectStack);
        this.onread && this.onread(node);
        return result;
    };

    OL_HELPERS.createKMLLayer = function (url) {

        // use a custom loader to set source state
        var kmlLoader = ol.featureloader.loadFeaturesXhr(
            url,
            new OL_HELPERS.format.KML({
                onread: function(node) {
                    var nameNode = node.querySelector(":scope > name");
                    var name = nameNode && nameNode.textContent;
                    name && kml.set('title', name);
                }
            }),
            function(features, dataProjection) {
                this.addFeatures(features);
                // set source as ready once features are loaded
                this.setState(ol.source.State.READY);
                source.set('waitingOnFirstData', false)
            },
            /* FIXME handle error */ ol.nullFunction);

        var source = new ol.source.Vector({
            loader: function(extent, resolution, projection) {
                // set source as loading before reading the KML
                this.setState(ol.source.State.LOADING);
                return kmlLoader.call(this, extent, resolution, projection)
            }
        });
        //set state as loading to be able to listen on load and grab extent after init
        source.set('waitingOnFirstData', true)

        var kml = new ol.layer.Vector({
            title: 'KML', // TODO extract title from KML
            source: source
        });

        return kml;
    }

    /* TODO_OL4 */
    OL_HELPERS.createGFTLayer = function (tableId, GoogleAPIKey) {
        return new OpenLayers.Layer.Vector(
            "GFT", {
                styleMap: OL_HELPERS.DEFAULT_STYLEMAP,
                projection: EPSG4326,
                strategies: [new OpenLayers.Strategy.Fixed()],
                protocol: new OpenLayers.Protocol.Script({
                    url: "https://www.googleapis.com/fusiontables/v1/query",
                    params: {
                        sql: "select * from " + tableId,
                        key: GoogleAPIKey
                    },
                    format: new OpenLayers.Format.GeoJSON({
                        ignoreExtraDims: true,
                        read: function (json) {
                            var row, feature, atts = {}, features = [];
                            var cols = json.columns; // column names
                            for (var i = 0; i < json.rows.length; i++) {
                                row = json.rows[i];
                                feature = new OpenLayers.Feature.Vector();
                                atts = {};
                                for (var j = 0; j < row.length; j++) {
                                    // 'location's are json objects, other types are strings
                                    if (typeof row[j] === "object" && row[j].geometry) {
                                        feature.geometry = this.parseGeometry(row[j].geometry);
                                    } else {
                                        atts[cols[j]] = row[j];
                                    }
                                }
                                feature.data = atts;
                                // if no geometry, not much point in continuing with this row
                                if (feature.geometry) {
                                    features.push(feature);
                                }
                            }
                            return features;
                        }
                    }),
                    callbackKey: "callback"
                }),
                eventListeners: {
                    "featuresadded": function () {
                        this.map.zoomToExtent(this.getDataExtent());
                    }
                }
            })
    }

    /* TODO_OL4 */
    OL_HELPERS.createGMLLayer = function (url) {

        var gml = new OpenLayers.Layer.Vector("GML", {
            styleMap: OL_HELPERS.DEFAULT_STYLEMAP,
            strategies: [new OpenLayers.Strategy.Fixed()],
            protocol: new OpenLayers.Protocol.HTTP({
                url: url,
                format: new OpenLayers.Format.GML()
            })
        });

        //TODO styles

        return gml
    }

    /**
     * Removes OGC conflicting URL parameters (service, request, version) and fragment
     * @param url
     */
    OL_HELPERS.cleanOGCUrl = function (url) {
        var urlParts = OL_HELPERS.parseURL(url)
        delete urlParts.query['service']
        delete urlParts.query['request']
        delete urlParts.query['version']
        delete urlParts.query['outputformat']
        delete urlParts.query['typename']

        return urlParts.path + '?' + OL_HELPERS.kvp2string(urlParts.query)

    }

    OL_HELPERS.parseWfsCapabilities = function(xmlDoc) {
        var $capas = $(xmlDoc);

        var ver = $($capas[0].getElementsByTagNameNS('*', 'WFS_Capabilities')).attr('version');
        var featureTypes = $($capas[0].getElementsByTagNameNS('*', 'FeatureType'));
        featureTypes = featureTypes.get().map(function (featureType, idx) {
            var $featureType = $(featureType);

            var bbox;
            // let's be lenient and look for latlonbbox or wgs84bbox regardless of advertised version
            var wgs84bbox = $(featureType.getElementsByTagNameNS('*', 'WGS84BoundingBox'));
            var latlonbbox = $(featureType.getElementsByTagNameNS('*', 'LatLongBoundingBox'));
            if (wgs84bbox.length && wgs84bbox[0].children.length > 0) {
                var ll = $(wgs84bbox[0].getElementsByTagNameNS('*', 'LowerCorner')).text().split(' ');
                var ur = $(wgs84bbox[0].getElementsByTagNameNS('*', 'UpperCorner')).text().split(' ')
                bbox = [parseFloat(ll[0]), parseFloat(ll[1]), parseFloat(ur[0]), parseFloat(ur[1])]
            } else if (latlonbbox.length) {
                bbox = [parseFloat(latlonbbox.attr('minx')), parseFloat(latlonbbox.attr('miny')), parseFloat(latlonbbox.attr('maxx')), parseFloat(latlonbbox.attr('maxy'))]
            }

            return {
                name: $(featureType.getElementsByTagNameNS('*', 'Name')).text(),
                title: $(featureType.getElementsByTagNameNS('*', 'Title')).text(),
                defaultSrs: $(featureType.getElementsByTagNameNS('*', 'DefaultSRS')).text() || $(featureType.getElementsByTagNameNS('*', 'DefaultCRS')).text(),
                otherSrs: $(featureType.getElementsByTagNameNS('*', 'SRS')).text(),
                wgs84bbox: bbox
            }
        })
        return {
            version: ver,
            featureTypes: featureTypes
        }
    }

    OL_HELPERS.parseFeatureTypeDescription = function(xmlDoc) {
        var $descr = $(xmlDoc);

        // WARN extremely fragile and hackish way to parse FT schema
        var props = $descr[0].getElementsByTagNameNS('*', 'complexType')[0]
                 .getElementsByTagNameNS('*', 'sequence')[0]
                 .getElementsByTagNameNS('*', 'element')

        var featureTypeProperties = $(props).map(function(idx, prop) {
            return {
                type: $(prop).attr('type'),
                name: $(prop).attr('name')
            }
        }).get();

        return {
            properties: featureTypeProperties
        }
    }


    /*
    Known problematic WFS :
        - https://hazards.fema.gov/gis/nfhl/services/public/NFHL/MapServer/WFSServer
            default SRS is 4269, defined with axis order enu
            1. axis order is wrong with
                - (ver=undefined || ver=2.0) && outputformat=GML3
                - ver=1.1.0 && (outputformat==undefined || outputformat=GML3)
            2. GML uses gml:member
                - ver=undefined (defaults to 2.0) && outputformat=undefined
            3. GML advertises 3.2 namespace even if requesting GML2 if
                - ver=undefined && outputformat=GML2
     */


    OL_HELPERS.withFeatureTypesLayers = function (url, layerProcessor, ftName, map, useGET) {

        var deferredResult = $.Deferred()
        url = OL_HELPERS.cleanOGCUrl(url)
        fetchWFSCapas(
            url,
            function (capas) {

                /* TODO should we have a dedicated WFS parser that handles multiple versions ? */
                var ver = capas.version
                if (ver == "2.0.0")
                    ver = "1.1.0"  // 2.0.0 causes failures in some cases (e.g. Geoserver TOPP States WFS)

                // force GML version to 2.0; GML3 introduces variations in axis order depending on implementations
                var gmlFormatVersion = "GML2";

                var candidates = capas.featureTypes
                if (ftName) candidates = capas.featureTypes.filter(function (ft) {
                    return ft.name == ftName
                })

                var deferredLayers = []

                candidates.forEach(function (candidate, idx) {
                    var deferredLayer = $.Deferred();
                    deferredLayers.push(deferredLayer);

                    fetchWFSFeatureTypeDescr(
                        url,
                        candidate.name, /* TODO deal with WFS that require the prefix to be included : candidate.prefixedName */
                        ver,
                        function (descr) {
                            var ftLayer;

                            // WARN extremely fragile and hackish way to parse FT schema
                            try {
                                var featureTypeProperties = descr.properties;
                                if (featureTypeProperties.length) {

                                    var srs;

                                    var defaultSrs = candidate.defaultSrs
                                    var altSrs = candidate.otherSrs
                                    // all SRSs with default at idx 0
                                    var allSrs = (defaultSrs ? [defaultSrs] : []).concat(altSrs || [])

                                    if (allSrs.length > 0) { // sometimes no srs is found (misusage of DefaultSRS in 2.0 version, ...)

                                        // first look for 4326 projection
                                        if (allSrs.indexOf("EPSG:4326") >= 0)
                                            srs = ol.proj.get("EPSG:4326")
                                        else {
                                            for (var srsIdx = 0, length = allSrs.length; srsIdx < length; srsIdx++) {
                                                if (allSrs[srsIdx].match(/urn:ogc:def:crs:EPSG:.*:4326$/)) {
                                                    srs = ol.proj.get(allSrs[srsIdx])
                                                    break;
                                                }
                                            }
                                        }

                                        if (!srs) {
                                            // look for current map projection in advertised projections
                                            if (map && map.getView().getProjection() && allSrs.indexOf(map.getView().getProjection().getCode()) >= 0)
                                                srs = map.getView().getProjection()

                                            // fallback on layer projection, if supported
                                            else if (window.Proj4js && window.Proj4js.Proj(allSrs[0]))
                                                srs = ol.proj.get(allSrs[0])
                                            else {
                                                srs = searchEPSG(allSrs[0].split(':').pop())
                                            }
                                        }
                                    }

                                    if (!(srs && srs.promise)) {
                                        // let's turn this into a promise
                                        srs = $.Deferred().resolve(srs)
                                    }

                                    srs.then(function (resolvedSrs) {

                                        if (!resolvedSrs) {
                                            // no projection found --> try EPSG:4326 anyway, should be supported
                                            resolvedSrs = ol.proj.get("EPSG:4326")
                                        }

                                        var isLonLat4326 = ol.proj.equivalent(resolvedSrs, OL_HELPERS.EPSG4326);
                                        if (ver != "1.0.0" && resolvedSrs.toString().match(/urn:ogc:def:crs:EPSG:.*:4326$/) ||
                                            resolvedSrs.getCode().startsWith("urn:ogc:def:crs:") && resolvedSrs.getUnits() == "degrees") {
                                            // using long form SRS, assume it is lat/lon axis order
                                            isLonLat4326 = false
                                        }

                                        var geomProps = featureTypeProperties.filter(function (prop, idx) {
                                            return prop.type && prop.type.startsWith("gml");
                                        })

                                        // ignore feature types with no gml prop. Correct ?
                                        if (geomProps && geomProps.length > 0) {

                                            if (useGET) {

                                                var gmlFormat = gmlFormatVersion == 'GML2' ? new ol.format.GML2() : new ol.format.GML3();

                                                if (gmlFormatVersion == 'GML2' && isLonLat4326) {
                                                    // Overload parseCoordinates method to force lon/lat parsing

                                                    /*
                                                     var originalMethod = gmlFormat.readFlatCoordinatesFromNode_;
                                                     gmlFormat.readFlatCoordinatesFromNode_ = function(node, objectStack) {
                                                     // use special lon/lat projection defined above
                                                     objectStack[0]['srsName'] = 'EPSG:4326:LONLAT';
                                                     return originalMethod.call(this, node, objectStack);
                                                     }
                                                     */


                                                    gmlFormat.readGeometryElement = function (node, objectStack) {
                                                        var context = (objectStack[0]);
                                                        if (node.firstElementChild.getAttribute('srsName') == 'http://www.opengis.net/gml/srs/epsg.xml#4326')
                                                            context['srsName'] = 'EPSG:4326:LONLAT';

                                                        var geometry = ol.xml.pushParseAndPop(null,
                                                            this.GEOMETRY_PARSERS_, node, objectStack, this);
                                                        if (geometry) {
                                                            return ol.format.Feature.transformWithOptions(geometry, false, context);
                                                        } else {
                                                            return undefined;
                                                        }
                                                    };

                                                }

                                                var format = new ol.format.WFS({
                                                    //version: ver,
                                                    url: url,
                                                    projection: isLonLat4326 ? OL_HELPERS.EPSG4326_LONLAT : resolvedSrs,
                                                    // If specifying featureType, it is mandatory to also specify featureNS
                                                    // if not, OL will introspect and find all NS and feature types
                                                    //featureType: candidate.name,
                                                    //featureNS: candidate.featureNS,

                                                    gmlFormat: gmlFormat
                                                })


                                                var ftSource = new ol.source.Vector({
                                                    loader: function (extent, resolution, mapProjection) {

                                                        var bbox;
                                                        if (ver != '1.0.0') {
                                                            // let's set the bbox srs explicitly to avoid default behaviours among server impls

                                                            if (ol.proj.equivalent(mapProjection, OL_HELPERS.EPSG4326)
                                                            // apparently 4326 extents from map.view are always in lon/lat already
                                                            //&& mapProjection.getAxisOrientation() == 'enu'
                                                                ) {
                                                                // the current bbox is expressed in lon/lat --> flip axis
                                                                extent = [extent[1], extent[0], extent[3], extent[2]];

                                                                bbox = extent.join(',') + ',' + OL_HELPERS.EPSG4326_LONG.getCode()
                                                            } else {
                                                                bbox = extent.join(',') + ',' + mapProjection.getCode()
                                                            }
                                                        } else {
                                                            bbox = extent.join(',')
                                                        }

                                                        var params = {
                                                            service: 'WFS',
                                                            version: ver,
                                                            request: 'GetFeature',
                                                            maxFeatures: MAX_FEATURES,
                                                            typename: candidate.name, /* TODO deal with WFS that require the prefix to be included : $candidate.prefixedName*/
                                                            srsname: resolvedSrs.getCode(),
                                                            /* explicit SRS must be provided here, as some impl (geoserver)
                                                             take lat/lon axis order by default.
                                                             EPSG:4326 enforces lon/lat order */
                                                            /* TODO check if map proj is compatible with WFS
                                                             some versions/impls need always 4326 bbox
                                                             do on-the-fly reprojection if needed */
                                                            bbox: bbox,
                                                            // some WFS have wrong axis order if GML3
                                                            outputFormat: gmlFormatVersion
                                                        }

                                                        ftLayer.getSource().setState(ol.source.State.LOADING)

                                                        return fetch(url + (url.indexOf('?') >= 0 ? '&' : '?') + kvp2string(params),
                                                            {method:'GET', credentials: 'include'}
                                                        ).then(
                                                            function (response) {
                                                                if (!response.ok)
                                                                    throw "GetFeatures failed: "+response.statusText;
                                                                else
                                                                    return response.text();
                                                            }
                                                        ).then(
                                                            function (text) {
                                                                var features = format.readFeatures(text, {featureProjection: mapProjection, dataProjection: resolvedSrs})
                                                                /* This is no longer needed as axis order is forced to lon/lat in format.GML
                                                                 if (!isLatLon && ol.proj.equivalent(resolvedSrs, OL_HELPERS.EPSG4326)) {
                                                                 // OL3+ only supports xy. --> reverse axis order if not native latLon
                                                                 for (var i = 0; i < features.length; i++) {
                                                                 features[i].getGeometry().applyTransform(function (coords, coords2, stride) {
                                                                 for (var j = 0; j < coords.length; j += stride) {
                                                                 var y = coords[j];
                                                                 var x = coords[j + 1];
                                                                 coords[j] = x;
                                                                 coords[j + 1] = y;
                                                                 }
                                                                 });
                                                                 }
                                                                 }
                                                                 */

                                                                // generate fid from properties hash to avoid multiple insertion of same feature
                                                                // (when max_features strategy is applied and features have no intrisic ID)
                                                                features.forEach(function(feature) {
                                                                    if (feature.getId() === undefined) {
                                                                        var hashkey = new ol.format.GeoJSON().writeFeature(feature).hashCode();
                                                                        feature.setId(hashkey);
                                                                    }
                                                                })

                                                                ftLayer
                                                                    .getSource()
                                                                    .addFeatures(features);

                                                                var moreToLoad = features.length >= MAX_FEATURES;
                                                                ftLayer.getSource().set('partial_load', moreToLoad);

                                                                ftLayer.getSource().setState(ol.source.State.READY);
                                                                return moreToLoad;
                                                            }
                                                        ).catch(function (ex) {
                                                                ftLayer.getSource().setState(ol.source.State.ERROR);
                                                                ftLayer.getSource().set("error", ex);
                                                                console.warn("GetFeatures failed on "+ftLayer.getSource().get('name')+": "+ex);
                                                                console.warn(ex);
                                                            })
                                                    },
                                                    strategy: ol.loadingstrategy.bbox,
                                                    projection: resolvedSrs // is this needed ?
                                                    //maxExtent:
                                                })

                                                ftSource.getFeatureById = function(id) {
                                                    var promise = $.Deferred();

                                                    var params = {
                                                        service: 'WFS',
                                                        version: ver,
                                                        request: 'GetFeature',
                                                        typename: candidate.name, /* TODO deal with WFS that require the prefix to be included : $candidate.prefixedName*/
                                                        featureID: id,
                                                        srsname: resolvedSrs.getCode(),
                                                        outputFormat: gmlFormatVersion
                                                    }

                                                    fetch(url + (url.indexOf('?') >= 0 ? '&' : '?') + kvp2string(params),
                                                        {method:'GET', credentials: 'include'}
                                                    ).then(
                                                        function (response) {
                                                            if (!response.ok)
                                                                throw "GetFeatures failed: "+response.statusText;
                                                            else
                                                                return response.text();
                                                        }
                                                    ).then(
                                                        function (text) {
                                                            var features = format.readFeatures(text, {featureProjection: map.getView().getProjection(), dataProjection: resolvedSrs})

                                                            // generate fid from properties hash to avoid multiple insertion of same feature
                                                            // (when max_features strategy is applied and features have no intrisic ID)
                                                            features.forEach(function(feature) {
                                                                if (feature.getId() === undefined) {
                                                                    var hashkey = new ol.format.GeoJSON().writeFeature(feature).hashCode();
                                                                    feature.setId(hashkey);
                                                                }
                                                            })

                                                            if (features.length == 1)
                                                                promise.resolve(features[0]);
                                                            else
                                                                promise.reject("Wrong number of features: "+features.length);
                                                        }
                                                    ).catch(function (ex) {
                                                            console.warn("GetFeatureById failed on "+ftLayer.getSource().get('name')+" / "+id+" : "+ex);
                                                            console.warn(ex);
                                                            promise.reject(ex);
                                                        })

                                                    return promise;
                                                }

                                                ftLayer = new ol.layer.Vector({
                                                    title: candidate.title,
                                                    source: ftSource,
                                                    visible: idx == 0
                                                });
                                                // override getExtent to take advertised bbox into account first
                                                ftLayer.getSource().set('name', candidate.name);
                                                ftLayer.getSource().set('ftDescr', candidate);
                                                ftLayer.getSource().getFullExtent = getFTSourceExtent;

                                            } else {

                                                /* TODO_OL4 implement POST
                                                 ftLayer = new OpenLayers.Layer.WFSLayer(
                                                 candidate.name, {
                                                 styleMap: defaultStyleMap,
                                                 ftDescr: candidate,
                                                 title: candidate.title,
                                                 strategies: [new OpenLayers.Strategy.BBOXWithMax({maxFeatures: MAX_FEATURES, ratio: 1})],
                                                 projection: resolvedSrs,
                                                 visibility: idx == 0,
                                                 protocol: new OpenLayers.Protocol.WFS({
                                                 //headers: {"Content-Type": "application/xml; charset=UTF-8"}, // (failed) attempt at dealing with accentuated chars in some feature types
                                                 version: ver,
                                                 url: url,
                                                 featureType: candidate.name,
                                                 srsName: resolvedSrs,
                                                 //featurePrefix: descr.targetPrefix,
                                                 featureNS: descr.targetNamespace,
                                                 maxFeatures: MAX_FEATURES,
                                                 formatOptions : {
                                                 xy: !isLatLon
                                                 },
                                                 geometryName: $(geomProps[0]).attr('name'),
                                                 //outputFormat: "GML2"  // enforce GML2, as GML3 uses lat/long axis order and discrepancies may exists between implementations (to be verified)
                                                 })
                                                 })
                                                 */

                                                throw "Not Implemented";
                                            }

                                            layerProcessor(ftLayer)
                                        }

                                    })
                                }

                                deferredLayer.resolve(ftLayer)
                            } catch (err) {
                                deferredLayer.reject(err)
                            }
                        },
                        function(err) {
                            deferredLayer.reject(err)
                        }
                    )
                })

                $.when.apply($, deferredLayers).then(function() {
                    deferredResult.resolve(deferredLayers)
                })

            },
            // failure callback
            function(err) {
                deferredResult.reject(err);
            }
        )

        return deferredResult;
    }




    OL_HELPERS.withWFS3Types = function (proxyUri, layerProcessor, ftName, map, proxifyFn) {

        var deferredResult = $.Deferred()

        var openAPIclient = new SwaggerClient(
            proxyUri,
            {requestInterceptor:
                proxifyFn && function(req) {
                    req.url = proxifyFn(req.url);
                    return req;
                },

            responseInterceptor:
                function(resp) {
                    if (resp.body && !resp.body.servers) {
                        // hack to deal with servers not returning servers block
                        var serverUrl = decodeURIComponent(OL_HELPERS.parseURL(proxyUri).query._uri);
                        var apiIdx = serverUrl.indexOf("/api");
                        serverUrl = serverUrl.substring(0, apiIdx);
                        resp.body.servers = [{
                            url: serverUrl
                        }]
                    }
                    return resp;
                }
            })
            .then (function(openAPIclient) {

                openAPIclient.apis.Capabilities.describeCollections({f: 'json'}).then(
                    function (capas) {


                        var candidates = capas.obj.collections
                        if (ftName) candidates = capas.featureTypes.filter(function (ft) {
                            return ft.name == ftName
                        })

                        var deferredLayers = []

                        candidates.forEach(function (candidate, idx) {
                            if (!candidate.name)
                                candidate.name = candidate.collectionId;

                            var deferredLayer = $.Deferred();
                            deferredLayers.push(deferredLayer);

                            var geojsonFormat = new ol.format.GeoJSON({
                                // avoid collision with potential geojson properties named 'geometry'
                                // cf https://stackoverflow.com/questions/32746143/geojson-with-a-geometry-property-in-ol3
                                geometryName: OL_HELPERS.FEATURE_GEOM_PROP,
                                defaultDataProjection: OL_HELPERS.EPSG4326
                            });

                            var ftSource = new ol.source.Vector({
                                loader: function (extent, resolution, mapProjection) {

                                    var bbox4326 = ol.proj.transformExtent(extent, mapProjection, OL_HELPERS.EPSG4326)

                                    var params = {
                                        f: 'json',
                                        count: MAX_FEATURES,
                                        bbox: bbox4326.join(',')
                                    }

                                    this.setState(ol.source.State.LOADING);
                                    var getOpName = openAPIclient.spec.paths['/'+candidate.name].get.operationId;
                                    return openAPIclient.apis.Features[getOpName](params).then(
                                        function (result) {
                                            if (result.parseError) {
                                                throw "Parse Error: "+result.parseError.message;
                                            }
                                            // make sure we have IDs for every feature
                                            result.obj.features.forEach(function(jsonFeature) {
                                                if (jsonFeature.id === undefined) {
                                                    if (jsonFeature.ID) {
                                                        jsonFeature.id = jsonFeature.ID;
                                                    } else {
                                                        // generate fid from properties hash to avoid multiple insertion of same feature
                                                        // (when max_features strategy is applied and features have no intrisic ID)
                                                        var hashkey = JSON.stringify(jsonFeature);
                                                        jsonFeature.id = hashkey;
                                                    }
                                                }
                                            })

                                            var features = geojsonFormat.readFeatures(
                                                    result.obj || [], // content is undefined when no result (?!)
                                                {featureProjection: mapProjection,
                                                    dataProjection: OL_HELPERS.EPSG4326})

                                            ftLayer
                                                .getSource()
                                                .addFeatures(features);

                                            var moreToLoad = features.length >= MAX_FEATURES;
                                            ftLayer.getSource().set('partial_load', moreToLoad);
                                            ftLayer.getSource().setState(ol.source.State.READY);

                                            return moreToLoad
                                        }
                                    ).catch(function (ex) {
                                            ftLayer.getSource().setState(ol.source.State.ERROR);
                                            ftLayer.getSource().set("error", ex);
                                            console.warn("GetFeatures failed on "+ftLayer.getSource().get('name')+": "+ex);
                                        })
                                },
                                strategy: ol.loadingstrategy.bbox
                            })

                            ftSource.getFeatureById = function(id) {
                                var getFeatureByIdOpName = openAPIclient.spec.paths['/'+candidate.name+'/{id}'].get.operationId;
                                var promise = $.Deferred();
                                // try both the 'Features' and 'Feature' tags. Not sure which one is correct, check the spec.
                                (openAPIclient.apis.Features[getFeatureByIdOpName] || openAPIclient.apis.Feature[getFeatureByIdOpName]) ({id: id, f: 'json'}).then(
                                    function (result) {
                                        if (result.parseError) {
                                            throw "Parse Error: "+result.parseError.message;
                                        }

                                        if (!result.obj.type == 'FeatureCollection' || result.obj.features ) {
                                            if (!result.obj.features)
                                                throw "Results advertised as FeatureCollection, but not containing a 'features' array"
                                            result.obj = result.obj.features[0];
                                        }

                                        // make sure we have IDs for every feature
                                        if (result.obj.id === undefined && result.obj.ID)
                                            result.obj.id = result.obj.ID;

                                        var features = geojsonFormat.readFeatures(
                                                result.obj || [], // content is undefined when no result (?!)
                                            {featureProjection: map.getView().getProjection(),
                                                dataProjection: OL_HELPERS.EPSG4326})

                                        promise.resolve(features.length>0 && features[0]);
                                    }
                                ).catch(function (ex) {
                                        console.warn("GetFeatureById failed on "+ftLayer.getSource().get('name')+" / "+id+" : "+ex);
                                        promise.reject(ex);
                                    })

                                return promise;
                            }

                            var ftLayer = new ol.layer.Vector({
                                title: candidate.title,
                                source: ftSource,
                                visible: idx == 0
                            });
                            // override getExtent to take advertised bbox into account first
                            ftLayer.getSource().set('name', candidate.name);
                            ftLayer.getSource().set('ftDescr', candidate);
                            ftLayer.getSource().getFullExtent = getFT3SourceExtent;

                            layerProcessor(ftLayer);

                            deferredLayer.resolve(ftLayer);
                        })

                        $.when.apply($, deferredLayers).then(function() {
                            deferredResult.resolve(deferredLayers)
                        })

                    },
                    // failure callback
                    function(err) {
                        deferredResult.reject(err);
                    }
                )
            }).catch(function(err) {
                deferredResult.reject(err);
            })

        return deferredResult;
    }




    OL_HELPERS.withWMSLayers = function (capaUrl, getMapUrl, layerProcessor, layerName, useTiling, map) {

        var deferredResult = $.Deferred()

        capaUrl = OL_HELPERS.cleanOGCUrl(capaUrl)
        getMapUrl = OL_HELPERS.cleanOGCUrl(getMapUrl)


        parseWMSCapas(
            capaUrl,
            function (capas) {

                var ver = capas.version

                var deferredLayers = []

                var isFirst = true;
                var processLayerCandidate = function (candidate) {

                    if (candidate.Name && (!layerName || candidate.Name == layerName)) {
                        var deferredLayer = $.Deferred()
                        deferredLayers.push(deferredLayer)

                        try {
                            var mapLayer;
                            if (useTiling) {
                                mapLayer = new ol.layer.Tile({
                                    title: candidate.Title || candidate.Name,
                                    visible: isFirst,
                                    //extent: ,
                                    source: new ol.source.TileWMS({
                                        url: getMapUrl,
                                        params: {LAYERS: candidate.Name,
                                            TRANSPARENT: true,
                                            VERSION: ver,
                                            EXCEPTIONS: "INIMAGE"}
                                    })
                                })
                            } else {
                                mapLayer = new ol.layer.Image({
                                    title: candidate.Name,
                                    visible: isFirst,
                                    //extent: ,
                                    source: new ol.source.ImageWMS({
                                        url: getMapUrl,
                                        params: {LAYERS: candidate.Name,
                                            TRANSPARENT: true,
                                            VERSION: ver,
                                            EXCEPTIONS: "INIMAGE"},
                                        ratio: 1
                                    })
                                })
                            }
                            isFirst = false;

                            mapLayer.getSource().set('name', candidate.Name);
                            mapLayer.getSource().set('mlDescr', candidate);
                            mapLayer.getSource().getFullExtent = getWMSSourceExtent;

                            layerProcessor(mapLayer)

                            deferredLayer.resolve(mapLayer)
                        } catch (err) {
                            deferredLayer.reject(err)
                        }
                    } else if (candidate.Layer) {
                        // layer contains nested layers

                        //TODO create layer groups in switcher

                        $_.each(candidate.Layer, processLayerCandidate)
                    }

                }

                $_.each(capas.Capability.Layer.Layer, processLayerCandidate)

                $.when.apply($, deferredLayers).then(
                    function() {
                        deferredResult.resolve(deferredLayers)
                    },
                    function(err) {
                        deferredResult.reject(err)
                    }
                )
            },
            // failure callback
            function(err) {
                deferredResult.reject(err);
            }
        )

        return deferredResult;

    }


    OL_HELPERS.withWMTSLayers = function (capaUrl, layerProcessor, layerName, projection, resolutions) {

        var deferredResult = $.Deferred()

        capaUrl = OL_HELPERS.cleanOGCUrl(capaUrl)

        OL_HELPERS.parseWMTSCapas(
            capaUrl,
            function (capas) {

                var candidates = capas['Contents']['Layer']
                if (layerName) candidates = candidates.filter(function (layer) {
                    return layer['Identifier'] == layerName
                })

                var ver = capas.version

                var deferredLayers = []

                $_.each(candidates, function (candidate, idx) {
                    var deferredLayer = $.Deferred()
                    deferredLayers.push(deferredLayer)

                    try {
                        var params = {
                            layer: candidate['Identifier']
                        };
                        // WMTS.optionsFromCapabilities does not accept undefined projection value in its params
                        if (projection)
                            params.projection = projection

                        var options = ol.source.WMTS.optionsFromCapabilities(capas, params);

                        var mapLayer = new ol.layer.Tile({
                            title: candidate['Title'],
                            visible: idx == 0,
                            source: new ol.source.WMTS(options)
                        })

                        if (candidate.Dimension && candidate.Dimension.length > 0) {
                            var urlTemplate = candidate['ResourceURL'] && candidate['ResourceURL'].length > 0 && candidate['ResourceURL'][0].template;
                            var urlParams = urlTemplate && urlTemplate.match(/\{(\w+?)\}/g);

                            var dimensions = {};
                            for (var idx = 0; idx < candidate.Dimension.length; idx++) {
                                var dim = candidate.Dimension[idx];
                                var id = dim['Identifier'];
                                // look for a case insensitive match (OL is case sensitive in that respect, some capabilities not)
                                for (var idx in urlParams) {
                                    var paramName = urlParams[idx].substring(1, urlParams[idx].length - 1);
                                    if (paramName.toLowerCase() == id) {
                                        id = paramName;
                                        break;
                                    }
                                }
                                dimensions[id] = dim['Default']
                            }
                            mapLayer.getSource().updateDimensions(dimensions);
                        }

                        mapLayer.getSource().set('name', candidate.Identifier);
                        mapLayer.getSource().set('mlDescr', candidate);
                        mapLayer.getSource().getFullExtent = getWMTSSourceExtent;

                        layerProcessor(mapLayer)

                        deferredLayer.resolve(mapLayer)
                    } catch (err) {
                        deferredLayer.reject(err)
                    }
                })

                $.when.apply($, deferredLayers).then(function() {
                    deferredResult.resolve(deferredLayers)
                })

            },
            // failure callback
            function(err) {
                deferredResult.reject(err);
            }
        )

        return deferredResult;

    }



    OL_HELPERS.createGeoJSONLayer = function (url) {

        var geojsonFormat = new ol.format.GeoJSON({
            // avoid collision with potential geojson properties named 'geometry'
            // cf https://stackoverflow.com/questions/32746143/geojson-with-a-geometry-property-in-ol3
            geometryName: OL_HELPERS.FEATURE_GEOM_PROP,
            defaultDataProjection: OL_HELPERS.EPSG4326
        });

        var success = function(features, dataProjection) {
            geojson.getSource().addFeatures(features);
            // set source as ready once features are loaded
            geojson.getSource().set('waitingOnFirstData', false)
            geojson.getSource().setState(ol.source.State.READY);
        }

        // use a custom loader to set source state
        var geojsonLoader =
            function(extent, resolution, projection) {

                $.ajax({url: geojson.getSource().url, dataType: 'json', success: function(response) {
                    if (!response || response.error) {
                        //TODO
                    } else {
                        var source = response

                        if (response.links) {
                            var nextLink = response.links.find(function(link) {return link.rel == 'next' });
                            if (nextLink && nextLink.href) {
                                geojson.getSource().set('partial_load', true);
                                geojson.getSource().set('next_page', nextLink.href);
                            }
                        }

                        var features = geojsonFormat.readFeatures(source,
                            {featureProjection: projection})
                        var sourceProjection = geojsonFormat.readProjection(source)
                        success.call(this, features, sourceProjection);
                    }
                }});
            }

        var geojson = new ol.layer.Vector({
            title: 'GeoJSON',
            source: new ol.source.Vector({
                loader: function(extent, resolution, projection) {
                    // set source as loading before reading the GeoJSON
                    this.setState(ol.source.State.LOADING);
                    return geojsonLoader.call(this, extent, resolution, projection)
                },
                format: geojsonFormat
            })
        });
        geojson.getSource().url = url;
        geojson.getSource().nextPage = function() {
            if (this.get('next_page')) {
                this.url = this.get('next_page');
                //TODO must find a way to append features
                geojson.getSource().clear();
            }
        };


        geojson.getSource().set('waitingOnFirstData', true);

        return geojson;
    }

    /* TODO_OL4 */
    OL_HELPERS.createEsriGeoJSONLayer = function (url) {

        var esrijson = new OpenLayers.Layer.Vector(
            "Esri GeoJSON",
            {
                styleMap: OL_HELPERS.DEFAULT_STYLEMAP,
                projection: EPSG4326,
                strategies: [new OpenLayers.Strategy.Fixed()],
                style: default_style,
                protocol: new OpenLayers.Protocol.Script({
                    url: url, //ArcGIS Server REST GeoJSON output url
                    format: new OpenLayers.Format.EsriGeoJSON(),
                    parseFeatures: function (data) {
                        return this.format.read(data);
                    }
                })
            });

        return esrijson
    }

    OL_HELPERS.withArcGisLayers = function (url, layerProcessor, layerName, layerBaseUrl, map) {

        var deferredResult = $.Deferred()

        var deferredLayers = []

        parseArcGisDescriptor(
            url,
            function (descriptor) {

                if (descriptor.type == "Feature Layer") {
                    var deferredLayer = $.Deferred();
                    deferredLayers.push(deferredLayer);
                    var newLayer = OL_HELPERS.createArcgisFeatureLayer((layerBaseUrl || url) + "/query", descriptor, true, map)
                    layerProcessor(newLayer);

                    deferredLayer.resolve(newLayer);
                } else if (descriptor.type == "Group Layer") {
                    // TODO intermediate layer
                } else if (!descriptor.type && descriptor.layers) {
                    var isFirst = true
                    $_.each(descriptor.layers, function (layer, idx) {
                        var deferredLayer = $.Deferred();
                        deferredLayers.push(deferredLayer);
                        if (!layer.subLayerIds) {
                            var newLayer = OL_HELPERS.createArcgisFeatureLayer((layerBaseUrl || url) + "/" + layer.id + "/query", layer, isFirst, map)
                            layerProcessor(newLayer)
                            isFirst = false;
                            deferredLayer.resolve(newLayer);
                        }
                    })
                }

                $.when.apply($, deferredLayers).then(function() {
                    deferredResult.resolve(deferredLayers)
                })

            }
        )
        //TODO catch and reject

        return deferredResult
    }


    OL_HELPERS.createArcgisFeatureLayer = function (url, descriptor, visible, map) {

        var format = new ol.format.EsriJSON();

        var defaultQueryParams = {
            "dummy" : 1,
            "geometryType" : "esriGeometryEnvelope",
            "inSR" : "4326",
            "spatialRel" : "esriSpatialRelIntersects",
            "outFields" : "*",
            "outSR" : "4326",
            "returnGeometry" : true,
            "returnIdsOnly" : false,
            "returnCountOnly" : false,
            "returnZ" : false,
            "returnM" : false,
            "returnDistinctValues" : false,
            "f" : "pjson"
        }

        var layer = new ol.layer.Vector({
            title: descriptor.name,
            source: new ol.source.Vector({
                loader: function (extent, resolution, mapProjection) {
                    var outSrs = OL_HELPERS.EPSG4326;

                    var queryParams = _.extend(
                        {},
                        defaultQueryParams,
                        {
                            "geometry" : extent.join(','),
                            "inSR" : mapProjection.getCode().split(':').pop(),
                            "outSR" : outSrs.getCode().split(':').pop()
                        }
                    )

                    layer.getSource().setState(ol.source.State.LOADING)

                    return fetch(url + (url.indexOf('?') >= 0 ? '&' : '?') + kvp2string(queryParams),
                        {method:'GET', credentials: 'include'}
                    ).then(
                        function (response) {
                            return response.text();
                        }
                    ).then(
                        function (text) {

                            var features = format.readFeatures(text, {featureProjection: mapProjection, dataProjection: outSrs});

                            // generate fid from properties hash to avoid multiple insertion of same feature
                            // (when max_features strategy is applied and features have no intrisic ID)
                            features.forEach(function(feature) {
                                if (feature.getId() === undefined) {
                                    if (feature.get("OBJECTID"))
                                        feature.setId(feature.get("OBJECTID"));
                                    else {
                                        var hashkey = new ol.format.GeoJSON().writeFeature(feature).hashCode();
                                        feature.setId(hashkey);
                                    }
                                }
                            })

                            layer
                                .getSource()
                                .addFeatures(features);

                            var moreToLoad = features.length >= MAX_FEATURES;
                            layer.getSource().set('partial_load', moreToLoad);
                            layer.getSource().setState(ol.source.State.READY);

                            return moreToLoad
                        }
                    ).catch(function (ex) {
                            layer.getSource().setState(ol.source.State.ERROR);
                            console.warn("ArcGIS GetFeatures failed");
                            console.warn(ex);
                        })
                },
                strategy: ol.loadingstrategy.bbox
            }),
            visible : visible
        });


        layer.getSource().getFeatureById = function(id) {


            var outSrs = OL_HELPERS.EPSG4326;

            var queryParams = _.extend(
                {},
                defaultQueryParams,
                {
                    "objectIds" : [id],
                    "inSR" : map.getView().getProjection().getCode().split(':').pop(),
                    "outSR" : outSrs.getCode().split(':').pop()
                }
            )

            var promise = $.Deferred();


            fetch(url + (url.indexOf('?') >= 0 ? '&' : '?') + kvp2string(queryParams),
                {method:'GET', credentials: 'include'}
            ).then(
                function (response) {
                    return response.text();
                }
            ).then(
                function (text) {

                    var features = format.readFeatures(text, {featureProjection: map.getView().getProjection(),
                        dataProjection: OL_HELPERS.EPSG4326});

                    // generate fid from properties hash to avoid multiple insertion of same feature
                    // (when max_features strategy is applied and features have no intrisic ID)
                    features.forEach(function(feature) {
                        if (feature.get("OBJECTID"))
                            feature.setId(feature.get("OBJECTID"));
                        else {
                            var hashkey = new ol.format.GeoJSON().writeFeature(feature).hashCode();
                            feature.setId(hashkey);
                        }
                    })

                    promise.resolve(features.length>0 && features[0]);
                }
            ).catch(function (ex) {
                    console.warn("GetFeatureById failed on "+layer.getSource().get('name')+" / "+id+" : "+ex);
                    console.warn(ex);
                    promise.reject(ex);
                })

            return promise;
        }


        if (!descriptor.bounds && descriptor.extent) {
            var ext = [
                descriptor.extent.xmin,
                descriptor.extent.ymin,
                descriptor.extent.xmax,
                descriptor.extent.ymax
            ];
            // take advertised srs; 4326 if none
            var srs = 'EPSG:'+ (descriptor.extent.spatialReference ? descriptor.extent.spatialReference.wkid : 4326);
            descriptor.bounds = ol.proj.transformExtent(ext, ol.proj.get(srs), ol.proj.get('EPSG:4326'));
        }

        layer.getSource().set('name', descriptor.name);
        layer.getSource().set('arcgisDescr', descriptor);
        // override getExtent to take advertised bbox into account first
        layer.getSource().getFullExtent = getArcGISVectorExtent;

        return layer;
    }


    OL_HELPERS.createLayerFromConfig = function(mapConfig, isBaseLayer, callback) {
        var urls;
        var attribution;


        if (! mapConfig.type) {
            urls = 'http://tile.openstreetmap.org/{z}/{x}/{y}.png';
            var baseMapLayer = new ol.layer.Tile(
                {title: 'OSM',
                    type: isBaseLayer?'base':undefined, // necessary for ol3-layerswitcher
                    source:new ol.source.OSM({
                        url: urls,
                        attributions: 'Map tiles & Data by OpenStreetMap, under CC BY SA.'
                    })
                });

            callback (baseMapLayer);
        } else if (mapConfig.type.toLowerCase() == 'osm') {
            urls = mapConfig['url'];

            var baseMapLayer = new ol.layer.Tile(
                {title: mapConfig['title'] || 'OSM',
                    type: isBaseLayer?'base':undefined, // necessary for ol3-layerswitcher
                    source:new ol.source.OSM({
                        url: urls,
                        /* TODO
                       attribution: mapConfig.attribution
                       */
                    })
                });

            callback (baseMapLayer);

        } else if (mapConfig.type.toLowerCase() == 'stamen') {
            var layer = mapConfig['layer'] || 'watercolor';
            var baseMapLayer = new ol.layer.Tile({
                title: mapConfig['title'] || 'stamen',
                type: isBaseLayer?'base':undefined, // necessary for ol3-layerswitcher
                source: new ol.source.Stamen({
                    layer: layer,
                    attributions: 'Map tiles by <a href="http://stamen.com">Stamen Design</a> (<a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>). Data by <a href="http://openstreetmap.org">OpenStreetMap</a> (<a href="http://creativecommons.org/licenses/by-sa/3.0">CC BY SA</a>)'
                })
            });

            callback (baseMapLayer);

        } else if (mapConfig.type == 'tms') {

            urls = mapConfig['url'];
            if (!urls)
                throw 'TMS URL must be set when using TMS Map type';
            var projection = mapConfig['srs'] ? ol.proj.get(mapConfig['srs']) : OL_HELPERS.Mercator
            var extent = mapConfig['extent'] && eval(mapConfig['extent'])

            var resolutions = mapConfig['resolutions'] && eval(mapConfig['resolutions'])

            var tileGrid = resolutions && new ol.tilegrid.TileGrid({
                extent: extent,
                resolutions: resolutions,
                //origin: [extent[0], extent[1]],
                tileSize: [256, 256]
            });

            var layerName = mapConfig['layername'];
            var baseMapLayer = new ol.layer.Tile({
                title: mapConfig['title'],
                type: isBaseLayer?'base':undefined,
                extent: extent,
                source: new ol.source.XYZ({
                    projection: projection,
                    tileGrid: tileGrid,
                    //tilePixelRatio: tilePixelRatio,
                    url: urls + '/1.0.0/' + layerName + '/{z}/{x}/{-y}.png'
                })
            });

            callback (baseMapLayer);
        }  else if (mapConfig.type == 'XYZ') {
            // Custom XYZ layer
            urls = mapConfig['url'];
            if (!urls)
                throw 'URL must be set when using XYZ type';

            var baseMapLayer = new ol.layer.Tile(
                {title: mapConfig['title'],
                 type: isBaseLayer?'base':undefined, // necessary for ol3-layerswitcher
                 source:new ol.source.XYZ({
                    url: urls,
                     /* TODO
                    attribution: mapConfig.attribution
                    */
                })
            });

            callback (baseMapLayer);
        }  else if (mapConfig.type == 'wmts') {

            OL_HELPERS.withWMTSLayers(
                mapConfig['url'],
                function(layer) {
                    layer.set('type', 'base');
                    mapConfig['dimensions'] && layer.getSource().updateDimensions(mapConfig['dimensions']);
                    mapConfig['title'] && layer.set('title', mapConfig['title']);
                    /* TODO
                    layer.options.attribution = mapConfig.attribution
*/
                    callback (layer);
                },
                mapConfig['layer'],
                mapConfig['srs'],
                mapConfig['resolutions'] && eval(mapConfig['resolutions'])
            )

        } else if (mapConfig.type == 'wms') {
            urls = mapConfig['url'];
            if (!urls)
                throw 'WMS URL must be set when using WMS Map type';

            var useTiling = mapConfig['useTiling'] === undefined || mapConfig['useTiling']


            var baseMapLayer;

            if (useTiling) {
                baseMapLayer = new ol.layer.Tile({
                    type: isBaseLayer?'base':undefined,
                    title: mapConfig['layer'],
                    visible: true,
                    extent: mapConfig['extent'] && eval(mapConfig['extent']),  /* TODO_OL4 this correct to set maxExtent ? */
                    source: new ol.source.TileWMS({
                        url: urls,
                        params: {layers: mapConfig['layer'],
                            TRANSPARENT: false,
                            EXCEPTIONS: "INIMAGE"},
                        projection: mapConfig['srs'] ? ol.proj.get(mapConfig['srs']) : OL_HELPERS.EPSG4326
                    })
                })
            } else {
                baseMapLayer = new ol.layer.Image({
                    type: isBaseLayer?'base':undefined,
                    title: mapConfig['layer'],
                    visible: true,
                    extent: mapConfig['extent'] && eval(mapConfig['extent']),  /* TODO_OL4 this correct to set maxExtent ? */
                    source: new ol.source.ImageWMS({
                        url: urls,
                        params: {LAYERS: mapConfig['layer'],
                            TRANSPARENT: false,
                            EXCEPTIONS: "INIMAGE"},
                        ratio : 1,
                        projection: mapConfig['srs'] ? ol.proj.get(mapConfig['srs']) : OL_HELPERS.EPSG4326,
                    })
                })
            }
            callback (baseMapLayer);

        } else {
            throw "Unknown basemap type: "+ mapConfig.type;
        }



    }


    OL_HELPERS.SUPPORTED_MIME_TYPES = {
        'kml': 'application/vnd.google-earth.kml+xml',
        'gml': 'application/gml+xml',
        'wms': 'application/vnd.ogc.wms_xml',
        'wfs': 'application/vnd.ogc.wfs_xml',
        'wfs3': 'application/vnd.ogc.wfs3',
        'gpkg': 'application/vnd.opengeospatial.geopackage+sqlite3',
        'wmts': 'service/wmts',
        'arcgis_rest': 'application/vnd.esri.arcgis.rest',
        'geojson' : 'application/geo+json',
        'json' : 'application/json'
    };

    /**
     * Adds layers from a URL to a map
     * @param map map to add layers to
     * @param url url of the layer(s) resource
     * @param mimetype mime type of the URL
     * @param proxifyFn optional fn to proxify URLs if needed and work around cross-domain issues; takes 2 arguments : url and boolean isImageUrl
     * @param addLayerCallback callback to be called to add the layer to the map; must return a promise resolved when layer is added
     */
    OL_HELPERS.addLayersFromUrl = function(map, url, mimeType, proxifyFn, addLayerCallback) {

        /*
         mimeType = mimeType || _this.guessMimeType(uri)
         var proxyUri = FRAGVIZ.UTILS.proxifyUrl(uri)
         */


        /*
         var layers = _this.mapLayers = []
         var layerAdder = function (layer) {
         layer.set('isResourceLayer', true); // mark layer as part of displayedResource
         layers.push(layer)
         return map.addLayerWithExtent(layer)

         //if (_this.annotationLayer)
         //    map.setLayerIndex(_this.annotationLayer, map.getNumLayers());
         }
         */
        var layerAdder = addLayerCallback || function (layer) {
            return map.addLayerWithExtent(layer);
        }


        var deferredResult = $.Deferred()

        // default proxifyFn is to return URL as is
        proxifyFn = proxifyFn || function(url) {return url;}
        var proxyUri = proxifyFn(url);

        //TODO implement done and fail for synchronous calls too
        if (OL_HELPERS.SUPPORTED_MIME_TYPES['kml'] == mimeType) {
            return layerAdder(OL_HELPERS.createKMLLayer(proxyUri));
        } else if (OL_HELPERS.SUPPORTED_MIME_TYPES["gml"] == mimeType) {
            return layerAdder(OL_HELPERS.createGMLLayer(proxyUri));
        } else if (OL_HELPERS.SUPPORTED_MIME_TYPES["geojson"] == mimeType || OL_HELPERS.SUPPORTED_MIME_TYPES["json"] == mimeType) {
            return layerAdder(OL_HELPERS.createGeoJSONLayer(proxyUri));
        } /*else if (FRAGVIZ.UTILS.MIME.getExtensionMimeType("esri_geojson") == mimeType) {
         return layerAdder(OL_HELPERS.createEsriGeoJSONLayer(proxyUri))
         } */ else if (OL_HELPERS.SUPPORTED_MIME_TYPES["wms"] == mimeType) {
            return OL_HELPERS.withWMSLayers(proxyUri, proxifyFn(url, true), layerAdder, undefined /*layername*/, true/*useTiling*/, map)
        } else if (OL_HELPERS.SUPPORTED_MIME_TYPES["wmts"] == mimeType) {
            return OL_HELPERS.withWMTSLayers(proxyUri, layerAdder, undefined /*layername*/, undefined/*projection*/, undefined /*resolution*/);
        } else if (OL_HELPERS.SUPPORTED_MIME_TYPES["wfs"] == mimeType) {
            return OL_HELPERS.withFeatureTypesLayers(proxyUri, layerAdder, undefined /*FTname*/, map, true /* useGET */);
        } else if (OL_HELPERS.SUPPORTED_MIME_TYPES["arcgis_rest"] == mimeType) {
            return OL_HELPERS.withArcGisLayers(proxyUri, layerAdder, undefined, undefined, map);
        } else if (OL_HELPERS.SUPPORTED_MIME_TYPES["wfs3"] == mimeType) {
            return OL_HELPERS.withWFS3Types(proxyUri, layerAdder, undefined, map, proxifyFn);
        } else if (OL_HELPERS.SUPPORTED_MIME_TYPES["gpkg"] == mimeType) {
            return OL_HELPERS.withGeoPackageLayers(proxyUri, layerAdder, undefined, map, proxifyFn);
        }

        return deferredResult;
    }



    /**
     * Convenient code to create a map with default widgets
     * config ::= {
     *      container : [ cssSelector | element ]
     *      featureInfoPopup : [true | false | FeatureInfoOverlay],
     *      featureDetailsControl : [true | false | FeatureDetailsControl],
     *      layerSwitcher : [true | false | HilatsLayerSwitcher],
     *      styleMap: [undefined | style map with optional 'selected', 'highlight' keys ]
     *      baseMapLayer
     * }
     * @param config
     */
    OL_HELPERS.createMap = function(config) {

        var container = typeof config.container == "string" ?
            $(config.container)[0] :
            config.container

        if (!container)
            throw "Container not found: " + config.container;

        var baseMapLayer = config.baseMapLayer;

        // set up featureDetailsControl
        var featureDetailsControl = undefined;
        if (typeof config.featureDetailsControl == "object")
            featureDetailsControl = config.featureDetailsControl
        else if (config.featureDetailsControl === true)
            featureDetailsControl = new OL_HELPERS.FeatureDetailsControl()

        // set up dataPopupOverlay
        var dataPopupOverlay = undefined;
        if (typeof config.featureInfoPopup == "object")
            dataPopupOverlay = config.featureInfoPopup
        else if (config.featureInfoPopup === true)
            dataPopupOverlay = new OL_HELPERS.FeatureInfoOverlay({
                element: $("<div class='ol-feature-popup'><div class='popupContent'></div></div>")[0],
                autoPan: false,
                offset: [5,5],
                showDetails: false
            })

        // set up layerSwitcher
        var layerSwitcher = undefined;
        if (typeof config.layerSwitcher == "object")
            layerSwitcher = config.layerSwitcher
        else if (config.layerSwitcher === true)
            layerSwitcher = new ol.control.HilatsLayerSwitcher()

        var controls = [
            new ol.control.ZoomSlider(),
            new ol.control.MousePosition()
        ]
        layerSwitcher && controls.push(layerSwitcher);
        featureDetailsControl && controls.push(featureDetailsControl);

        var options = {
            target: container,
            layers: [baseMapLayer],
            controls: controls,
            //fractionalZoom: true

            loadingDiv: false,
            overlays: dataPopupOverlay ? [dataPopupOverlay] : undefined,
            view: new ol.View({
                // projection attr should be set when creating a baselayer
                projection: baseMapLayer.getSource().getProjection() || OL_HELPERS.Mercator,
                extent: baseMapLayer.getExtent(),
                //center: [0,0],
                //zoom: 4
            }),
            loadingListener: layerSwitcher && _.bind(layerSwitcher.isLoading, layerSwitcher)
        }

        var map = new OL_HELPERS.LoggingMap(options);
        // by default stretch the map to the basemap extent or to the world
        map.getView().fit(
            baseMapLayer.getExtent() || ol.proj.transformExtent(OL_HELPERS.WORLD_BBOX, OL_HELPERS.EPSG4326, map.getView().getProjection()),
            {constrainResolution: false}
        );


        map.featureDetailsControl = featureDetailsControl;
        map.layerSwitcher = layerSwitcher;
        map.dataPopupOverlay = dataPopupOverlay;
        map.styleMap = config.styleMap || OL_HELPERS.DEFAULT_STYLEMAP;

        // Add a feature selection interaction
        if (featureDetailsControl) {
            var featureSelector = map.featureSelector = new ol.interaction.Select({
                multi: true,
                condition: ol.events.condition.click,
                style: function (feature, resolution) {
                    return map.styleMap && map.styleMap.selected;
                },
                filter: function (feature, layer) {
                    return layer != null // exclude unmanaged layers
                        && feature.get('type') != 'capture'
                }
            });
            map.addInteraction(featureSelector);
            featureSelector.on('select', function (evt) {
                map.featureDetailsControl.setFeatures(featureSelector.getFeatures());
            })
        }


        // Add a feature hover interaction
        var highlighter = new ol.interaction.Select({
            style: function(feature, resolution) {
                return map.styleMap && map.styleMap.highlight;
            },
            toggleCondition : function(evt) {return false},
            multi: true,
            condition: ol.events.condition.pointerMove
        });
        highlighter.on('select', function(evt) {
            var hit = highlighter.getFeatures().getLength();
            $(map.getTarget()).css("cursor", hit ? 'pointer' : '');
        })
        map.addInteraction(highlighter);


        // force a reload of all vector sources on projection change
        map.getView().on('change:projection', function() {
            map.getLayers().forEach(function(layer) {
                if (layer instanceof ol.layer.Vector) {
                    layer.getSource().clear();
                }
            });
        });
        map.on('change:view', function() {
            map.getLayers().forEach(function(layer) {
                if (layer instanceof ol.layer.Vector) {
                    layer.getSource().clear();
                }
            });
        });

        return map;
    }

}) ();



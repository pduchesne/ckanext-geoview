// Openlayers preview module

(function() {

    if (window.Proj4js) {
        // add your projection definitions here
        // definitions can be found at http://spatialreference.org/ref/epsg/{xxxx}/proj4js/

    }

    var $_ = _ // keep pointer to underscore, as '_' will may be overridden by a closure variable when down the stack

    this.ckan.module('olpreview', function (jQuery, _) {

        ckan.geoview = ckan.geoview || {}

        return {
            options: {
                i18n: {
                }
            },

            initialize: function () {
                jQuery.proxyAll(this, /_on/);
                this.el.ready(this._onReady);
            },

            addLayer: function (resourceLayer) {

                if (ckan.geoview && ckan.geoview.feature_style) {
                    var styleMapJson = JSON.parse(ckan.geoview.feature_style)
                    /* TODO_OL4 how is stylemap converted to OL4 ? */
                    //resourceLayer.styleMap = new OpenLayers.StyleMap(styleMapJson)

                    /* TODO set it as global feature style */
                }

                if (this.options.ol_config.hide_overlays &&
                    this.options.ol_config.hide_overlays.toLowerCase() == "true") {
                    resourceLayer.setVisibility(false);
                }

                return this.map.addLayerWithExtent(resourceLayer)
            },

            _commonBaseLayer: function(mapConfig) {

                if (mapConfig.type == 'mapbox') {
                    // MapBox base map
                    if (!mapConfig['map_id'] || !mapConfig['access_token']) {
                      throw '[CKAN Map Widgets] You need to provide a map ID ([account].[handle]) and an access token when using a MapBox layer. ' +
                            'See http://www.mapbox.com/developers/api-overview/ for details';
                    }

                    mapConfig.url = '//api.mapbox.com/v4/' + mapConfig['map_id'] + '/${z}/${x}/${y}.png?access_token=' + mapConfig['access_token'];
                    mapConfig.type = 'XYZ';
                    mapConfig.attribution = '<a href="https://www.mapbox.com/about/maps/" target="_blank">&copy; Mapbox &copy; OpenStreetMap </a> <a href="https://www.mapbox.com/map-feedback/" target="_blank">Improve this map</a>';

                } else if (mapConfig.type == 'custom') {
                    mapConfig.type = 'XYZ'
                } else if (mapConfig.type == 'wmts') {
                    mapConfig.url = '/basemap_service/'+encodeURIComponent(mapConfig.title);
                } else if (!mapConfig.type || mapConfig.type.toLowerCase() == 'osm') {
                    // default to Stamen base map
                    mapConfig.type = 'Stamen';
                    mapConfig.url = 'https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}.png';
                    mapConfig.subdomains = mapConfig.subdomains || 'abcd';
                    mapConfig.attribution = mapConfig.attribution || 'Map tiles by <a href="http://stamen.com">Stamen Design</a> (<a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>). Data by <a href="http://openstreetmap.org">OpenStreetMap</a> (<a href="http://creativecommons.org/licenses/by-sa/3.0">CC BY SA</a>)';
                }

                return OL_HELPERS.createLayerFromConfig(mapConfig, true);
            },

            _onReady: function () {

                var $this = this;

                var baseMapsConfig = this.options.basemapsConfig;

                if (!baseMapsConfig) {
                    // deprecated - for backward comp, parse old config format into json config
                    var config = {
                        type: this.options.map_config['type']
                    }
                    var prefix = config.type+'.'
                    for (var fieldName in this.options.map_config) {
                        if (fieldName.startsWith(prefix)) config[fieldName.substring(prefix.length)] = this.options.map_config[fieldName]
                    }

                    // title is necessary to appear in basemap selector
                    if (!config.title)
                        config.title = "Basemap";

                    baseMapsConfig = [config]
                }


                // gather options and config for this view
                var originalUrl = preload_resource.url;
                var proxyUrl = this.options.proxy_url;
                var proxyServiceUrl = this.options.proxy_service_url;
                var service_resource_name = preload_resource.service_resource_name;

                var format = preload_resource.format && preload_resource.format.toLocaleLowerCase();
                if (format == "esri rest")
                    format = "arcgis_rest"
                var mimeType = OL_HELPERS.SUPPORTED_MIME_TYPES[format];

                if (this.options.resourceView)
                    $_.extend(ckan.geoview, JSON.parse(this.options.resourceView));

                ckan.geoview.gapi_key = this.options.gapi_key;

                var mapDiv = $("<div></div>").attr("id", "map").addClass("map")

                $("#map-container").empty()
                $("#map-container").append(mapDiv)

                var useFeatureHoverOn = (ckan.geoview && 'feature_hoveron' in ckan.geoview) ?
                                        ckan.geoview['feature_hoveron'] :
                                        this.options.ol_config.default_feature_hoveron


                var createMapFn = function(baseMapLayer) {
                    var map = $this.map = OL_HELPERS.createMap({
                        container: mapDiv[0],
                        //styleMap : _this.featureStyleMap,
                        featureInfoPopup: useFeatureHoverOn,
                        featureDetailsControl: true,
                        layerSwitcher : true,
                        baseMapLayer: baseMapLayer
                    });

                    var fragMap;
                    try {
                        fragMap = OL_HELPERS.parseKVP((window.parent || window).location.hash && (window.parent || window).location.hash.substring(1));
                    } catch (err) {
                        fragMap = {};
                        // maybe a cross-origin frame access - ignore
                        console.warn(err);
                    }

                    var bbox = fragMap.bbox && fragMap.bbox.split(',').map(parseFloat)
                    var bbox = bbox && ol.proj.transformExtent(bbox, OL_HELPERS.EPSG4326, map.getProjection());
                    if (bbox)
                        map.zoomToExtent(bbox);

                    /* Update URL with current bbox
                     var mapChangeListener = function() {
                     var newBbox = map.getExtent() && map.getExtent().transform(map.getProjectionObject(), OL_HELPERS.EPSG4326).toString()

                     if (newBbox) {
                     var fragMap = OL_HELPERS.parseKVP((window.parent || window).location.hash && (window.parent || window).location.hash.substring(1));
                     fragMap['bbox'] = newBbox;

                     (window.parent || window).location.hash = OL_HELPERS.kvp2string(fragMap)
                     }
                     }


                     // listen to bbox changes to update URL fragment
                     map.events.register("moveend", map, mapChangeListener);

                     map.events.register("zoomend", map, mapChangeListener);

                     */

                    var validUrlPath = originalUrl.split(/[?#]/, 2)[0];
                    var deferredResult = OL_HELPERS.addLayersFromUrl(
                        map,
                        originalUrl,
                        mimeType,
                        service_resource_name !== undefined ? service_resource_name.split(',') : undefined,
                        function (url, isImageUrl) {
                            if (isImageUrl)
                                return url;
                            else {
                                /* Arcgis proxying would require proxy to be able to forward subpath queries
                                   let's drop proxy usage as of now, and rely on cross-origin acceptance */
                                if (mimeType == OL_HELPERS.SUPPORTED_MIME_TYPES["arcgis_rest"]) {
                                    // if resource URL is not HTTPS, remove protocol and hope that
                                    // distant resource has a protocol matching CKAN
                                    // this would be solved by using the proxy, cf remark above
                                    if (url.startsWith('http://') )
                                        return url.substring(url.indexOf('//'));
                                    else
                                        return url;
                                }

                                var urlPath = url.split(/[?#]/, 2)[0];
                                if (urlPath != validUrlPath /* urlPath.startsWith(validUrlPath) */ )
                                    throw "Cannot proxy URL - not original resource URL : " + url;

                                if (mimeType == OL_HELPERS.SUPPORTED_MIME_TYPES["wms"] ||
                                    mimeType == OL_HELPERS.SUPPORTED_MIME_TYPES["wfs"] ||
                                    mimeType == OL_HELPERS.SUPPORTED_MIME_TYPES["wmts"] ||
                                    mimeType == OL_HELPERS.SUPPORTED_MIME_TYPES["arcgis_rest"]) {
                                    // reminder : the proxyService will remove OGC parameters from proxied URL
                                    return proxyServiceUrl || url;
                                } else
                                    return proxyUrl || url;
                            }
                        },
                        $_.bind($this.addLayer, $this)
                    );

                    deferredResult.fail(function (err) {
                        console.warn(err);
                        map.logError("Failed to add layer(s) : "+err);
                    })
                }

                // Init map with first basemap from config
                this._commonBaseLayer(baseMapsConfig[0]) // take first basemap def
                    .then(function (layers) {

                        if (layers.length > 1)
                        // TODO unintended limitation
                            throw "First basemap config must yield one single layer"

                        baseMapsConfig[0].$ol_layer = layers[0]

                        // once basemap is instantiated, create the Map with it
                        createMapFn(layers[0])

                        // add all configured basemap layers
                        if (baseMapsConfig.length > 1) {
                            // add other basemaps if any
                            for (var idx = 1; idx < baseMapsConfig.length; idx++) {
                                (function(idx) {
                                    $this._commonBaseLayer(baseMapsConfig[idx])
                                        .then(function (layers) {
                                            layers.forEach(
                                                function (layer) {
                                                    layer.setVisible(false)
                                                    // insert all basemaps at the bottom
                                                    $this.map.getLayers().insertAt(0, layer)
                                                });
                                        }).fail(function(err) {
                                            var msg = "Failed to add basemap["+idx+"] from "+baseMapsConfig[idx].url;
                                            $this.map.logError(msg);
                                            console.warn(msg);
                                            console.warn(err);
                                        });
                                })(idx);
                            }
                        }
                    }).fail(function(err) {
                        console.warn("Failed to init map : "+err);
                    });
            }
        }
    });
})();

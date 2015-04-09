// Openlayers preview module

(function() {

    var $_ = _ // keep pointer to underscore, as '_' will may be overridden by a closure variable when down the stack

    this.ckan.module('olpreview', function (jQuery, _) {


        OpenLayers.Control.CKANLayerSwitcher = OpenLayers.Class(OpenLayers.Control.LayerSwitcher,
            {
                redraw: function () {
                    //if the state hasn't changed since last redraw, no need
                    // to do anything. Just return the existing div.
                    if (!this.checkRedraw()) {
                        return this.div;
                    }

                    //clear out previous layers
                    this.clearLayersArray("base");
                    this.clearLayersArray("data");

                    var containsOverlays = false;
                    var containsBaseLayers = false;

                    // Save state -- for checking layer if the map state changed.
                    // We save this before redrawing, because in the process of redrawing
                    // we will trigger more visibility changes, and we want to not redraw
                    // and enter an infinite loop.
                    this.layerStates = this.map.layers.map(function (layer) {
                        return {
                            'name': layer.name,
                            'visibility': layer.visibility,
                            'inRange': layer.inRange,
                            'id': layer.id
                        };
                    })

                    var layers = this.map.layers.slice().filter(function (layer) {
                        return layer.displayInLayerSwitcher
                    });
                    if (!this.ascending) {
                        layers.reverse();
                    }

                    for (var i = 0; i < layers.length; i++) {
                        var layer = layers[i];
                        var baseLayer = layer.isBaseLayer;

                        if (baseLayer) containsBaseLayers = true;
                        else containsOverlays = true;

                        // only check a baselayer if it is *the* baselayer, check data
                        //  layers if they are visible
                        var checked = (baseLayer) ? (layer == this.map.baseLayer) : layer.getVisibility();

                        // create input element
                        var inputElem = document.createElement("input"),
                        // The input shall have an id attribute so we can use
                        // labels to interact with them.
                            inputId = OpenLayers.Util.createUniqueID(this.id + "_input_");

                        inputElem.id = inputId;
                        inputElem.name = (baseLayer) ? this.id + "_baseLayers" : layer.name;
                        inputElem.type = (baseLayer) ? "radio" : "checkbox";
                        inputElem.value = layer.name;
                        inputElem.checked = checked;
                        inputElem.defaultChecked = checked;
                        inputElem.className = "olButton";
                        inputElem._layer = layer.id;
                        inputElem._layerSwitcher = this.id;
                        inputElem.disabled = !baseLayer && !layer.inRange;

                        // create span
                        var labelSpan = document.createElement("label");
                        // this isn't the DOM attribute 'for', but an arbitrary name we
                        // use to find the appropriate input element in <onButtonClick>
                        labelSpan["for"] = inputElem.id;
                        OpenLayers.Element.addClass(labelSpan, "labelSpan olButton");
                        labelSpan._layer = layer.id;
                        labelSpan._layerSwitcher = this.id;
                        if (!baseLayer && !layer.inRange) {
                            labelSpan.style.color = "gray";
                        }
                        labelSpan.innerHTML = layer.title || layer.name;
                        labelSpan.style.verticalAlign = (baseLayer) ? "bottom"
                            : "baseline";


                        var groupArray = (baseLayer) ? this.baseLayers
                            : this.dataLayers;
                        groupArray.push({
                            'layer': layer,
                            'inputElem': inputElem,
                            'labelSpan': labelSpan
                        });


                        var groupDiv = $((baseLayer) ? this.baseLayersDiv
                            : this.dataLayersDiv);
                        groupDiv.append($("<div></div>").append($(inputElem)).append($(labelSpan)));
                    }

                    // if no overlays, dont display the overlay label
                    this.dataLbl.style.display = (containsOverlays) ? "" : "none";

                    // if no baselayers, dont display the baselayer label
                    this.baseLbl.style.display = (containsBaseLayers) ? "" : "none";

                    return this.div;
                }
            }
        )

        var layerExtractors = {
            'kml': function (resource, layerProcessor) {
                var url = proxy_url || resource.proxy_url || resource.url
                layerProcessor(OL_HELPERS.createKMLLayer(url))
            },
            'gml': function (resource, layerProcessor) {
                var url = proxy_url || resource.proxy_url || resource.url
                layerProcessor(OL_HELPERS.createGMLLayer(url))
            },
            'geojson': function (resource, layerProcessor) {
                var url = proxy_url || resource.proxy_url || resource.url
                layerProcessor(OL_HELPERS.createGeoJSONLayer(url))
            },
            'wfs': function(resource, layerProcessor) {
                var parsedUrl = resource.url.split('#')
                var url = proxy_service_url || resource.proxy_service_url || parsedUrl[0]

                var ftName = parsedUrl.length > 1 && parsedUrl[1]
                OL_HELPERS.withFeatureTypesLayers(url, layerProcessor, ftName)
            },
            'wms' : function(resource, layerProcessor) {
                var parsedUrl = resource.url.split('#')
                // use the original URL for the getMap, as there's no need for a proxy for image requests
                var getMapUrl = parsedUrl[0].split('?')[0] // remove query if any

                var url = proxy_service_url || resource.proxy_service_url || getMapUrl

                var layerName = parsedUrl.length > 1 && parsedUrl[1]
                OL_HELPERS.withWMSLayers(url, getMapUrl, layerProcessor, layerName)
            },
            'esrigeojson': function (resource, layerProcessor) {
                var url = resource.url
                layerProcessor(OL_HELPERS.createEsriGeoJSONLayer(url))
            },
            'arcgis_rest': function(resource, layerProcessor) {
                var parsedUrl = resource.url.split('#')
                var url = proxy_service_url || resource.proxy_service_url || parsedUrl[0]

                var layerName = parsedUrl.length > 1 && parsedUrl[1]

                OL_HELPERS.withArcGisLayers(parsedUrl[0], layerProcessor, layerName)
            },
            'gft': function (resource, layerProcessor) {
                var tableId = OL_HELPERS.parseURL(resource.url).query.docid
                layerProcessor(OL_HELPERS.createGFTLayer(tableId, CKAN_GAPI_KEY))
            }
        }

        /*
         var createLayers = function (resource) {
         var resourceUrl = resource.url
         var proxiedResourceUrl = resource.proxy_url
         var proxiedServiceUrl = resource.proxy_service_url

         var cons = layerExtractors[resource.format && resource.format.toLocaleLowerCase()]
         return cons && cons(resource)
         }
         */

        var withLayers = function (resource, layerProcessor) {

            var withLayers = layerExtractors[resource.format && resource.format.toLocaleLowerCase()]
            withLayers && withLayers(resource, layerProcessor)
        }

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
                this.map.addLayer(resourceLayer)

                var bbox = resourceLayer.getDataExtent && resourceLayer.getDataExtent()
                if (bbox) {
                    if (this.map.getExtent()) this.map.getExtent().extend(bbox)
                    else this.map.zoomToExtent(bbox)
                }
                else {
                    var firstExtent = false
                    resourceLayer.events.register(
                        "loadend",
                        resourceLayer,
                        function (e) {
                            if (!firstExtent) {
                                var bbox = e && e.object && e.object.getDataExtent && e.object.getDataExtent()
                                if (bbox)
                                    if (this.map.getExtent()) this.map.getExtent().extend(bbox)
                                    else this.map.zoomToExtent(bbox)
                                else
                                    this.map.zoomToMaxExtent()
                                firstExtent = true
                            }
                        })
                }

            },

            _onReady: function () {
                var basemapLayer = new OpenLayers.Layer.OSM("Simple OSM Map")

                var mapDiv = $("<div></div>").attr("id", "map").addClass("map")
                var info = $("<div></div>").attr("id", "info")
                mapDiv.append(info)

                $("#data-preview").empty()
                $("#data-preview").append(mapDiv)

                info.tooltip({
                    animation: false,
                    trigger: 'manual',
                    placement: "right",
                    html: true
                });

                this.map = new OpenLayers.Map(
                    {
                        div: "map",
                        theme: "/js/vendor/openlayers2/theme/default/style.css",
                        layers: [basemapLayer],
                        maxExtent: basemapLayer.getMaxExtent(),
                        //projection: Mercator, // this is needed for WMS layers (most only accept 3857), but causes WFS to fail
                        eventListeners: {
                            featureover: function (e) {
                                e.feature.renderIntent = "select";
                                e.feature.layer.drawFeature(e.feature);
                                var pixel = event.xy
                                info.css({
                                    left: (pixel.x + 10) + 'px',
                                    top: (pixel.y - 15) + 'px'
                                });
                                info.currentFeature = e.feature
                                info.tooltip('hide')
                                    .empty()
                                var tooltip = "<div>" + (e.feature.data.name || e.feature.fid) + "</div><table>";
                                for (var prop in e.feature.data) tooltip += "<tr><td>" + prop + "</td><td>" + e.feature.data[prop] + "</td></tr></div>"
                                tooltip += "</table>"
                                info.attr('data-original-title', tooltip)
                                    .tooltip('fixTitle')
                                    .tooltip('show');
                            },
                            featureout: function (e) {
                                e.feature.renderIntent = "default"
                                e.feature.layer.drawFeature(e.feature)
                                if (info.currentFeature == e.feature) {
                                    info.tooltip('hide')
                                    info.currentFeature = undefined
                                }

                            },
                            featureclick: function (e) {
                                //log("Map says: " + e.feature.id + " clicked on " + e.feature.layer.name);
                            }
                        }
                    });

                this.map.addControl(new OpenLayers.Control.CKANLayerSwitcher());

                var bboxFrag
                var fragMap = OL_HELPERS.parseKVP((window.parent || window).location.hash && (window.parent || window).location.hash.substring(1))

                var bbox = (fragMap.bbox && new OpenLayers.Bounds(fragMap.bbox.split(',')).transform(EPSG4326, this.map.getProjectionObject()))
                if (bbox) this.map.zoomToExtent(bbox)

                withLayers(preload_resource, $_.bind(this.addLayer, this))

                /*
                 var resourceLayers = createLayers(preload_resource)
                 var $this = this;

                 if (! (resourceLayers instanceof Array)) resourceLayers = [resourceLayers]
                 $_.each(resourceLayers, function(resourceLayer) {
                 if (resourceLayer.done) resourceLayer.done(function(layer) {$this.addLayer(layer)})
                 else $this.addLayer(resourceLayer)
                 })
                 */


            }
        }
    });
})();
OpenLayers.ImgPath = '/js/vendor/openlayers2/img/';

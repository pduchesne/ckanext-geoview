(function() {
    var format_processors = this.ckan.geoview.layerExtractors

    var createDatexLayer = function (url) {

        var datex = new OpenLayers.Layer.Vector("DATEX", {
            strategies: [new OpenLayers.Strategy.Fixed()],
            protocol: new OpenLayers.Protocol.HTTP({
                url: url,
                format: new OpenLayers.Format.DATEX()
            }),

            /* use a default style with datex parking icon */
             styleMap: new OpenLayers.StyleMap(
                 new OpenLayers.Style(
                     {
                         pointRadius: 10,
                         //externalGraphic: 'http://www.datex.org/parkingsite_offstreetparking.png'
                        externalGraphic: '${getIcon}'
                     },
                     {context: {
                         getIcon: function(feature) {
                             if (feature.attributes.layout == "covered")
                                 return '/img/F60.svg';
                             else if (feature.attributes.layout == "openSpace")
                                 return '/img/E9a.svg';
                             else if (feature.attributes.parkingUsageScenario == "truckParking")
                                 return '/img/E9c.svg';
                             else
                                 return '/img/E9a.svg';
                         }
                     }}
                 )
             )

        });


        return datex
    }

    format_processors['datex'] =
        function (resource, proxyUrl, proxyServiceUrl, layerProcessor) {
            var url = proxyUrl || resource.url;
            layerProcessor(createDatexLayer(url));
        }
}) ()
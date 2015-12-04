(function() {
    var format_processors = this.ckan.geoview.layerExtractors

    var createDatexLayer = function (url) {

        var datex = new OpenLayers.Layer.Vector("DATEX", {
            strategies: [new OpenLayers.Strategy.Fixed()],
            protocol: new OpenLayers.Protocol.HTTP({
                url: url,
                format: new OpenLayers.Format.DATEX()
            }),
            /*
             styleMap: new OpenLayers.StyleMap({
             'default': new OpenLayers.Style(
             {
             strokeColor: "#404040",
             strokeWidth: 0.5
             })
             }),
             */
        });


        return datex
    }

    format_processors['datex'] =
        function (resource, proxyUrl, proxyServiceUrl, layerProcessor) {
            var url = proxyUrl || resource.url;
            layerProcessor(createDatexLayer(url));
        }
}) ()
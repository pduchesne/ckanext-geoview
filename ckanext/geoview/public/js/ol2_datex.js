(function() {
    var format_processors = this.ckan.geoview.layerExtractors

    var createDatexLayer = function (url) {

        var datex = new OpenLayers.Layer.Vector("DATEX", {
            strategies: [new OpenLayers.Strategy.Fixed()],
            protocol: new OpenLayers.Protocol.HTTP({
                url: url,
                format: new OpenLayers.Format.DATEX()
            }),

            rendererOptions: {zIndexing: true},
            /* use a default style with datex parking icon */
             styleMap: new OpenLayers.StyleMap(
                 new OpenLayers.Style(
                     {

                     },
                     {rules:[
                         new OpenLayers.Rule({
                             symbolizer: {
                                 'Polygon':{
                                     fillColor: "yellow",
                                     fillOpacity: 0.4,
                                     graphicZIndex: 1,
                                     strokeWidth: 0
                                 },
                                 'Point':{
                                     pointRadius: 10,
                                     //externalGraphic: 'http://www.datex.org/parkingsite_offstreetparking.png'
                                     externalGraphic: '${getIcon}',
                                     graphicZIndex: 2
                                 }
                             }
                         })],
                      context: {
                         getIcon: function(feature) {
                             if (feature.attributes.layout == "covered")
                                 return '/img/F60.svg';
                             else if (feature.attributes.layout == "openSpace")
                                 return '/img/E9a.svg';
                             else if (feature.attributes.parkingUsageScenario == "truckParking")
                                 return '/img/E9c.svg';
                             else
                                 return '/img/E9a.svg';
                         },

                         getTooltip: function(feature) {

                             /*
                              Unique ID: 5ae65600-f71b-4d5e-aed1-e8c1c7879364
                              Name of the parking site: Meir
                              Number of spaces: 509
                              Operator name: Interparking group
                              Contact e-mail address: MEIR@interparking.com
                              Latitude: 51.21903 (PV: 5 figures after .)
                              Longitude: 4.40441 (PV: 5 figures after .)
                              Maximum height in the parking: 2.20
                              Layout of the parking: covered
                              Address: Eiermarkt 33-35, 2000 Antwerpen
                              */


                             var tooltip = "<div>" + (feature.data.name || feature.fid) + "</div><table>";
                             tooltip += "<tr><td>Unique ID</td><td>" + feature.fid + "</td></tr>"
                             tooltip += "<tr><td>Parking Name</td><td>" + feature.data.name + "</td></tr>"
                             if (feature.data.spacesNumber) tooltip += "<tr><td>Number of spaces</td><td>" + feature.data.spacesNumber + "</td></tr>"
                             if (feature.data.operator) {
                                 //TODO choose default language
                                 tooltip += "<tr><td>Operator name</td><td>" + feature.data.operator.contactOrganisationName.values['nl'] + "</td></tr>"
                                 tooltip += "<tr><td>Contact eMail</td><td>" + feature.data.operator.contactDetailsEMail + "</td></tr>"
                             }
                             tooltip += "<tr><td>Latitude</td><td>" + feature.data.lonlatPos.y.toFixed(5) + "</td></tr>"
                             tooltip += "<tr><td>Longitude</td><td>" + feature.data.lonlatPos.x.toFixed(5)  + "</td></tr>"
                             if (feature.data.vehicleHeight) tooltip += "<tr><td>Max Height</td><td>" + feature.data.vehicleHeight + "</td></tr>"
                             if (feature.data.layout) tooltip += "<tr><td>Parking Layout</td><td>" + feature.data.layout + "</td></tr>"
                             if (feature.data.address) tooltip += "<tr><td>Address</td><td>" + feature.data.address + "</td></tr>"
                             if (feature.data.phone) tooltip += "<tr><td>Phone</td><td>" + feature.data.phone + "</td></tr>"
                             tooltip += "</table>"

                             return tooltip
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
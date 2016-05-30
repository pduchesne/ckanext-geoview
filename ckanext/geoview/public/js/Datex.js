/**
 * Class: OpenLayers.Format.DATEX
 * Inherits from:
 *  - <OpenLayers.Format.XML>
 */
OpenLayers.Format.DATEX = OpenLayers.Class(OpenLayers.Format.XML, {


    parkingSiteElementName: "parkingSite",

    /**
     * APIProperty: datexns
     * {String} DATEX Namespace.
     */
    datexns: "http://datex2.eu/schema/2/2_0",

    /**
     * APIProperty: extractAttributes
     * {Boolean} Extract attributes from GML.
     */
    extractAttributes: true,

    /**
     * Constructor: OpenLayers.Format.GML
     * Create a new parser for GML.
     *
     * Parameters:
     * options - {Object} An optional object whose properties will be set on
     *     this instance.
     */
    initialize: function(options) {
        // compile regular expressions once instead of every time they are used
        this.regExes = {
            trimSpace: (/^\s*|\s*$/g),
            removeSpace: (/\s*/g),
            splitSpace: (/\s+/),
            trimComma: (/\s*,\s*/g)
        };
        OpenLayers.Format.XML.prototype.initialize.apply(this, [options]);

        this.readers = {
            "http://datex2.eu/schema/2/2_0#parkingSite" : this.parseParkingSiteElement
        }

        this.cardinality = {
            "http://datex2.eu/schema/2/2_0#parkingTablePublication-http://datex2.eu/schema/2/2_0#parkingTable" : false,
            "http://datex2.eu/schema/2/2_0#parkingTable-http://datex2.eu/schema/2/2_0#parkingRecord" : false,
            "GroupOfParkingSites-http://datex2.eu/schema/2/2_0#parkingSite" : false
        }
    },

    /**
     * APIMethod: read
     * Read data from a string, and return a list of features.
     *
     * Parameters:
     * data - {String} or {DOMElement} data to read/parse.
     *
     * Returns:
     * {Array(<OpenLayers.Feature.Vector>)} An array of features.
     */
    read: function(data) {
        if(typeof data == "string") {
            data = OpenLayers.Format.XML.prototype.read.apply(this, [data]);
        }

        var features = []

        var datexObj = this.readAll(data)

        if (datexObj.d2LogicalModel.payloadPublication.genericPublicationExtension) {
            var parkingTables = datexObj.d2LogicalModel
                .payloadPublication
                .genericPublicationExtension
                .parkingTablePublication
                .parkingTable

            $.each(parkingTables, function (idx, pt) {
                $.each(pt.parkingRecord, function (idx, pr) {
                    if (pr['@type'] == "GroupOfParkingSites")
                        features = features.concat(pr.parkingSite)
                    else
                        //TODO correct ?
                        features.push(pr)
                })
            })


        } else {
            datexObj
        }

        return features
    },

    readAll: function(dataNode) {
        var datexDoc = {}

        for (var idx=0;idx < dataNode.children.length; idx++) {
            this.parseIntoContainer(dataNode.children[idx], datexDoc)
        }

        return datexDoc
    },

    parseIntoContainer: function(node, container, isSingleValue) {
        var readerFunc = this.findReader(node.namespaceURI, node.localName)
        var name = node.localName

        var value = readerFunc.call(this, node)

        if (isSingleValue === undefined) {
            if (container[name])
                if (Array.isArray(container[name]))
                    container[name].push(value)
                else
                    container[name] = [container[name], value]
            else
                container[name] = value
        } else if (isSingleValue) {
            if (container[name])
                throw "Two values for single field " + name
            container.name = value
        } else {
            if (!container[name])
                container[name] = []
            container[name].push(value)
        }
    },

    findReader: function(namespace, name) {
        return this.readers[namespace+'#'+name] || this.parseGeneric
    },

    getQualifiedName: function(node) {
        return node.namespaceURI + "#" + node.localName
    },

    parseGeneric: function(node) {
        var obj = {}

        if (node.children && node.children.length > 0) {
            if (node.hasAttributeNS("http://www.w3.org/2001/XMLSchema-instance","type"))
                obj['@type'] = node.getAttributeNS("http://www.w3.org/2001/XMLSchema-instance","type")

            for (var idx=0;idx < node.children.length; idx++) {
                var child = node.children[idx]
                var cardinality = this.cardinality[this.getQualifiedName(node)+"-"+this.getQualifiedName(child)]
                if (cardinality === undefined)
                    cardinality = this.cardinality[obj['@type']+"-"+this.getQualifiedName(child)]
                this.parseIntoContainer(child, obj, cardinality)
            }
        } // TODO support both children and value ?
        else {
            obj = node.textContent
        }

        return obj
    },


    /**
     * Method: parseFeature
     * This function is the core of the GML parsing code in OpenLayers.
     *    It creates the geometries that are then attached to the returned
     *    feature, and calls parseAttributes() to get attribute data out.
     *
     * Parameters:
     * node - {DOMElement} A GML feature node.
     */
    parseParkingSiteElement: function(parkingSiteNode) {

        var locationNodeList = this.getElementsByTagNameNS(parkingSiteNode, this.datexns, 'parkingLocation');
        var geometry;
        if(locationNodeList.length > 0) {
            var locationNode = locationNodeList[0]
            var type = locationNode.getAttributeNS("http://www.w3.org/2001/XMLSchema-instance","type")
            var parser = this.parseGeometry[type.toLowerCase()];
            if (parser) {
                geometry = parser.apply(this, [locationNode]);
                if (this.internalProjection && this.externalProjection) {
                    geometry.transform(this.externalProjection,
                        this.internalProjection);
                }
            } else {
                throw new TypeError("Unsupported geometry type: " + type);
            }
        }

        // construct feature (optionally with attributes)
        var attributes;
        if(this.extractAttributes) {
            attributes = this.parseAttributes(parkingSiteNode);
        }
        var feature = new OpenLayers.Feature.Vector(geometry, attributes);

            /*
        var firstChild = this.getFirstElementChild(node);
        feature.gml = {
            featureType: firstChild.nodeName.split(":")[1],
            featureNS: firstChild.namespaceURI,
            featureNSPrefix: firstChild.prefix
        };
        feature.type = feature.gml.featureType;
        */

        // assign fid
        feature.fid = parkingSiteNode.getAttribute("id");
        return feature;
    },

    parseCoordinates: function(coordinatesNode) {
        var latitude = this.getElementsByTagNameNS(coordinatesNode, this.datexns, "latitude")[0];
        var longitude = this.getElementsByTagNameNS(coordinatesNode, this.datexns, "longitude")[0];
        return [
            eval(longitude.textContent),
            eval(latitude.textContent)
        ]
    },

    /**
     * Property: parseGeometry
     * Properties of this object are the functions that parse geometries based
     *     on their type.
     */
    parseGeometry: {

        point: function(node) {
            /**
             * Parse
             * <pointByCoordinates>
             *   <pointCoordinates>
             *     <latitude>1.0</latitude>
             *     <longitude>2.0</longitude>
             *   </pointCoordinates>
             * </pointByCoordinates>
             */
            var nodeList, coordString;
            var coords = [];

            // look for <datex:pointByCoordinates>
            var nodeList = this.getElementsByTagNameNS(node, this.datexns, "pointByCoordinates");
            if(nodeList.length > 0) {
                coords = this.parseCoordinates(nodeList[0].firstElementChild)
            }
            return new OpenLayers.Geometry.Point(coords[0], coords[1]);
        },

        /*
         <parkingLocation xsi:type="Area">
         <areaExtension>
         <openlrExtendedArea>
         <openlrAreaLocationReference xsi:type="OpenlrPolygonLocationReference">
         <openlrPolygonCorners>
         <openlrCoordinate>
         <latitude>50.93269894776509</latitude>
         <longitude>5.33435583114624</longitude>
         </openlrCoordinate>
         <openlrCoordinate>
         <latitude>50.93421353595426</latitude>
         <longitude>5.336952209472656</longitude>
         </openlrCoordinate>
         <openlrCoordinate>
         <latitude>50.93437581033473</latitude>
         <longitude>5.338175296783447</longitude>
         </openlrCoordinate>
         </openlrPolygonCorners>
         </openlrAreaLocationReference>
         </openlrExtendedArea>
         </areaExtension>
         </parkingLocation>
         */

        area: function(node) {
            // look for <datex:pointByCoordinates>
            var areaNode = this.getElementsByTagNameNS(node, this.datexns, "openlrAreaLocationReference")[0];
            var areaType = areaNode.getAttributeNS("http://www.w3.org/2001/XMLSchema-instance","type");
            switch (areaType) {
                case 'OpenlrPolygonLocationReference':
                    var corners = this.getElementsByTagNameNS(areaNode, this.datexns, "openlrCoordinate");
                    var components = [];
                    for(var i=0; i<corners.length; ++i) {
                        var coords = this.parseCoordinates(corners[i])
                        components.push(new OpenLayers.Geometry.Point(coords[0], coords[1]))
                    }
                    return new OpenLayers.Geometry.Polygon([
                        new OpenLayers.Geometry.LinearRing(components)]);
                default:
                    throw "Unsupported Area type " + areaType
            }

        },

        /*
        polygon: function(node) {
            var nodeList = this.getElementsByTagNameNS(node, this.gmlns,
                "LinearRing");
            var components = [];
            if(nodeList.length > 0) {
                // this assumes exterior ring first, inner rings after
                var ring;
                for(var i=0; i<nodeList.length; ++i) {
                    ring = this.parseGeometry.linestring.apply(this,
                        [nodeList[i], true]);
                    if(ring) {
                        components.push(ring);
                    }
                }
            }
            return new OpenLayers.Geometry.Polygon(components);
        },

        box: function(node) {
            var nodeList = this.getElementsByTagNameNS(node, this.gmlns,
                "coordinates");
            var coordString;
            var coords, beginPoint = null, endPoint = null;
            if (nodeList.length > 0) {
                coordString = nodeList[0].firstChild.nodeValue;
                coords = coordString.split(" ");
                if (coords.length == 2) {
                    beginPoint = coords[0].split(",");
                    endPoint = coords[1].split(",");
                }
            }
            if (beginPoint !== null && endPoint !== null) {
                return new OpenLayers.Bounds(parseFloat(beginPoint[0]),
                    parseFloat(beginPoint[1]),
                    parseFloat(endPoint[0]),
                    parseFloat(endPoint[1]) );
            }
        }
        */

    },

    /**
     * Method: parseAttributes
     *
     * Parameters:
     * node - {DOMElement}
     *
     * Returns:
     * {Object} An attributes object.
     */
    parseAttributes: function(node) {
        var attributes = {};
        // assume attributes are children of the first type 1 child

        var parentParkingRecord = node.parentNode.nodeName == "parkingRecord" && node.parentNode
        if (parentParkingRecord)
            attributes.groupName = this.getMultilangValue(parentParkingRecord, 'parkingName')

        attributes.type = node.getAttributeNS("http://www.w3.org/2001/XMLSchema-instance","type")
        attributes.name = this.getMultilangValue(node, 'parkingName')
        attributes.layout = this.getTextValue(node, 'parkingLayout')
        attributes.url = this.getTextValue(node, 'urlLinkAddress')
        try { attributes.spacesNumber = parseInt(this.getTextValue(node, 'parkingNumberOfSpaces')) } catch (err) {}
        attributes.description = this.getMultilangValue(node, 'parkingDescription')
        attributes.address = this.getMultilangValue(node, 'contactDetailsAddress')
        attributes.phone = this.getTextValue(node, 'contactDetailsTelephoneNumber')
        attributes.urbanParkingType = this.getTextValue(node, 'urbanParkingSiteType')

        try {
            attributes.parkingUsageScenario = node
                .getElementsByTagNameNS(this.datexns, "parkingUsageScenario")[2] // WARN this structure looks erroneous
                .textContent
        } catch (err) {}

        return attributes;
    },

    getTextValue: function(node, elementName) {
        var matches = this.getElementsByTagNameNS(node, this.datexns, elementName)
        if (matches.length > 0)
            return matches[0].textContent
        else
            return
    },

    getMultilangValue: function(node, elementName, language) {
        var matchingNodes = this.getElementsByTagNameNS(node, this.datexns, elementName)
        if (matchingNodes.length > 0)
            //TODO use language filter
            return matchingNodes[0].firstElementChild.firstElementChild.textContent
        else
        return
    },

    CLASS_NAME: "OpenLayers.Format.DATEX"
});
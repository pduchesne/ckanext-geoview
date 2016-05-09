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
        var parkingSiteNodes = this.getElementsByTagNameNS(data.documentElement,
            this.datexns,
            this.parkingSiteElementName);
        var parkingSites = [];
        for(var i=0; i<parkingSiteNodes.length; i++) {
            var parkingSite = this.parseParkingSiteElement(parkingSiteNodes[i]);
            if(parkingSite) {
                parkingSites.push(parkingSite);
            }
        }
        return parkingSites;
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
                var pointCoordinates = nodeList[0].children[0]
                var latitude = this.getElementsByTagNameNS(pointCoordinates, this.datexns, "latitude")[0];
                var longitude = this.getElementsByTagNameNS(pointCoordinates, this.datexns, "longitude")[0];
                coords = [
                    eval(longitude.textContent),
                    eval(latitude.textContent)
                ]
            }
            return new OpenLayers.Geometry.Point(coords[0], coords[1]);
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
        attributes.description = this.getMultilangValue(node, 'parkingDescription')
        attributes.address = this.getMultilangValue(node, 'contactDetailsAddress')
        attributes.phone = this.getTextValue(node, 'contactDetailsTelephoneNumber')
        attributes.urbanParkingType = this.getTextValue(node, 'urbanParkingSiteType')

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
            return matchingNodes[0].children[0].children[0].textContent
        else
        return
    },

    CLASS_NAME: "OpenLayers.Format.DATEX"
});
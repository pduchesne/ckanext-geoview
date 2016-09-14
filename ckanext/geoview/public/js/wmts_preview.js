// wmts preview module
ckan.module('wmtspreview', function (jQuery, _) {
  return {
    initialize: function () {
      var self = this;

      self.el.empty();
      self.el.append($('<div></div>').attr('id', 'map'));
      self.map = ckan.commonLeafletMap('map', this.options.map_config, {center: [0, 0], zoom: 3});

      $.ajaxSetup({
        beforeSend: function (xhr) {
          xhr.overrideMimeType('application/xml; charset=UTF-8');
        }
      });

      jQuery.get(preload_resource['url']).done(
        function(data){
          self.showPreview(data);
        })
      .fail(
        function(jqXHR, textStatus, errorThrown) {
          self.showError(jqXHR, textStatus, errorThrown);
        }
      );
    },

    showError: function (jqXHR, textStatus, errorThrown) {
      if (textStatus == 'error' && jqXHR.responseText.length) {
        this.el.html(jqXHR.responseText);
      } else {
        this.el.html(this.i18n('error', {text: textStatus, error: errorThrown}));
      }
    },

    showPreview: function (wmtsInfo) {
      var self = this;
      var EPSG4326 = proj4('EPSG:4326');
      var xmlPathPrefix = 'Contents Layer';
      var nameSpace = ($(wmtsInfo).find('ows\\:Identifier').length != 0) ? 'ows\\:' : '';
      var tileUrlPrefix = $(wmtsInfo).find(nameSpace + 'Operation[name="GetTile"]').find(nameSpace + 'Get:contains("KVP")').attr('xlink:href');
      var bboxName;
      var mapInfos = [];
      var tileVariables = {TileMatrixSet: '{tileMatrixSet}', TileMatrix: '{z}', Style: '{style}', TileRow: '{y}', TileCol: '{x}'};
      var maps = {};
      var mapLatLngBounds = {};
      var overlay;

      // Ensure that URLs have http://.
      function httpify(s) {
        if (s != undefined) {
          if (!s.match(/^[a-zA-Z]+:\/\//)) s = 'http://' + s;
	}
	return s;
      }

      // Get the layer when changing to a new layer.
      function layerChange(e) {
	overlay = e.layer;
      }

      // Load crs from epsg.io.
      function loadEPSG(url, callback) {
        var script = document.createElement('script');
        script.src = url;
        script.onreadystatechange = callback;
        script.onload = callback;
        document.getElementsByTagName('head')[0].appendChild(script);
      }

      // Transform point coordinates from user coordinate system to EPSG:4326.
      function transCoord(x, y, userCrs) {
        if (proj4) {
          var p = proj4(userCrs, EPSG4326, [parseFloat(x), parseFloat(y)]);
        }
        return [p[1], p[0]];
      }

      // Try to obtain the WGS84BoundingBox or BoundingBox.
      if ($(wmtsInfo).find(nameSpace + 'WGS84BoundingBox').length != 0) {
        bboxName = 'WGS84BoundingBox';
      } else if ($(wmtsInfo).find(nameSpace + 'BoundingBox').length != 0) {
	bboxName = 'BoundingBox';
      } else {
        bboxName = '';
      }

      // Collect information for each map.
      $(wmtsInfo).find(xmlPathPrefix).each(function(i, selectedElement) {
        mapInfos.push({
          'id': $(selectedElement).find(nameSpace + 'Identifier').first().text(),
          'title': $(selectedElement).find(nameSpace + 'Title').first().text(),
          'tileMatrixSet': $(selectedElement).find('TileMatrixSet').first().text(),
          'style': $(selectedElement).find('Style').find(nameSpace + 'Identifier').first().text(),
          'format': $(selectedElement).find('Format').text(),
          'resourceUrl': httpify($(selectedElement).find('ResourceURL').attr('template')),
          'lowerCorner': $(selectedElement).find(nameSpace + bboxName).find(nameSpace + 'LowerCorner').text().split(' ').reverse(),
          'upperCorner': $(selectedElement).find(nameSpace + bboxName).find(nameSpace + 'UpperCorner').text().split(' ').reverse(),
        });
      });

      // Get tiles via RESTful if the service has resourceUrls, otherwise get them via KVP.
      jQuery.each(mapInfos, function(i, mapInfo) {
        maps[mapInfo.title] = (mapInfo.resourceUrl != undefined) ?
        // Discard any unsupported tile variables.
        L.tileLayer(mapInfo.resourceUrl.replace(/{([^}]+)}/g, function(g0, g1) { return (tileVariables[g1] != undefined) ? tileVariables[g1] : ''; }), mapInfo) :
        L.tileLayer(httpify(tileUrlPrefix) + 'SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER={id}&STYLE={style}&FORMAT={format}&TILEMATRIXSET={tileMatrixSet}&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}', mapInfo);
        mapLatLngBounds[mapInfo.id] = [mapInfo.lowerCorner, mapInfo.upperCorner];
      });

      // If we only have BoundingBox info, load crs from epsg.io.
      if (bboxName == 'BoundingBox') {
        xmlMapCrs = $(wmtsInfo).find(xmlPathPrefix).find(nameSpace + bboxName).first().attr("crs");
        EPSG = xmlMapCrs.substring(xmlMapCrs.indexOf("EPSG::") + 6, xmlMapCrs.length);
        loadEPSG('http://epsg.io/' + EPSG + '.js', function() {
	  // Except for EPSG:3821 (which is incomplete)
          if (EPSG == 3821) {
            proj4.defs([
              ['EPSG:3821', '+proj=tmerc +ellps=GRS67 +towgs84=-752,-358,-179,-.0000011698,.0000018398,.0000009822,.00002329 +lat_0=0 +lon_0=121 +x_0=250000 +y_0=0 +k=0.9999 +units=m +no_defs']
            ]);
          }
          EPSGUser = proj4('EPSG:' + EPSG);
          jQuery.each(mapInfos, function(i, mapInfo) {
            lowercorner = mapLatLngBounds[mapInfo.id][0];
            uppercorner = mapLatLngBounds[mapInfo.id][1];
            mapLatLngBounds[mapInfo.id] = [transCoord(lowercorner[1], lowercorner[0], EPSGUser), transCoord(uppercorner[1], uppercorner[0], EPSGUser)];
          });
          self.map.fitBounds(mapLatLngBounds[mapInfos[0].id]);
        });
      }

      overlay = maps[mapInfos[0].title];
      self.map.addLayer(maps[mapInfos[0].title]);
      L.control.layers(maps, null).addTo(self.map);
      if (mapLatLngBounds[mapInfos[0].id][0] != '') self.map.fitBounds(mapLatLngBounds[mapInfos[0].id]);
      self.map.on({baselayerchange: layerChange});

      // Layer control for mobile
      var container = document.getElementsByClassName('leaflet-control-layers')[0];
      L.DomEvent.disableClickPropagation(container);

      // Opacity control for desktop
      if (!L.Browser.touch) {
	var outer = $('<div id="control" class="ui-opacity">');
	var inner = $('<div id="handle" class="handle">');
	var start = false;
	var startTop;
	$(outer).append(inner);
	$(outer).appendTo('body');
	var handle = document.getElementById('handle');
        document.onmousemove = function(e) {
          if (!start) return;
          handle.style.top = Math.max(-5, Math.min(195, startTop + parseInt(e.clientY, 10) - start)) + 'px';
          overlay.setOpacity(1 - (handle.offsetTop / 200));
        };
        handle.onmousedown = function(e) {
          start = parseInt(e.clientY, 10);
          startTop = handle.offsetTop - 5;
	  return false;
        };
        document.onmouseup = function(e) {
          start = null;
        };
      }
    }
  };
});

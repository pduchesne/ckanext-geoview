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
          self.showPreview(preload_resource['original_url'], data);
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

    showPreview: function (url, data) {
      var self = this;
      var EPSG4326 = proj4('EPSG:4326');
      var nameSpace = ($(data).find('Contents Layer > ows\\:Identifier').length != 0) ? 'ows\\:' : '';
      var xmlPathPrefix = 'Contents Layer > ' + nameSpace;
      var xmlMapIds = $(data).find(xmlPathPrefix + 'Identifier');
      var xmlMapTitles = $(data).find(xmlPathPrefix + 'Title');
      var bboxName = ($(data).find(xmlPathPrefix + 'WGS84BoundingBox').length != 0) ? 'WGS84BoundingBox' : 'BoundingBox';
      var xmlPathPrefix2 = 'Contents Layer ows\\:' + bboxName + ' > ' + nameSpace;
      var xmlMapLowerCorner = $(data).find(xmlPathPrefix2 + 'LowerCorner');
      var xmlMapUpperCorner = $(data).find(xmlPathPrefix2 + 'UpperCorner');
      var mapIds = [];
      var mapTitles = [];
      var maps = {};
      var mapLatLngBounds = {};
      var xmlMapCrs, overlay;

      function layerChange(e) {
	var url = e.layer._url;
	overlay = e.layer;
      }

      function loadEPSG(url, callback) {
        var script = document.createElement('script');
        script.src = url;
        script.onreadystatechange = callback;
        script.onload = callback;
        document.getElementsByTagName('head')[0].appendChild(script);
      }

      function transCoord(x, y, userCrs) {
        if (proj4) {
          var p = proj4(userCrs, EPSG4326, [parseFloat(x), parseFloat(y)]);
        }
        return [p[1], p[0]];
      }

      for (var i=0, max=xmlMapIds.length; i < max; i++) {
        mapIds.push(xmlMapIds[i].textContent);
        mapTitles.push(xmlMapTitles[i].textContent);
      }

      for (var i=0, max=mapIds.length; i < max; i++) {
        maps[mapTitles[i]] = L.tileLayer(url + '?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=' + mapIds[i] + '&STYLE=_null&TILEMATRIXSET=GoogleMapsCompatible&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/png');
        mapLatLngBounds[mapIds[i]] = [xmlMapLowerCorner[i].textContent.split(' ').reverse(), xmlMapUpperCorner[i].textContent.split(' ').reverse()];
      }

      // If we only have BoundingBox info, load crs from epsg.io.
      if (bboxName == 'BoundingBox') {
        xmlMapCrs = $(data).find(xmlPathPrefix + bboxName).first().attr("crs");
        EPSG = xmlMapCrs.substring(xmlMapCrs.indexOf("EPSG::") + 6, xmlMapCrs.length);
        loadEPSG('http://epsg.io/' + EPSG + '.js', function() {
	  // Except for EPSG:3821 (which is incomplete)
          if (EPSG == 3821) {
            proj4.defs([
              ['EPSG:3821', '+proj=tmerc +ellps=GRS67 +towgs84=-752,-358,-179,-.0000011698,.0000018398,.0000009822,.00002329 +lat_0=0 +lon_0=121 +x_0=250000 +y_0=0 +k=0.9999 +units=m +no_defs']
            ]);
          }
          EPSGUser = proj4('EPSG:' + EPSG);
          for (var i=0, max=mapIds.length; i < max; i++) {
            lowercorner = mapLatLngBounds[mapIds[i]][0];
            uppercorner = mapLatLngBounds[mapIds[i]][1];
            mapLatLngBounds[mapIds[i]] = [transCoord(lowercorner[1], lowercorner[0], EPSGUser), transCoord(uppercorner[1], uppercorner[0], EPSGUser)];
          }
          self.map.fitBounds(mapLatLngBounds[mapIds[0]]);
        });
      }

      overlay = maps[mapTitles[0]];
      self.map.addLayer(maps[mapTitles[0]]);
      L.control.layers(maps, null).addTo(self.map);
      self.map.fitBounds(mapLatLngBounds[mapIds[0]]);
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

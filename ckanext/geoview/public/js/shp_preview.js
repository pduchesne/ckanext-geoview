// shapefile preview module
ckan.module('shppreview', function (jQuery, _) {
  return {
    options: {
      table: '<table class="table table-striped table-bordered table-condensed"><tbody>{body}</tbody></table>',
      row:'<tr><th>{key}</th><td>{value}</td></tr>',
      style: {
        fillColor: '#03F',
        opacity: 0.7,
        fillOpacity: 0.1,
        weight: 2
      },
      i18n: {
        'error': _('An error occurred: %(text)s %(error)s')
      }
    },
    initialize: function () {
      var self = this;

      self.el.empty();
      self.el.append($('<div></div>').attr('id', 'map'));
      self.map = ckan.commonLeafletMap('map', this.options.map_config);

      // hack to make leaflet use a particular location to look for images
      L.Icon.Default.imagePath = this.options.site_url + 'js/vendor/leaflet/dist/images';

      jQuery.get(preload_resource['url']).done(
        function(data){
          self.showPreview(preload_resource['url']);
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

    showPreview: function (url) {
      var self = this;
      var encoding, crs;

      function highLightStyle(e) {
        gjLayer.eachLayer(function(l) {
          gjLayer.resetStyle(l);
        });
        if('setStyle' in e.target) e.target.setStyle({
          fillColor: '#FF0',
          fillOpacity: 0.6
        });
      }

      self.map.spin(true);
      var gjLayer = L.geoJson([], {
        style: self.options.style,
        onEachFeature: function(feature, layer) {
          var body = '';
          jQuery.each(feature.properties, function(key, value) {
            if (value != null && typeof value === 'object') {
              value = JSON.stringify(value);
            }
            body += L.Util.template(self.options.row, {key: key, value: value});
          });
          var popupContent = L.Util.template(self.options.table, {body: body});
          layer.bindPopup(popupContent);
	  layer.on({click: highLightStyle});
        }
      }).addTo(self.map);

      if (preload_resource.encoding)
        encoding = preload_resource.encoding;
      else if (this.options.shp_config.encoding)
        encoding = this.options.shp_config.encoding;
      else
        encoding = 'utf-8';

      if (preload_resource.resource_crs)
        crs = preload_resource.resource_crs;
      else if (this.options.shp_config.srid)
        crs = this.options.shp_config.srid;
      else
        crs = '4326';

      loadshp({
        url: url,
        encoding: encoding,
        EPSG: crs
      }, function(data) {
        gjLayer.addData(data);
        self.map.fitBounds(gjLayer.getBounds());
        self.map.spin(false);
      });
    }
  }
});

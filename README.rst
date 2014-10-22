======================================================
ckanext-geoview - Geospatial Resource Viewer for CKAN
======================================================


This extension contains geospatial viewing plugins, namely

* a ResourceView implementation, compatible with CKAN 2.3+
* a ResourcePreview implementation for older versions of CKAN

Both implementations rely on OpenLayers 2, and provide support for geospatial formats and
protocols such as

* **Mime types**: GeoJSON, KML, GML, ESRI JSON, ShapeFile
* **Web Services**: WMS, WFS, Google Fusion Tables, ESRI ArcRest

Installation
------------

Inside your pyenv, install using pip:

```
pip install -e git+git://github.com/pduchesne/ckanext-geoview.git#egg=ckanext-geoview
```

Then add the ```geoview``` (for CKAN 2.3+) or the ```geopreview``` plugin (for older versions)
into the ```ckan.plugins``` section of your .ini file.

To be able to view Google Fusion Tables resources, a Google API Key must be configured in the .ini file :

```
ckanext.geoview.gapi.key=<API Key here>
```

This key must be granted Fusion Tables permissions. More information on obtaining such a key at https://developers.google.com/fusiontables/docs/v1/using#APIKey .


Usage
-----

The View plugin is available and will register itself automatically on any new resource that has one of the following formats:
 'kml','geojson','gml','wms','wfs','shp', 'esrigeojson', 'gft', 'arcgis_rest'

The Preview plugin recognizes the same formats, and will be chosen if possible, according to the priority order defined in the .ini file.



======================================================
ckanext-geoview - Geospatial viewer for CKAN resources
======================================================


This extension contains view plugins to display geospatial files and services in CKAN.
It was originally developed by `Philippe Duchesne`_.

**Note:** This is a work in progress, if you can help with `OpenLayers`_ or `Leaflet`_ development,
check the `Issues` section for what needs to be done or add a new issue.


.. image:: http://i.imgur.com/wCQm2Uh.jpg

------------
Installation
------------

To install ckanext-geoview on a production site:

1. Activate your CKAN virtual environment, for example::

     source /usr/lib/ckan/default/bin/activate

2. Install the ckanext-geoview Python package into your virtual environment::

     pip install ckanext-geoview

3. Add the relevant plugins to the ``ckan.plugins`` setting in your CKAN
   config file (by default the config file is located at
   ``/etc/ckan/default/production.ini``). Check `Available plugins`_ to see which
   ones are available and if they require further configuration.

4. Add the ``resource_proxy`` plugin to the ``ckan.plugins`` setting.

5. Restart CKAN. For example if you've deployed CKAN with Apache on Ubuntu::

     sudo service apache2 reload

------------------------
Development Installation
------------------------

To install ckanext-geoview for development, activate your CKAN virtualenv and
do::

    git clone https://github.com/ckan/ckanext-geoview.git
    cd ckanext-geoview
    python setup.py develop


-----------------
Available plugins
-----------------

OpenLayers Viewer
-----------------

The OpenLayers_ viewer provides access to different geospatial formats and services:

To enable it, add ``geo_view`` to your ``ckan.plugins`` setting. (use ``geo_preview`` if you are using CKAN < 2.3)::

    ckan.plugins = ... resource_proxy geo_view

On CKAN >= 2.3, if you want the geospatial views to be created by default, add the plugin to the following setting::


    ckan.views.default_views = ... geo_view

The formats and services supported are:

========================= ===================
Type                      Resource format (*)
========================= ===================
Web Map Service (WMS)     ``wms``
Web Feature Service (WFS) ``wfs``
GeoJSON                   ``geojson``
GML                       ``gml``
KML                       ``kml``
ArcGIS REST API           ``arcgis_rest``
Google Fusion Tables      ``gft``
========================= ===================

(*) Resource formats are case insensitive

Support varies across formats, so you might want to deactivate the ones you are not interested in.
To choose which formats to display, set the following configuration option::

    ckanext.geoview.ol_viewer.formats = wms kml

To render Google Fusion Tables resources, a Google API Key must be provided in the ini file::

    ckanext.geoview.gapi_key = <API Key here>

This key must be granted Fusion Tables permissions. More information on obtaining such a key can be found at https://developers.google.com/fusiontables/docs/v1/using#APIKey.

----------------------------------
Common base layers for Map Widgets
----------------------------------

The geospatial view plugins support the same base map configurations than the ckanext-spatial `widgets`_.

Check the following page to learn how to choose a different base map layer (MapQuest Open, MapBox or custom):

http://docs.ckan.org/projects/ckanext-spatial/en/latest/map-widgets.html

.. image:: http://i.imgur.com/cdiIjkU.png


.. _widgets: http://docs.ckan.org/projects/ckanext-spatial/en/latest/spatial-search.html#spatial-search-widget


-----------------------------------
Registering ckanext-geoview on PyPI
-----------------------------------

ckanext-geoview should be availabe on PyPI as
https://pypi.python.org/pypi/ckanext-geoview. If that link doesn't work, then
you can register the project on PyPI for the first time by following these
steps:

1. Create a source distribution of the project::

     python setup.py sdist

2. Register the project::

     python setup.py register

3. Upload the source distribution to PyPI::

     python setup.py sdist upload

4. Tag the first release of the project on GitHub with the version number from
   the ``setup.py`` file. For example if the version number in ``setup.py`` is
   0.0.1 then do::

       git tag 0.0.1
       git push --tags


------------------------------------------
Releasing a new version of ckanext-geoview
------------------------------------------

ckanext-geoview is availabe on PyPI as https://pypi.python.org/pypi/ckanext-geoview.
To publish a new version to PyPI follow these steps:

1. Update the version number in the ``setup.py`` file.
   See `PEP 440 <http://legacy.python.org/dev/peps/pep-0440/#public-version-identifiers>`_
   for how to choose version numbers.

2. Create a source distribution of the new version::

     python setup.py sdist

3. Upload the source distribution to PyPI::

     python setup.py sdist upload

4. Tag the new release of the project on GitHub with the version number from
   the ``setup.py`` file. For example if the version number in ``setup.py`` is
   0.0.2 then do::

       git tag 0.0.2
       git push --tags

.. _Philippe Duchesne: https://github.com/pduchesne
.. _OpenLayers: http://openlayers.org
.. _Leaflet: http://leafletjs.com/

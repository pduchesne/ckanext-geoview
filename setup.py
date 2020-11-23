from setuptools import setup, find_packages

version = '0.0.17'

setup(
    name='ckanext-geoview',
    version=version,
    description='CKAN Geospatial ResourceView',
    long_description=''' ''',
    classifiers=[],
    keywords='',
    author='Philippe Duchesne',
    author_email='pduchesne@gmail.com',
    url='http://github.com/ckan/ckanext-geoview',
    license='MIT',
    packages=find_packages(exclude=['ez_setup', 'examples', 'tests']),
    namespace_packages=['ckanext'],
    include_package_data=True,
    zip_safe=False,
    install_requires=[
        # -*- Extra requirements: -*-
    ],
    entry_points='''
    [ckan.plugins]
    geo_view=ckanext.geoview.plugin:OLGeoView
    geojson_view=ckanext.geoview.plugin:GeoJSONView
    wmts_view=ckanext.geoview.plugin:WMTSView
    shp_view=ckanext.geoview.plugin:SHPView
    ''',
)

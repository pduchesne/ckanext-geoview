from setuptools import setup, find_packages

version = '0.0.6'

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
    namespace_packages=['ckanext', 'ckanext.geoview'],
    include_package_data=True,
    zip_safe=False,
    install_requires=[
        # -*- Extra requirements: -*-
    ],
    entry_points='''
    [ckan.plugins]
    geo_view=ckanext.geoview.plugin:GeoView
    geo_preview=ckanext.geoview.plugin:GeoView
    ''',
)

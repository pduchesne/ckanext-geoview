from setuptools import setup, find_packages

version = '1.0'

setup(
    name='ckanext-geoview',
    version=version,
    description="CKAN Geospatial ResourceView",
    long_description=""" """,
    classifiers=[],
    keywords='',
    author='Philippe Duchesne',
    author_email='pduchesne@gmail.com',
    url='http://github.com/pduchesne/ckanext-geoview',
    license='MIT',
    packages=find_packages(exclude=['ez_setup', 'examples', 'tests']),
    namespace_packages=['ckanext', 'ckanext.geoview'],
    include_package_data=True,
    zip_safe=False,
    install_requires=[
        # -*- Extra requirements: -*-
    ],
    entry_points= \
        """
    [ckan.plugins]
    geoview=ckanext.geoview.plugin:GeoView
    geopreview=ckanext.geoview.plugin:GeoPreview
	""",
)

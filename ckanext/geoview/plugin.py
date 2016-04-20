import mimetypes
import urlparse
import os

from logging import getLogger

from pylons import config
from ckan.common import json

from ckan import plugins as p
import ckan.lib.helpers as h

try:
    from ckan.lib.datapreview import on_same_domain
except ImportError:
    from ckan.lib.datapreview import _on_same_domain as on_same_domain

ignore_empty = p.toolkit.get_validator('ignore_empty')
boolean_validator = p.toolkit.get_validator('boolean_validator')

log = getLogger(__name__)

GEOVIEW_FORMATS = ['kml', 'geojson', 'gml', 'wms', 'wfs', 'esrigeojson',
                   'gft', 'arcgis_rest']


def get_proxified_service_url(data_dict):
    '''
    :param data_dict: contains a resource and package dict
    :type data_dict: dictionary
    '''
    controller = \
        'ckanext.geoview.controllers.service_proxy:ServiceProxyController'
    url = h.url_for(
        action='proxy_service',
        controller=controller,
        id=data_dict['package']['name'],
        resource_id=data_dict['resource']['id'])
    log.debug('Proxified url is {0}'.format(url))
    return url


def get_common_map_config():
    '''
        Returns a dict with all configuration options related to the common
        base map (ie those starting with 'ckanext.spatial.common_map.')
    '''
    namespace = 'ckanext.spatial.common_map.'
    return dict([(k.replace(namespace, ''), v) for k, v in config.iteritems()
                 if k.startswith(namespace)])


def get_openlayers_viewer_config():
    '''
        Returns a dict with all configuration options related to the
        OpenLayers viewer (ie those starting with 'ckanext.geoview.ol_viewer.')
    '''
    namespace = 'ckanext.geoview.ol_viewer.'
    return dict([(k.replace(namespace, ''), v) for k, v in config.iteritems()
                 if k.startswith(namespace)])


class GeoViewBase(p.SingletonPlugin):
    '''This base class is for view extensions. '''
    if p.toolkit.check_ckan_version(min_version='2.3'):
        p.implements(p.IResourceView, inherit=True)
    else:
        p.implements(p.IResourcePreview, inherit=True)
    p.implements(p.IConfigurer, inherit=True)
    p.implements(p.IConfigurable, inherit=True)

    proxy_enabled = False
    same_domain = False

    def update_config(self, config):
        p.toolkit.add_public_directory(config, 'public')
        p.toolkit.add_template_directory(config, 'templates')
        p.toolkit.add_resource('public', 'ckanext-geoview')

        self.proxy_enabled = 'resource_proxy' in config.get('ckan.plugins', '')


class OLGeoView(GeoViewBase):

    p.implements(p.IRoutes, inherit=True)
    p.implements(p.ITemplateHelpers, inherit=True)

    # IRoutes

    def before_map(self, m):
        controller = \
            'ckanext.geoview.controllers.service_proxy:ServiceProxyController'
        m.connect('/dataset/{id}/resource/{resource_id}/service_proxy',
                  controller=controller,
                  action='proxy_service')
        return m

    # ITemplateHelpers

    def get_helpers(self):
        return {
            'get_common_map_config_geoviews': get_common_map_config,
            'get_openlayers_viewer_config': get_openlayers_viewer_config,
        }

    # IResourceView (CKAN >=2.3)

    def info(self):
        return {'name': 'geo_view',
                'title': 'Map viewer (OpenLayers)',
                'icon': 'globe',
                'iframed': True,
                'default_title': p.toolkit._('Map viewer'),
                'schema': {
                    'feature_hoveron': [ignore_empty, boolean_validator],
                    'feature_style': [ignore_empty]
                },
               }

    def can_view(self, data_dict):
        format_lower = data_dict['resource'].get('format', '').lower()
        same_domain = on_same_domain(data_dict)

        # Guess from file extension
        if not format_lower and data_dict['resource'].get('url'):
            format_lower = self._guess_format_from_extension(
                data_dict['resource']['url'])

        if not format_lower:
            return False

        view_formats = config.get('ckanext.geoview.ol_viewer.formats', '')
        if view_formats:
            view_formats = view_formats.split(' ')
        else:
            view_formats = GEOVIEW_FORMATS

        correct_format = format_lower in view_formats
        can_preview_from_domain = self.proxy_enabled or same_domain

        return correct_format and can_preview_from_domain

    def view_template(self, context, data_dict):
        return 'dataviewer/openlayers2.html'

    def form_template(self, context, data_dict):
        return 'dataviewer/openlayers_form.html'

    # IResourcePreview (CKAN < 2.3)

    def can_preview(self, data_dict):

        return self.can_view(data_dict)

    def preview_template(self, context, data_dict):
        return 'dataviewer/openlayers2.html'

    # Common for IResourceView and IResourcePreview

    def _guess_format_from_extension(self, url):
        try:
            parsed_url = urlparse.urlparse(url)
            format_lower = (os.path.splitext(parsed_url.path)[1][1:]
                            .encode('ascii', 'ignore').lower())
        except ValueError, e:
            log.error('Invalid URL: {0}, {1}'.format(url, e))
            format_lower = ''

        return format_lower

    def setup_template_variables(self, context, data_dict):
        import ckanext.resourceproxy.plugin as proxy

        same_domain = on_same_domain(data_dict)

        if not data_dict['resource'].get('format'):
            data_dict['resource']['format'] = \
                self._guess_format_from_extension(data_dict['resource']['url'])

        if self.proxy_enabled and not same_domain:
            proxy_url = proxy.get_proxified_resource_url(data_dict)
            proxy_service_url = get_proxified_service_url(data_dict)
        else:
            proxy_url = data_dict['resource']['url']
            proxy_service_url = data_dict['resource']['url']

        gapi_key = config.get('ckanext.geoview.gapi_key')
        if not p.toolkit.check_ckan_version(min_version='2.3'):
            p.toolkit.c.resource['proxy_url'] = proxy_url
            p.toolkit.c.resource['proxy_service_url'] = proxy_service_url
            p.toolkit.c.resource['gapi_key'] = gapi_key

        return {'resource_view_json': 'resource_view' in data_dict and json.dumps(data_dict['resource_view']),
                'proxy_service_url': proxy_service_url,
                'proxy_url': proxy_url,
                'gapi_key': gapi_key}


class GeoJSONView(GeoViewBase):
    p.implements(p.ITemplateHelpers, inherit=True)

    GeoJSON = ['gjson', 'geojson']

    def update_config(self, config):

        super(GeoJSONView, self).update_config(config)

        mimetypes.add_type('application/json', '.geojson')

    # IResourceView (CKAN >=2.3)
    def info(self):
        return {'name': 'geojson_view',
                'title': 'GeoJSON',
                'icon': 'map-marker',
                'iframed': True,
                'default_title': p.toolkit._('GeoJSON'),
                }

    def can_view(self, data_dict):
        resource = data_dict['resource']

        format_lower = resource.get('format', '').lower()

        if format_lower in self.GeoJSON:
            return self.same_domain or self.proxy_enabled
        return False

    def view_template(self, context, data_dict):
        return 'dataviewer/geojson.html'

    # IResourcePreview (CKAN < 2.3)

    def can_preview(self, data_dict):
        format_lower = data_dict['resource']['format'].lower()

        correct_format = format_lower in self.GeoJSON
        can_preview_from_domain = (self.proxy_enabled or
                                   data_dict['resource'].get('on_same_domain'))
        quality = 2

        if p.toolkit.check_ckan_version('2.1'):
            if correct_format:
                if can_preview_from_domain:
                    return {'can_preview': True, 'quality': quality}
                else:
                    return {'can_preview': False,
                            'fixable': 'Enable resource_proxy',
                            'quality': quality}
            else:
                return {'can_preview': False, 'quality': quality}

        return correct_format and can_preview_from_domain

    def preview_template(self, context, data_dict):
        return 'dataviewer/geojson.html'

    def setup_template_variables(self, context, data_dict):
        import ckanext.resourceproxy.plugin as proxy
        self.same_domain = data_dict['resource'].get('on_same_domain')
        if self.proxy_enabled and not self.same_domain:
            data_dict['resource']['original_url'] = \
                data_dict['resource'].get('url')
            data_dict['resource']['url'] = \
                proxy.get_proxified_resource_url(data_dict)

    # ITemplateHelpers

    def get_helpers(self):
        return {
            'get_common_map_config_geojson': get_common_map_config,
        }


class GeoJSONPreview(GeoJSONView):
    pass


class WMTSView(GeoViewBase):
    p.implements(p.ITemplateHelpers, inherit=True)

    WMTS = ['wmts']

    # IResourceView (CKAN >=2.3)
    def info(self):
        return {'name': 'wmts_view',
                'title': 'wmts',
                'icon': 'map-marker',
                'iframed': True,
                'default_title': p.toolkit._('WMTS'),
                }

    def can_view(self, data_dict):
        resource = data_dict['resource']
        format_lower = resource.get('format', '').lower()

        if format_lower in self.WMTS:
            return self.same_domain or self.proxy_enabled
        return False

    def view_template(self, context, data_dict):
        return 'dataviewer/wmts.html'

    # IResourcePreview (CKAN < 2.3)

    def can_preview(self, data_dict):
        format_lower = data_dict['resource']['format'].lower()

        correct_format = format_lower in self.WMTS
        can_preview_from_domain = (self.proxy_enabled or
                                   data_dict['resource'].get('on_same_domain'))
        quality = 2

        if p.toolkit.check_ckan_version('2.1'):
            if correct_format:
                if can_preview_from_domain:
                    return {'can_preview': True, 'quality': quality}
                else:
                    return {'can_preview': False,
                            'fixable': 'Enable resource_proxy',
                            'quality': quality}
            else:
                return {'can_preview': False, 'quality': quality}

        return correct_format and can_preview_from_domain

    def preview_template(self, context, data_dict):
        return 'dataviewer/wmts.html'

    def setup_template_variables(self, context, data_dict):
        import ckanext.resourceproxy.plugin as proxy
        self.same_domain = data_dict['resource'].get('on_same_domain')
        if self.proxy_enabled and not self.same_domain:
            data_dict['resource']['original_url'] = \
                data_dict['resource'].get('url')
            data_dict['resource']['url'] = \
                proxy.get_proxified_resource_url(data_dict)

    ## ITemplateHelpers

    def get_helpers(self):
        return {
            'get_common_map_config_wmts' : get_common_map_config,
        }


class WMTSPreview(WMTSView):
    pass

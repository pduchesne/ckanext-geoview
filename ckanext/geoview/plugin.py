import urlparse
import os

from logging import getLogger

from pylons import config

from ckan import plugins as p
import ckan.lib.helpers as h
try:
    from ckan.lib.datapreview import on_same_domain
except ImportError:
    from ckan.lib.datapreview import _on_same_domain as on_same_domain


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


class GeoView(p.SingletonPlugin):

    p.implements(p.IConfigurer, inherit=True)
    if p.toolkit.check_ckan_version(min_version='2.3'):
        p.implements(p.IResourceView, inherit=True)
    else:
        p.implements(p.IResourcePreview, inherit=True)

    p.implements(p.IRoutes, inherit=True)
    p.implements(p.ITemplateHelpers, inherit=True)

    # IConfigurer

    def update_config(self, config):

        p.toolkit.add_public_directory(config, 'public')
        p.toolkit.add_template_directory(config, 'templates')
        p.toolkit.add_resource('public', 'ckanext-geoview')

        self.proxy_enabled = 'resource_proxy' in config.get('ckan.plugins', '')

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

    def can_view(self, data_dict):
        format_lower = data_dict['resource'].get('format', '').lower()
        same_domain = on_same_domain(data_dict)

        # Guess from file extension
        if not format_lower and data_dict['resource'].get('url'):
            format_lower = self._guess_format_from_extension(
                data_dict['resource']['url'])

        view_formats = config.get('ckanext.geoview.ol_viewer.formats', '')
        if view_formats:
            view_formats.split(' ')
        else:
            view_formats = GEOVIEW_FORMATS

        correct_format = format_lower in view_formats
        can_preview_from_domain = self.proxy_enabled or same_domain

        return correct_format and can_preview_from_domain

    def view_template(self, context, data_dict):
        return 'dataviewer/openlayers2.html'

    # IResourcePreview (CKAN < 2.3)

    def can_preview(self, data_dict):

        return self.can_view(data_dict)

    def preview_template(self, context, data_dict):
        return 'dataviewer/openlayers2.html'

    # Common for IResourceView and IResourcePreview

    def _guess_format_from_extension(self, url):
        parsed_url = urlparse.urlparse(url)
        format_lower = (os.path.splitext(parsed_url.path)[1][1:]
                        .encode('ascii', 'ignore').lower())

        return format_lower

    def setup_template_variables(self, context, data_dict):
        import ckanext.resourceproxy.plugin as proxy

        same_domain = on_same_domain(data_dict)

        p.toolkit.c.gapi_key = config.get('ckanext.geoview.gapi_key')

        if not data_dict['resource'].get('format'):
            data_dict['resource']['format'] = self._guess_format_from_extension(
                data_dict['resource']['url'])

        if self.proxy_enabled and not same_domain:
            p.toolkit.c.resource['proxy_url'] = proxy.get_proxified_resource_url(data_dict)
            p.toolkit.c.resource['proxy_service_url'] = get_proxified_service_url(data_dict)
        else:
            p.toolkit.c.resource['proxy_url'] = data_dict['resource']['url']

#    def setup_template_variables(self, context, data_dict):
#        import ckanext.resourceproxy.plugin as proxy
#
#        same_domain = datapreview.on_same_domain(data_dict)
#
#        p.toolkit.c.gapi_key = h.config.get('ckanext.geoview.gapi.key')
#
#        if p.toolkit.check_ckan_version('2.3'):
#            proxy_url = proxy.get_proxified_resource_url(data_dict)
#        else:
#            proxy_url = data_dict['resource']['url']
#            if self.proxy_enabled and not same_domain:
#                proxy_url = proxy.get_proxified_resource_url(data_dict)
#
#        return {'proxy_service_url': json.dumps(get_proxified_service_url(data_dict)),
#                'proxy_url': json.dumps(proxy_url)}
